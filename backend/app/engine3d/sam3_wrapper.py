import torch
import numpy as np
from PIL import Image
import os
import sys
from unittest.mock import MagicMock

# --- 1. MAC/M4 COMPATIBILITY HACK ---
# SAM 3 depends on CUDA libraries (triton, flash_attn) that don't exist on Mac.
# We mock them BEFORE importing sam3 so it doesn't crash.
try:
    import triton
except ImportError:
    sys.modules["triton"] = MagicMock()

try:
    import flash_attn
except ImportError:
    # Mock the package and common submodules
    flash_mock = MagicMock()
    sys.modules["flash_attn"] = flash_mock
    sys.modules["flash_attn.flash_attn_interface"] = flash_mock
    sys.modules["flash_attn.bert_padding"] = flash_mock

# --- 2. OFFICIAL SAM 3 IMPORT ---
try:
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    print("📚 Successfully imported 'sam3'")
except ImportError as e:
    print(f"❌ CRITICAL IMPORT ERROR: {e}")
    print("   Tip: Ensure you are in the virtualenv and ran 'pip install -e sam3'")
    # We allow the class to load in Mock Mode if imports fail, rather than crashing the whole app
    build_sam3_image_model = None
    Sam3Processor = None

class SAM3Scanner:
    def __init__(self, checkpoint_path="./checkpoints/sam3_hiera_large.pt"):
        # Detect M4 Metal Acceleration
        if torch.backends.mps.is_available():
            self.device = "mps"
            self.dtype = torch.float16
            print("🍏 Hardware: Apple Metal (MPS) Acceleration ON")
        else:
            self.device = "cpu"
            self.dtype = torch.float32
            print("⚠️ Hardware: CPU Only (Slow)")

        self.model = None
        self.processor = None
        
        # 3. Load the Brain
        if build_sam3_image_model:
            try:
                print(f"🔄 Initializing SAM 3 Brain...")
                
                # Note: The official docs typically don't require arguments for the builder 
                # if it loads from default hub/cache, but we support local checkpoints if needed.
                try:
                    # Try loading with local checkpoint if file exists
                    if os.path.exists(checkpoint_path):
                        print(f"   -> Loading local weights: {checkpoint_path}")
                        # We manually load state dict because build_sam3_image_model args vary by repo version
                        self.model = build_sam3_image_model()
                        state_dict = torch.load(checkpoint_path, map_location="cpu")
                        if "model" in state_dict: state_dict = state_dict["model"]
                        self.model.load_state_dict(state_dict, strict=False)
                    else:
                        print("   -> Loading default pretrained weights (Internet)")
                        self.model = build_sam3_image_model()
                except Exception as load_err:
                    print(f"   ⚠️ Weight load issue ({load_err}). Trying default init.")
                    self.model = build_sam3_image_model()

                self.model.to(device=self.device)
                if self.dtype == torch.float16:
                    self.model.half()
                
                self.processor = Sam3Processor(self.model)
                print("✅ SAM 3 Processor Ready")
                
            except Exception as e:
                print(f"❌ Model Init Failed: {e}")
                import traceback
                traceback.print_exc()

    def scan_image(self, image_path: str):
        """
        Scans image using SAM 3 text prompting to find 'components'.
        """
        try:
            print(f"📷 Scanning: {image_path}")
            image = Image.open(image_path).convert("RGB")
            
            if self.processor:
                # 1. Ingest Image
                inference_state = self.processor.set_image(image)
                
                # 2. Prompt for "parts" to explode the object
                # Since SAM 3 is open-vocab, we ask for parts generic enough to cover the object
                prompts = ["part", "component", "item", "object", "screw", "fastener"]
                
                all_segments = []
                seen_bboxes = []

                print(f"   -> Prompting SAM 3 with: {prompts}")
                for p in prompts:
                    output = self.processor.set_text_prompt(state=inference_state, prompt=p)
                    
                    if output["masks"] is not None:
                        # Extract Tensors
                        masks = output["masks"] # [N, H, W]
                        boxes = output["boxes"]
                        scores = output["scores"]
                        
                        # Convert to Numpy for processing
                        masks_np = masks.detach().cpu().float().numpy()
                        boxes_np = boxes.detach().cpu().numpy()
                        scores_np = scores.detach().cpu().numpy()

                        for i in range(len(masks_np)):
                            score = float(scores_np[i])
                            if score < 0.3: continue # Filter weak predictions

                            bbox = boxes_np[i]
                            
                            # Simple Deduplication: If bbox is identical to one we have, skip
                            is_duplicate = False
                            for seen in seen_bboxes:
                                iou = self._bbox_iou(bbox, seen)
                                if iou > 0.8: # 80% overlap = duplicate
                                    is_duplicate = True
                                    break
                            
                            if is_duplicate: continue

                            mask_bool = masks_np[i] > 0
                            if mask_bool.ndim > 2: mask_bool = mask_bool.squeeze()
                            
                            all_segments.append({
                                "id": f"{p}_{i}",
                                "mask": mask_bool,
                                "bbox": bbox,
                                "score": score
                            })
                            seen_bboxes.append(bbox)

                print(f"   -> Found {len(all_segments)} unique parts.")
                return all_segments
            else:
                print("⚠️ Using MOCK Data (Processor not loaded)")
                return self._generate_mock_segments(np.array(image))
                
        except Exception as e:
            print(f"❌ Scan Error: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _bbox_iou(self, boxA, boxB):
        # Determine the (x, y)-coordinates of the intersection rectangle
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
        boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
        boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)
        return interArea / float(boxAArea + boxBArea - interArea)

    def _generate_mock_segments(self, image_np):
        h, w, _ = image_np.shape
        segments = []
        labels = ["top_assembly", "battery", "chassis"]
        for i in range(3):
            mask = np.zeros((h, w), dtype=bool)
            start_y = int((h / 3) * i); end_y = int((h / 3) * (i + 1))
            mask[start_y:end_y, int(w*0.1):int(w*0.9)] = True
            segments.append({"id": f"mock_{labels[i]}", "mask": mask, "bbox": [0, 0, 10, 10], "score": 0.99})
        return segments