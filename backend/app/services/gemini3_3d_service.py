"""
Gemini 3D Vision-based 3D reconstruction service.
Generates 3D point clouds (PLY) using Gemini's multimodal capabilities.
"""
import io
import os
from typing import Optional, List, Tuple
import numpy as np
from PIL import Image
import google.generativeai as genai
from app.core.config import settings

class Gemini3DService:
    """Generate 3D point clouds from image analysis using Gemini."""
    
    def __init__(self):
        self.model = None
        self.device = "cloud"
        
        if settings.GOOGLE_API_KEY:
            try:
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                # Using gemini-1.5-pro for better reasoning on spatial tasks
                self.model = genai.GenerativeModel('gemini-1.5-pro')
                print("Gemini 3D Service: Connected to Gemini 1.5 Pro")
            except Exception as e:
                print(f"Gemini 3D Service Error: Failed to configure: {e}")
        else:
            print("Gemini 3D Service Warning: No GOOGLE_API_KEY found.")
    
    def is_available(self) -> bool:
        """Check if service is ready."""
        return self.model is not None

    def reconstruct_3d(
        self,
        image_bytes: bytes,
        mask_bytes: Optional[bytes] = None,
        seed: int = 42,
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Reconstruct 3D model from image using Gemini Depth Map estimation.
        """
        if not self.model:
            return None, "Gemini API not configured"

        try:
            import json
            
            # 1. Prepare Image
            image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            w, h = image_pil.size
            
            # Resize for prompt context (keep it small for token limit)
            small_size = (32, 32)
            image_small = image_pil.resize(small_size)
            
            print("Requesting 3D depth map from Gemini...")
            
            prompt = """
            I need to generate a 3D mesh of the object in this image.
            To do this, I need you to estimate a "Depth Map" for the object.
            
            Imagine a 32x32 grid over this image.
            For each cell in the grid, estimate the relative depth (distance from camera) of the object at that point.
            - 0 means "background" or "infinite distance".
            - 1 means "furthest part of the object".
            - 255 means "closest part of the object (closest to camera)".
            
            Output a JSON list of 32 lists, where each inner list contains 32 integers (0-255).
            
            Example format:
            [
              [0, 0, 0, ...],
              [0, 50, 60, ...],
              ...
            ]
            
            IMPORTANT:
            - Focus on the MAIN object.
            - Background should be 0.
            - Be consistent with the shape (e.g. if it's a bottle, the center should be closer/higher values).
            - Output ONLY the JSON.
            """
            
            response = self.model.generate_content([prompt, image_small])
            text_content = response.text.strip()
            
            # Clean up markdown
            if text_content.startswith("```"):
                lines = text_content.splitlines()
                if lines[0].startswith("```"): lines = lines[1:]
                if lines[-1].strip() == "```": lines = lines[:-1]
                text_content = "\n".join(lines)
            
            # Parse JSON depth map
            try:
                depth_grid = json.loads(text_content)
                depth_grid = np.array(depth_grid, dtype=np.uint8)
            except Exception as e:
                print(f"Failed to parse depth map JSON: {e}")
                return None, "Gemini failed to generate valid depth map"
                
            if depth_grid.shape != (32, 32):
                # Try to resize if it's wrong
                print(f"Warning: Gemini returned {depth_grid.shape}, resizing to 32x32")
                # This is complex to fix dynamically, so we'll just fail for now or crop
                return None, f"Gemini returned invalid grid shape: {depth_grid.shape}"

            print("✓ Received depth map. Generating high-res point cloud...")
            
            # 2. Upscale Depth Map to target resolution (e.g. 256x256) for better look
            target_size = 256
            
            # Use PIL to resize the depth map smoothly
            depth_pil = Image.fromarray(depth_grid, mode='L')
            depth_pil = depth_pil.resize((target_size, target_size), resample=Image.BICUBIC)
            depth_upscaled = np.array(depth_pil)
            
            # Resize original image to match target size for coloring
            color_pil = image_pil.resize((target_size, target_size), resample=Image.LANCZOS)
            color_array = np.array(color_pil)
            
            # 3. Generate Point Cloud
            points = []
            
            # Grid coordinates centered at 0
            x_range = np.linspace(-1, 1, target_size)
            y_range = np.linspace(1, -1, target_size) # Y is usually inverted in 3D
            
            # Threshold to ignore background (depth < 10)
            threshold = 10
            
            ply_lines = [
                "ply",
                "format ascii 1.0",
                f"element vertex 0", # Placeholder, will update
                "property float x",
                "property float y",
                "property float z",
                "property uchar red",
                "property uchar green",
                "property uchar blue",
                "end_header"
            ]
            
            vertex_count = 0
            data_lines = []
            
            for y_idx in range(target_size):
                for x_idx in range(target_size):
                    depth_val = depth_upscaled[y_idx, x_idx]
                    
                    if depth_val > threshold:
                        # X, Y from grid
                        x = x_range[x_idx]
                        y = y_range[y_idx]
                        
                        # Z from depth (normalized 0-1, then scaled)
                        # We want closer items (high val) to have higher Z? 
                        # Usually in 3D viewers, +Z is towards camera.
                        z = (depth_val / 255.0) * 0.5 
                        
                        # Color
                        r, g, b = color_array[y_idx, x_idx]
                        
                        data_lines.append(f"{x:.4f} {y:.4f} {z:.4f} {r} {g} {b}")
                        vertex_count += 1
            
            # Update vertex count
            ply_lines[2] = f"element vertex {vertex_count}"
            
            ply_content = "\n".join(ply_lines + data_lines)
            ply_bytes = ply_content.encode('utf-8')
            
            print(f"✓ Generated PLY with {vertex_count} points ({len(ply_bytes)} bytes)")
            return ply_bytes, None
            
        except Exception as e:
            error_msg = f"Gemini 3D generation failed: {str(e)}"
            print(f"✗ {error_msg}")
            return None, error_msg

    def generate_step_3d_models(
        self,
        image_bytes: bytes,
        repair_steps: List[str],
    ) -> Tuple[Optional[List[bytes]], Optional[str]]:
        """
        Generate 3D point clouds for each repair step.
        """
        # For now, just reuse the single reconstruction for all steps
        # or implement step-specific logic if needed.
        # This keeps the existing interface working.
        ply, err = self.reconstruct_3d(image_bytes)
        if err:
            return None, err
        return [ply] * len(repair_steps), None
    
    def generate_single_step_3d(
        self,
        image_bytes: bytes,
        step_index: int,
        total_steps: int,
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """Generate 3D model for a single step."""
        return self.reconstruct_3d(image_bytes)


# Global instance
_gemini3d_service: Optional[Gemini3DService] = None


def get_gemini3d_service() -> Gemini3DService:
    """Get or create the Gemini 3D service singleton."""
    global _gemini3d_service
    if _gemini3d_service is None:
        _gemini3d_service = Gemini3DService()
    return _gemini3d_service
