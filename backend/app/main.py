from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import repair, reconstruction
from app.services.sam3d_service import get_sam3d_service

app = FastAPI(title="RepairLens API", version="1.0")

# Configure CORS (Allow your React frontend to talk to this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React App
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(repair.router, prefix="/api/v1", tags=["repair"])
app.include_router(reconstruction.router, prefix="/api/v1", tags=["3d"])

@app.on_event("startup")
async def startup_event():
    """Initialize SAM 3D on startup"""
    print("\n=== Initializing SAM 3D Service ===")
    sam3d = get_sam3d_service()
    if sam3d.is_available():
        print("✓ SAM 3D is ready for 3D reconstruction")
    else:
        print("⚠ SAM 3D not available - 3D reconstruction disabled")
    print("=" * 40 + "\n")

@app.get("/")
async def root():
    return {"message": "RepairLens Brain is Online", "status": "active"}

# To run: uvicorn app.main:app --reload