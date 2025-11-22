"""
3D Reconstruction API endpoints using SAM 3D Objects.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import io
from typing import Optional
from app.services.sam3d_service import get_sam3d_service

router = APIRouter()


@router.post("/reconstruct-3d")
async def reconstruct_3d(
    file: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    seed: int = Form(42),
):
    """
    Reconstruct a 3D model from an image using SAM 3D Objects.
    
    Args:
        file: Input image (PNG/JPG)
        mask: Optional binary mask (PNG) for segmentation
        seed: Random seed for reproducibility
    
    Returns:
        Binary PLY file (gaussian splat 3D model)
    """
    try:
        # Get SAM 3D service
        sam3d = get_sam3d_service()
        
        if not sam3d.is_available():
            raise HTTPException(
                status_code=503,
                detail="SAM 3D model not available. Please download checkpoints from https://huggingface.co/facebook/sam-3d-objects"
            )
        
        # Read image
        image_bytes = await file.read()
        
        # Read mask if provided
        mask_bytes = None
        if mask:
            mask_bytes = await mask.read()
        
        # Run reconstruction
        ply_bytes, error = sam3d.reconstruct_3d(image_bytes, mask_bytes, seed)
        
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        # Return PLY file
        return StreamingResponse(
            io.BytesIO(ply_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=model.ply"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconstruct-3d/status")
async def reconstruction_status():
    """Check if SAM 3D is available."""
    sam3d = get_sam3d_service()
    return {
        "available": sam3d.is_available(),
        "device": sam3d.device,
        "message": "SAM 3D ready" if sam3d.is_available() else "SAM 3D not loaded"
    }
