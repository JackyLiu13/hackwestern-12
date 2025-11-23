import os
import json
import io
import asyncio
from typing import Dict, TypedDict, List, Any, Optional
from PIL import Image
import google.generativeai as genai
from app.services.ifixit_client import iFixitClient
from app.services.trellis_service import generate_exploded_model_url
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

    async def polish_all_steps(self, steps: List[Dict]) -> List[Dict]:
        """
        Polishes all repair steps in ONE batch request.
        """
        if not self.model or not steps:
            return steps
        
        try:
            # If there are too many steps (e.g. > 30), just return originals to avoid context limits
            if len(steps) > 30:
                print(f"Skipping polish: Too many steps ({len(steps)})")
                return steps

            # Build a structured list of steps for the prompt
            steps_text = []
            for i, step in enumerate(steps):
                instruction = step.get('instruction', '')
                # Truncate very long instructions to save tokens
                if len(instruction) > 500: 
                    instruction = instruction[:500] + "..."
                    
                step_entry = f"Step {step.get('step', i+1)}: {instruction}"
                if step.get('warning'):
                    step_entry += f" [WARNING: {step.get('warning')}]"
                steps_text.append(step_entry)
            
            prompt = f"""
            Rewrite these repair instructions to be CONCISE, clear, and user-friendly.
            
            Original steps:
            {chr(10).join(steps_text)}
            
            Output valid JSON array matching this format:
            [
                {{"step": 1, "instruction": "Brief clear instruction", "warning": "Brief warning or null"}},
                {{"step": 2, "instruction": "Brief clear instruction", "warning": null}}
            ]
            
            Return exactly {len(steps)} steps.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            polished_steps = json.loads(response.text)
            
            # Validate we got the right number of steps
            if len(polished_steps) != len(steps):
                print(f"Warning: Expected {len(steps)} steps, got {len(polished_steps)}. Using originals.")
                return steps
            
            return polished_steps
            
        except Exception as e:
            print(f"Failed to polish steps in batch: {e}")
            # On error, return originals
            return steps

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
        
        # Kick off exploded-view 3D model generation in parallel (once we know device name)
        trellis_task = asyncio.create_task(
            asyncio.to_thread(generate_exploded_model_url, state["image_bytes"], state["target_device"])
        )
        
        # 2. Check Verified (Path A)
        state.update(await self.ifixit_check_node(state))
        
        if state.get("is_verified"):
            self._log(state, "Path A Selected: Using Official Guide.")
            # Polish iFixit steps for user-friendliness
            self._log(state, "Polishing steps for clarity and user-friendliness...")
            polished_steps = await self.polish_all_steps(state["repair_steps"])
            self._log(state, f"Successfully polished {len(polished_steps)} steps.")
            
            model_url = await trellis_task
            
            return {
                "source": "iFixit",
                "device": state["target_device"],
                "steps": polished_steps,
                "safety": ["Follow official guide strictly."],
                "guides_available": state.get("guides_available"),
                "reasoning_log": state["reasoning_log"],
                "model_url": model_url,
            }
        else:
            self._log(state, "Path B Selected: Generative AI Mode.")
            # 3. Generate (Path B)
            self._log(state, "Engaging Generative Repair Logic while 3D model renders...")
            gen_result = await self.generative_reasoning_node(state)
            state.update(gen_result)
            
            # Polish AI-generated steps for user-friendliness
            self._log(state, "Polishing steps for clarity and user-friendliness...")
            polished_steps = await self.polish_all_steps(state["repair_steps"])
            self._log(state, f"Successfully polished {len(polished_steps)} steps.")
            
            model_url = await trellis_task
            
            return {
                "source": "AI_Reasoning",
                "device": state["target_device"],
                "steps": polished_steps,
                "safety": state["safety_warnings"],
                "reasoning_log": state["reasoning_log"],
                "model_url": model_url,
            }

    async def process_request_streaming(self, image_data: bytes, user_prompt: Optional[str] = None):
        """
        Streaming version that yields events as processing happens.
        Yields: {"type": "log", "data": "message"} or {"type": "result", "data": {...}}
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
        
        def stream_log(message: str):
            """Helper to log and yield event"""
            print(f"Brain: {message}")
            state['reasoning_log'].append(message)
            return {"type": "log", "data": message}
        
        yield stream_log("Starting Repair Analysis Session.")
        
        # 1. Scene Analysis & Target Lock
        yield stream_log(f"Analyzing scene. User Context: '{user_prompt or 'No context'}'")
        scene_result = await self.analyze_scene_node(state)
        state.update(scene_result)
        
        if state.get("target_device"):
            yield stream_log(f"Target Lock: {state['target_device']}")
        
        # Kick off exploded-view 3D model generation in parallel (once we know device name)
        yield stream_log("Launching exploded 3D model generation in parallel...")
        trellis_task = asyncio.create_task(
            asyncio.to_thread(generate_exploded_model_url, state["image_bytes"], state["target_device"])
        )
        
        # 2. Check Verified (Path A)
        yield stream_log(f"Searching iFixit for '{state['target_device']}'...")
        ifixit_result = await self.ifixit_check_node(state)
        state.update(ifixit_result)
        
        if state.get("is_verified"):
            yield stream_log("Path A Selected: Using Official Guide.")
            yield stream_log(f"Found {len(state.get('guides_available', []))} verified guides.")
            yield stream_log("Polishing steps for clarity...")
            
            polished_steps = await self.polish_all_steps(state["repair_steps"])
            yield stream_log(f"Successfully polished {len(polished_steps)} steps.")
            
            model_url = await trellis_task
            
            result = {
                "source": "iFixit",
                "device": state["target_device"],
                "steps": polished_steps,
                "safety": ["Follow official guide strictly."],
                "guides_available": state.get("guides_available"),
                "reasoning_log": state["reasoning_log"],
                "model_url": model_url,
            }
            yield {"type": "result", "data": result}
        else:
            yield stream_log("Path B Selected: Generative AI Mode.")
            yield stream_log("Engaging AI reasoning...")
            
            # 3. Generate (Path B)
            yield stream_log("Generating repair steps while 3D exploded model renders...")
            gen_result = await self.generative_reasoning_node(state)
            state.update(gen_result)
            yield stream_log(f"Generated {len(state['repair_steps'])} repair steps.")
            
            # Polish AI-generated steps
            yield stream_log("Polishing steps for clarity...")
            polished_steps = await self.polish_all_steps(state["repair_steps"])
            yield stream_log(f"Successfully polished {len(polished_steps)} steps.")
            
            model_url = await trellis_task
            
            result = {
                "source": "AI_Reasoning",
                "device": state["target_device"],
                "steps": polished_steps,
                "safety": state["safety_warnings"],
                "reasoning_log": state["reasoning_log"],
                "model_url": model_url,
            }
            yield {"type": "result", "data": result}
