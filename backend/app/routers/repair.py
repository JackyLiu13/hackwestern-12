from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.reasoning_brain import RepairBrain
from app.services.vision_engine import VisionEngine
from app.models.schemas import RepairResponse, SegmentationResponse

router = APIRouter()
brain = RepairBrain()
vision = VisionEngine()

@router.post("/analyze", response_model=RepairResponse)
async def analyze_object(
    file: UploadFile = File(...),
    user_prompt: Optional[str] = Form(None)
):
    """
    The Main Entry Point:
    1. Uploads image.
    2. Analyzes scene & user intent (CoT).
    3. Checks iFixit (Path A) or uses Gemini (Path B).
    4. Returns steps + safety warnings + reasoning log.
    """
    try:
        # Read image bytes
        image_data = await file.read()
        
        # 1. Run the "Brain" to get the repair plan (Path A or B)
        repair_plan = await brain.process_request(image_data, user_prompt)
        
        return repair_plan
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/segment", response_model=SegmentationResponse)
async def segment_parts(file: UploadFile = File(...)):
    """
    Called by Frontend when user clicks "Explode View".
    Returns SAM 3 masks/polygons for Three.js to render.
    """
    image_data = await file.read()
    masks = await vision.generate_masks(image_data)
    return {"masks": masks}
