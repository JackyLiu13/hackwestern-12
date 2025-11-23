"""
TripoSR Service for high-quality 3D mesh generation.
"""
import io
import os
import torch
import numpy as np
from PIL import Image
from transformers import AutoModel, AutoProcessor
from app.services.sam2_3d_service import get_sam2_service

class TripoSRService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        try:
            print(f"Initializing TripoSR on {self.device}...")
            # Load TripoSR model
            self.model = AutoModel.from_pretrained("stabilityai/TripoSR", trust_remote_code=True).to(self.device)
            self.processor = AutoProcessor.from_pretrained("stabilityai/TripoSR", trust_remote_code=True)
            print("✓ TripoSR Model Loaded")
        except Exception as e:
            error_msg = f"⚠ Failed to load TripoSR: {e}"
            print(error_msg)
            with open("triposr_error.log", "w") as f:
                f.write(str(e))
                import traceback
                traceback.print_exc(file=f)

    def is_available(self) -> bool:
        return self.model is not None

    def reconstruct_3d(self, image_bytes: bytes) -> tuple[bytes | None, str | None]:
        """
        Generate a 3D mesh (PLY) from an image using TripoSR.
        """
        if not self.model:
            return None, "TripoSR model not loaded"

        try:
            # 1. Load and Preprocess Image
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            # Use SAM 2 to remove background if possible, or just process raw
            # TripoSR works best with object on white/transparent background
            # Let's try to use our SAM 2 service to get a mask if we can
            
            print("Preprocessing image with SAM 2 for background removal...")
            sam2 = get_sam2_service()
            if sam2.is_available():
                # We need a way to get just the mask/segmented image from SAM 2
                # The current SAM 2 service returns a PLY, let's add a helper or just use the logic here
                # For now, let's trust TripoSR's own preprocessing or just use the raw image
                # Actually, TripoSR expects a foreground object.
                # Let's do a quick SAM 2 inference here if we can access the model directly
                if sam2.model:
                    results = sam2.model(image, conf=0.25, verbose=False)
                    if results and results[0].masks:
                        masks = results[0].masks.data.cpu().numpy()
                        best_mask_idx = np.argmax([m.sum() for m in masks])
                        mask = masks[best_mask_idx]
                        
                        # Resize mask to match image
                        mask_pil = Image.fromarray((mask * 255).astype(np.uint8)).resize(image.size, Image.NEAREST)
                        
                        # Apply mask (make background white)
                        bg = Image.new("RGB", image.size, (255, 255, 255))
                        bg.paste(image, mask=mask_pil)
                        image = bg
                        print("✓ Background removed with SAM 2")
            
            # 2. Run TripoSR Inference
            print("Running TripoSR inference...")
            inputs = self.processor(images=image, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # 3. Extract Mesh
            # The model outputs a mesh object (trimesh)
            mesh = self.model.extract_mesh(outputs)[0]
            
            # 4. Export to PLY
            # mesh is a trimesh object
            ply_bytes = trimesh_to_ply(mesh)
            
            print(f"✓ Generated TripoSR Mesh ({len(ply_bytes)} bytes)")
            return ply_bytes, None

        except Exception as e:
            import traceback
            traceback.print_exc()
            return None, str(e)

def trimesh_to_ply(mesh) -> bytes:
    """
    Convert a trimesh object to PLY bytes manually to ensure compatibility.
    """
    # TripoSR returns a custom mesh object, usually with .vertices and .faces
    # Let's check the structure or use built-in export if available
    
    # The output of extract_mesh is usually a trimesh.Trimesh object
    # We can use trimesh.export
    
    try:
        return mesh.export(file_type='ply')
    except:
        # Fallback manual export
        vertices = mesh.vertices
        faces = mesh.faces
        colors = mesh.visual.vertex_colors if hasattr(mesh.visual, 'vertex_colors') else None
        
        header = [
            "ply",
            "format ascii 1.0",
            f"element vertex {len(vertices)}",
            "property float x",
            "property float y",
            "property float z",
        ]
        
        if colors is not None:
            header.extend([
                "property uchar red",
                "property uchar green",
                "property uchar blue",
            ])
            
        header.extend([
            f"element face {len(faces)}",
            "property list uchar int vertex_indices",
            "end_header"
        ])
        
        lines = header
        
        for i, v in enumerate(vertices):
            line = f"{v[0]} {v[1]} {v[2]}"
            if colors is not None:
                c = colors[i]
                line += f" {c[0]} {c[1]} {c[2]}"
            lines.append(line)
            
        for f in faces:
            lines.append(f"3 {f[0]} {f[1]} {f[2]}")
            
        return "\n".join(lines).encode('utf-8')

# Global instance
_triposr_service: TripoSRService | None = None

def get_triposr_service() -> TripoSRService:
    global _triposr_service
    if _triposr_service is None:
        _triposr_service = TripoSRService()
    return _triposr_service
