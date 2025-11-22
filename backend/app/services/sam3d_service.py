"""
SAM 3D Objects inference service for 3D reconstruction from images.

SETUP INSTRUCTIONS:
===================
1. Clone SAM 3D repo:
   git clone https://github.com/facebookresearch/sam-3d-objects.git

2. Download checkpoints from Hugging Face:
   huggingface-cli download facebook/sam-3d-objects --repo-type model --local-dir sam-3d-objects/checkpoints/hf

3. Install CUDA toolkit from: https://developer.nvidia.com/cuda-downloads

4. Install dependencies:
   pip install kaolin==0.17.0 gsplat seaborn gradio omegaconf hydra-core utils3d

5. Set ENABLE_SAM3D = True below

For now, SAM 3D is disabled. Enable it once you have CUDA and dependencies installed.
"""
import os
import sys
import io
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import torch

# Add SAM 3D repo to path
SAM3D_PATH = Path(__file__).parent.parent.parent.parent / "sam-3d-objects"
if SAM3D_PATH.exists():
    sys.path.insert(0, str(SAM3D_PATH / "notebook"))

# Set to True once CUDA and dependencies are installed
ENABLE_SAM3D = False


class SAM3DService:
    """Service for running SAM 3D inference and exporting 3D models."""
    
    def __init__(self, checkpoint_dir: Optional[str] = None):
        self.checkpoint_dir = checkpoint_dir or str(SAM3D_PATH / "checkpoints" / "hf" / "checkpoints")
        self.inference = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"SAM 3D Service initialized. Device: {self.device}")
        print(f"Looking for checkpoints at: {self.checkpoint_dir}")
        self._load_model()
    
    def _load_model(self):
        """Load SAM 3D model from checkpoints."""
        if not ENABLE_SAM3D:
            print("⚠ SAM 3D is disabled")
            print("  See app/services/sam3d_service.py for setup instructions")
            self.inference = None
            return
            
        try:
            config_path = os.path.join(self.checkpoint_dir, "pipeline.yaml")
            
            if not os.path.exists(config_path):
                print(f"⚠ SAM 3D config not found at {config_path}")
                self.inference = None
                return
            
            print(f"Loading SAM 3D from {config_path}...")
            
            # Patch CONDA_PREFIX for non-conda environments
            if "CONDA_PREFIX" not in os.environ:
                os.environ["CONDA_PREFIX"] = sys.prefix
            
            from inference import Inference
            self.inference = Inference(config_path, compile=False)
            print("✓ SAM 3D model loaded successfully")
        except Exception as e:
            print(f"⚠ Failed to load SAM 3D: {e}")
            self.inference = None
    
    def reconstruct_3d(
        self,
        image_bytes: bytes,
        mask_bytes: Optional[bytes] = None,
        seed: int = 42,
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Reconstruct 3D model from image and optional mask.
        
        Args:
            image_bytes: Image file bytes (PNG/JPG)
            mask_bytes: Optional mask file bytes (PNG, binary mask)
            seed: Random seed for reproducibility
        
        Returns:
            Tuple of (ply_bytes, error_message)
            - ply_bytes: Binary PLY data if successful, None otherwise
            - error_message: Error string if failed, None otherwise
        """
        if not self.inference:
            return None, "SAM 3D not enabled. See sam3d_service.py for setup instructions."
        
        try:
            # Load image
            image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            image_array = np.array(image_pil)
            
            # Load or generate mask
            if mask_bytes:
                mask_pil = Image.open(io.BytesIO(mask_bytes)).convert("L")
                mask_array = np.array(mask_pil) > 127
            else:
                mask_array = np.ones(image_array.shape[:2], dtype=bool)
            
            print(f"Running SAM 3D inference (image: {image_array.shape}, seed: {seed})...")
            
            # Run inference
            output = self.inference(image_array, mask_array, seed=seed)
            
            # Export to PLY
            ply_buffer = io.BytesIO()
            output["gs"].save_ply(str(ply_buffer))
            ply_bytes = ply_buffer.getvalue()
            
            print(f"✓ 3D reconstruction complete. PLY size: {len(ply_bytes)} bytes")
            return ply_bytes, None
            
        except Exception as e:
            error_msg = f"SAM 3D inference failed: {str(e)}"
            print(f"✗ {error_msg}")
            return None, error_msg
    
    def is_available(self) -> bool:
        """Check if SAM 3D is available and ready."""
        return self.inference is not None


# Global instance
_sam3d_service: Optional[SAM3DService] = None


def get_sam3d_service() -> SAM3DService:
    """Get or create the SAM 3D service singleton."""
    global _sam3d_service
    if _sam3d_service is None:
        _sam3d_service = SAM3DService()
    return _sam3d_service
