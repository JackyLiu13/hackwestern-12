from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import json
import asyncio
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

@router.post("/analyze-stream")
async def analyze_stream(
    file: UploadFile = File(...),
    user_prompt: Optional[str] = Form(None)
):
    """
    Streaming version of analyze endpoint.
    Sends logs in real-time via Server-Sent Events (SSE).
    """
    # Read image bytes BEFORE creating the generator
    # This ensures the file is read while it's still open
    try:
        image_data = await file.read()
    except Exception as e:
        error_event = {"type": "error", "data": f"Failed to read file: {str(e)}"}
        async def error_generator():
            yield f"data: {json.dumps(error_event)}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    async def generate():
        try:
            # Process with streaming logs using already-read image data
            async for event in brain.process_request_streaming(image_data, user_prompt):
                # Send SSE formatted data
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.01)  # Small delay for client processing
                
        except Exception as e:
            print(f"Stream error: {e}")
            import traceback
            traceback.print_exc()
            error_event = {"type": "error", "data": str(e)}
            try:
                yield f"data: {json.dumps(error_event)}\n\n"
            except Exception as send_error:
                print(f"Failed to send error event: {send_error}")
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.post("/segment", response_model=SegmentationResponse)
async def segment_parts(file: UploadFile = File(...)):
    """
    Called by Frontend when user clicks "Explode View".
    Returns SAM 3 masks/polygons for Three.js to render.
    """
    image_data = await file.read()
    masks = await vision.generate_masks(image_data)
    return {"masks": masks}
