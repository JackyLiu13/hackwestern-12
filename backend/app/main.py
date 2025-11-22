from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import repair

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

@app.get("/")
async def root():
    return {"message": "RepairLens Brain is Online", "status": "active"}

# To run: uvicorn app.main:app --reload