import os
import json
import io
from typing import Dict, TypedDict, List, Any, Optional
from PIL import Image
import google.generativeai as genai
from app.services.ifixit_client import iFixitClient
from app.core.config import settings

class RepairState(TypedDict):
    image_bytes: bytes
    user_prompt: Optional[str]
    reasoning_log: List[str]
    detected_objects: List[str]
    target_device: str
    is_verified: bool
    repair_steps: list
    safety_warnings: list
    guides_available: list

class RepairBrain:
    def __init__(self):
        self.ifixit = iFixitClient()
        self.model = None
        
        if settings.GOOGLE_API_KEY:
            try:
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                # Using gemini-2.5-flash as requested and available
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                print("Reasoning Brain: Gemini 2.5 Flash Connected")
            except Exception as e:
                print(f"Reasoning Brain Error: Failed to configure Gemini: {e}")
        else:
            print("Reasoning Brain Warning: No GOOGLE_API_KEY found.")

    def _log(self, state: RepairState, message: str):
        """Helper to add thoughts to the trace."""
        print(f"Brain: {message}")
        state['reasoning_log'].append(message)

    async def analyze_scene_node(self, state: RepairState):
        """
        Step 1: Scene Analysis & Target Lock.
        Identifies objects and selects the one matching the user's prompt.
        """
        if not self.model:
             self._log(state, "AI offline. Defaulting to Unknown Device.")
             return {"target_device": "Unknown Device (AI Offline)", "detected_objects": []}

        try:
            image_bytes = state['image_bytes']
            image = Image.open(io.BytesIO(image_bytes))
            user_context = state.get('user_prompt') or "No specific context provided."
            
            self._log(state, f"Analyzing scene. User Context: '{user_context}'")

            prompt = f"""
            Analyze this image. 
            1. List all distinct repairable objects you see.
            2. Based on the user's note: "{user_context}", identify which single object is the intended target for repair.
            3. If the user note is empty, pick the most prominent central object.
            
            Output valid JSON:
            {{
                "detected_objects": ["toaster", "table", "screwdriver"],
                "target_object": "Sunbeam Toaster",
                "reasoning": "User mentioned 'heating issue', which applies to the toaster, not the table."
            }}
            """
            
            response = self.model.generate_content(
                [prompt, image],
                generation_config={"response_mime_type": "application/json"}
            )
            
            data = json.loads(response.text)
            
            target = data.get("target_object", "Unknown Object")
            reasoning = data.get("reasoning", "Selected most prominent object.")
            objects = data.get("detected_objects", [])
            
            self._log(state, f"Scene Analysis: Saw {objects}.")
            self._log(state, f"Target Lock: Selected '{target}'. Reason: {reasoning}")
            
            return {"target_device": target, "detected_objects": objects}

        except Exception as e:
            self._log(state, f"Scene Analysis Failed: {e}")
            return {"target_device": "Unknown Device", "detected_objects": []}

    async def ifixit_check_node(self, state: RepairState):
        """
        Step 2: Check if verified guide exists (Path A)
        """
        target = state['target_device']
        
        if "Unknown" in target:
            return {"is_verified": False}

        self._log(state, f"Searching iFixit for '{target}'...")

        try:
            device = await self.ifixit.search_device(target)
            
            if device:
                self._log(state, f"iFixit match found: {device.get('display_title')}")
                # We found a device, now list guides
                # iFixit API uses the 'title' (e.g., "iPhone 13") for category lookups
                guides = await self.ifixit.get_guides(device.get('title') or device.get('display_title'))
                
                if guides:
                    self._log(state, f"Found {len(guides)} verified guides.")
                    # Fetch details for the first guide to populate 'steps'
                    first_guide = guides[0]
                    guide_id = first_guide.get('guideid')
                    
                    verified_steps = []
                    if guide_id:
                        details = await self.ifixit.get_guide_details(guide_id)
                        
                        # Parse iFixit steps into our format
                        raw_steps = details.get('steps', [])
                        for idx, s in enumerate(raw_steps):
                            lines = s.get('lines', [])
                            instruction_text = " ".join([l.get('text_raw', '') for l in lines])
                            
                            verified_steps.append({
                                "step": idx + 1,
                                "instruction": instruction_text or s.get('title', 'Step'),
                                "warning": None 
                            })

                    return {
                        "is_verified": True, 
                        "repair_steps": verified_steps, 
                        "guides_available": guides
                    }
            
            self._log(state, "No exact verified guide found on iFixit.")
            return {"is_verified": False}
        except Exception as e:
            self._log(state, f"iFixit Check Failed: {e}")
            return {"is_verified": False}

    async def generative_reasoning_node(self, state: RepairState):
        """
        Step 3 (Path B): If no guide, AI thinks about how to open it.
        """
        if not self.model:
            return self._mock_generative_steps()

        target = state['target_device']
        self._log(state, f"Engaging Generative Repair Logic for '{target}'...")

        try:
            image_bytes = state['image_bytes']
            image = Image.open(io.BytesIO(image_bytes))
            user_context = state.get('user_prompt', '')
            
            prompt = f"""
            Create a repair guide for the '{target}'.
            Context from user: "{user_context}".
            
            Based on the visual evidence (screws, seams, clips), provide a step-by-step disassembly/repair guide.
            Focus on the specific issue if mentioned in the context.
            
            Output valid JSON format:
            {{
                "steps": [
                    {{"step": 1, "instruction": "Remove the 4 visible screws...", "warning": "Be careful of..."}}
                ],
                "safety_warnings": ["Unplug device...", "Wear safety glasses..."]
            }}
            """
            
            response = self.model.generate_content(
                [prompt, image], 
                generation_config={"response_mime_type": "application/json"}
            )
            
            data = json.loads(response.text)
            steps = data.get("steps", [])
            safety = data.get("safety_warnings", [])
            
            self._log(state, f"Generated {len(steps)} repair steps via Visual Analysis.")
            
            return {
                "repair_steps": steps,
                "safety_warnings": safety
            }
        except Exception as e:
            self._log(state, f"Gemini Reasoning Failed: {e}")
            return self._mock_generative_steps()

    def _mock_generative_steps(self):
        generated_steps = [
            {"step": 1, "instruction": "Remove the 4 visible Phillips screws on the back panel.", "warning": None},
            {"step": 2, "instruction": "Gently pry the seam using a plastic pick.", "warning": "Clips may break if forced."}
        ]
        safety = ["Unplug device before opening", "Capacitor discharge risk"]
        return {"repair_steps": generated_steps, "safety_warnings": safety}

    async def process_request(self, image_data: bytes, user_prompt: Optional[str] = None):
        """
        Orchestrates the flow with CoT.
        """
        state: RepairState = {
            "image_bytes": image_data,
            "user_prompt": user_prompt,
            "reasoning_log": [],
            "detected_objects": [],
            "target_device": "",
            "is_verified": False,
            "repair_steps": [],
            "safety_warnings": [],
            "guides_available": []
        }
        
        self._log(state, "Starting Repair Analysis Session.")
        
        # 1. Scene Analysis & Target Lock
        state.update(await self.analyze_scene_node(state))
        
        # 2. Check Verified (Path A)
        state.update(await self.ifixit_check_node(state))
        
        if state.get("is_verified"):
            self._log(state, "Path A Selected: Using Official Guide.")
            return {
                "source": "iFixit",
                "device": state["target_device"],
                "steps": state["repair_steps"],
                "safety": ["Follow official guide strictly."],
                "guides_available": state.get("guides_available"),
                "reasoning_log": state["reasoning_log"]
            }
        else:
            self._log(state, "Path B Selected: Generative AI Mode.")
            # 3. Generate (Path B)
            state.update(await self.generative_reasoning_node(state))
            return {
                "source": "AI_Reasoning",
                "device": state["target_device"],
                "steps": state["repair_steps"],
                "safety": state["safety_warnings"],
                "reasoning_log": state["reasoning_log"]
            }
