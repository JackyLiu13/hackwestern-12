"""
SAM 2 based 3D reconstruction service.
Uses Ultralytics SAM 2 to segment the object, then generates a 3D mesh via extrusion.
"""
import io
import os
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List
try:
    from ultralytics import SAM
except ImportError:
    SAM = None

class SAM23DService:
    """
    Generates 3D models using SAM 2 for segmentation + Mesh Extrusion.
    """
    
    def __init__(self):
        self.model = None
        if SAM:
            try:
                # Load the local model we saw in the directory
                model_path = "sam2.1_s.pt"
                if not os.path.exists(model_path):
                    # Fallback to looking in parent or current dir
                    if os.path.exists(f"../{model_path}"):
                        model_path = f"../{model_path}"
                
                print(f"SAM 2 3D Service: Loading {model_path}...")
                self.model = SAM(model_path)
                print("✓ SAM 2 Model Loaded")
            except Exception as e:
                print(f"SAM 2 3D Service Error: {e}")
        else:
            print("SAM 2 3D Service Warning: 'ultralytics' not installed.")

    def is_available(self) -> bool:
        return self.model is not None

    def reconstruct_3d(
        self,
        image_bytes: bytes,
        mask_bytes: Optional[bytes] = None,
        seed: int = 42,
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Generate PLY from image using SAM 2 segmentation.
        """
        if not self.model:
            return None, "SAM 2 model not loaded"

        try:
            # 1. Load Image
            image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            w, h = image_pil.size
            
            # 2. Run SAM 2 Inference
            print("Running SAM 2 inference...")
            results = self.model(image_pil, conf=0.25, verbose=False)
            
            if not results or not results[0].masks:
                return None, "No object detected by SAM 2"
            
            # 3. Get the largest mask (main object)
            # results[0].masks.data is a tensor of shape (N, H, W)
            masks = results[0].masks.data.cpu().numpy()
            
            # Find mask with largest area
            best_mask_idx = np.argmax([m.sum() for m in masks])
            mask = masks[best_mask_idx] # Shape (H, W) - might be smaller than original image
            
            # Resize mask to match original image if needed
            if mask.shape != (h, w):
                # Ultralytics sometimes returns masks at smaller resolution
                mask_pil = Image.fromarray((mask * 255).astype(np.uint8))
                mask_pil = mask_pil.resize((w, h), resample=Image.NEAREST)
                mask = np.array(mask_pil) > 127
            
            print(f"✓ Segmented object. Generating 3D mesh...")
            
            # 4. Generate Point Cloud via Extrusion
            # We will create a "thick" version of the 2D cutout
            
            points = []
            colors = []
            
            # Downsample for performance (PLY size)
            scale = 0.5  # 50% scale
            small_w, small_h = int(w * scale), int(h * scale)
            
            img_small = image_pil.resize((small_w, small_h))
            mask_small = Image.fromarray((mask * 255).astype(np.uint8)).resize((small_w, small_h))
            mask_small_arr = np.array(mask_small) > 127
            img_small_arr = np.array(img_small)
            
            # Create grid
            y_idxs, x_idxs = np.where(mask_small_arr)
            
            # Normalize coordinates to -1..1
            x_norm = (x_idxs - small_w/2) / (small_w/2)
            y_norm = (small_h/2 - y_idxs) / (small_h/2) # Invert Y
            
            # Front face (Z = 0.1)
            z_front = np.full_like(x_norm, 0.1)
            
            # Back face (Z = -0.1)
            z_back = np.full_like(x_norm, -0.1)
            
            # Get colors
            r = img_small_arr[y_idxs, x_idxs, 0]
            g = img_small_arr[y_idxs, x_idxs, 1]
            b = img_small_arr[y_idxs, x_idxs, 2]
            
            # Add front points
            for i in range(len(x_norm)):
                points.append(f"{x_norm[i]:.4f} {y_norm[i]:.4f} {z_front[i]:.4f} {r[i]} {g[i]} {b[i]}")
                
            # Add back points (darker to simulate shadow)
            for i in range(len(x_norm)):
                points.append(f"{x_norm[i]:.4f} {y_norm[i]:.4f} {z_back[i]:.4f} {int(r[i]*0.5)} {int(g[i]*0.5)} {int(b[i]*0.5)}")
            
            # Add side points (connecting edges) - Simplified: just add noise layers
            # For a true mesh we'd need edge detection, but for point cloud, 
            # adding a few intermediate layers works visually
            
            num_layers = 5
            for l in range(1, num_layers):
                z_layer = 0.1 - (0.2 * (l / num_layers)) # Interpolate +0.1 to -0.1
                for i in range(len(x_norm)):
                    # Only add edge points to save space? 
                    # For now, add all points but sparsely? 
                    # Let's just add all points for a solid block look
                    if i % 2 == 0: # Skip every other point for internal volume
                        points.append(f"{x_norm[i]:.4f} {y_norm[i]:.4f} {z_layer:.4f} {int(r[i]*0.8)} {int(g[i]*0.8)} {int(b[i]*0.8)}")

            header = [
                "ply",
                "format ascii 1.0",
                f"element vertex {len(points)}",
                "property float x",
                "property float y",
                "property float z",
                "property uchar red",
                "property uchar green",
                "property uchar blue",
                "end_header"
            ]
            
            ply_content = "\n".join(header + points)
            ply_bytes = ply_content.encode('utf-8')
            
            print(f"✓ Generated Extruded PLY ({len(ply_bytes)} bytes)")
            return ply_bytes, None

        except Exception as e:
            return None, str(e)

# Global instance
_sam2_service: Optional[SAM23DService] = None

def get_sam2_service() -> SAM23DService:
    global _sam2_service
    if _sam2_service is None:
        _sam2_service = SAM23DService()
    return _sam2_service
