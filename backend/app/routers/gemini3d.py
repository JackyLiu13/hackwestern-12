"""
Gemini 3D reconstruction API endpoints.
NOW USING TripoSR for 3D generation (renamed but keeping endpoint for frontend compatibility).
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import io
from typing import Optional, List
from app.services.sam2_3d_service import get_sam2_service

router = APIRouter()


@router.post("/generate-step-3d")
async def generate_step_3d(
    file: UploadFile = File(...),
    step_index: int = Form(0),
    total_steps: int = Form(1),
):
    """
    Generate a 3D model for a specific repair step.
    Now uses TripoSR for true 3D mesh generation.
    """
    try:
        print(f"Generating 3D for step {step_index}/{total_steps} using TripoSR")
        image_bytes = await file.read()
        
        service = get_sam2_service()
        if not service.is_available():
             raise HTTPException(status_code=503, detail="SAM 2 service not available")

        # Use SAM 2 to reconstruct
        ply_bytes, error = service.reconstruct_3d(image_bytes)
        
        if error:
            print(f"Error: {error}")
            raise HTTPException(status_code=500, detail=error)
        
        print(f"Generated PLY: {len(ply_bytes)} bytes")
        return StreamingResponse(
            io.BytesIO(ply_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=step_{step_index}.ply"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-all-steps-3d")
async def generate_all_steps_3d(
    file: UploadFile = File(...),
    steps: str = Form(...),  # JSON array of step descriptions
):
    """
    Generate 3D models for all repair steps.
    """
    try:
        import json
        import zipfile
        
        image_bytes = await file.read()
        step_list = json.loads(steps)
        
        service = get_sam2_service()
        
        # Generate one model and reuse it for now
        ply_bytes, error = service.reconstruct_3d(image_bytes)
        
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        # Create ZIP file with all PLYs
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zf:
            for i in range(len(step_list)):
                zf.writestr(f"step_{i}.ply", ply_bytes)
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=repair_steps_3d.zip"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
