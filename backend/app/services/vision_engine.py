import io
import os
from typing import List, Dict, Any
from PIL import Image
import numpy as np

try:
    from ultralytics import SAM
except ImportError:
    SAM = None

from app.core.config import settings

class VisionEngine:
    def __init__(self):
        self.model = None
        if SAM:
            try:
                # Use configured path or default to a small SAM 2 model
                # Ultralytics will download 'sam2.1_s.pt' if not found locally and recognized
                # If the configured path is a file that doesn't exist, ultralytics might try to download it if it's a known name
                # otherwise we fallback to 'sam2.1_s.pt'
                model_name = "sam2.1_s.pt"
                
                if settings.SAM_CHECKPOINT_PATH and os.path.exists(settings.SAM_CHECKPOINT_PATH):
                    model_name = settings.SAM_CHECKPOINT_PATH
                
                print(f"Loading Vision Engine with model: {model_name}...")
                self.model = SAM(model_name)
                print("Vision Engine Initialized (Active Mode)")
            except Exception as e:
                print(f"Vision Engine Warning: Failed to load SAM model: {e}")
                print("Vision Engine falling back to Mock Mode")
        else:
            print("Vision Engine Warning: 'ultralytics' not installed. Running in Mock Mode.")

    async def generate_masks(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Runs SAM 3 (via Ultralytics SAM 2) to generate segmentation masks.
        """
        if not self.model:
            return self._mock_response()

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Run inference
            # segment() returns a list of Results objects
            results = self.model(image, conf=0.25) 
            
            masks_response = []
            
            for result in results:
                if result.masks:
                    # result.masks.xy is a list of polygon coordinates (pixels)
                    for i, seg in enumerate(result.masks.xy):
                        # seg is a numpy array of shape (N, 2)
                        polygon = seg.tolist()
                        
                        # Get bounding box
                        box = result.boxes.xyxy[i].tolist() if result.boxes else []
                        
                        # Get confidence
                        conf = float(result.boxes.conf[i]) if result.boxes and result.boxes.conf is not None else 0.95

                        masks_response.append({
                            "label": f"Part_{i+1}",
                            "confidence": conf,
                            "bbox": box,
                            "polygon": polygon
                        })
            
            if not masks_response:
                print("No masks detected by SAM, returning mock data for visualization.")
                return self._mock_response()
                
            return masks_response

        except Exception as e:
            print(f"Error in VisionEngine processing: {e}")
            return self._mock_response()

    def _mock_response(self):
        """
        Returns fake coordinates so the frontend has something to draw if AI fails.
        """
        return [
            {
                "label": "Battery_Mock",
                "confidence": 0.98,
                "bbox": [100, 100, 300, 400], 
                "polygon": [[100, 100], [300, 100], [300, 400], [100, 400]]
            },
            {
                "label": "Screw_Mock",
                "confidence": 0.95,
                "bbox": [50, 50, 70, 70],
                "polygon": [[50, 50], [70, 50], [70, 70], [50, 70]]
            }
        ]
