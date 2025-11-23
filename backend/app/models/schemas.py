from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Defines the structure of a single repair step
class RepairStep(BaseModel):
    step: int
    instruction: str
    warning: Optional[str] = None

# Defines the final response sent to React
class RepairResponse(BaseModel):
    source: str          # "iFixit" or "AI_Reasoning"
    device: str          # e.g., "iPhone 13"
    steps: List[RepairStep]
    safety: List[str]    # e.g., ["Risk of electric shock"]
    guides_available: Optional[List[Dict[str, Any]]] = None # Optional list of iFixit guides
    reasoning_log: List[str] = [] # Trace of AI thought process
    model_url: Optional[str] = None  # Optional 3D model URL (GLB/USDZ) from Trellis

# Defines the output for the "Explode" view
class SegmentationResponse(BaseModel):
    masks: List[Any]     # List of polygons/coordinates for Three.js
