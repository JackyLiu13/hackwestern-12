import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys (Reads from .env file automatically)
    GOOGLE_API_KEY: str = ""
    
    # External Services
    IFIXIT_API_URL: str = "https://www.ifixit.com/api/2.0"
    
    # AI Config
    SAM_CHECKPOINT_PATH: str = "./checkpoints/sam2.1_hiera_large.pt"
    
    # Server Config
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RepairLens API"

    class Config:
        env_file = str(Path(__file__).parent.parent.parent / ".env")
        case_sensitive = True

settings = Settings()

# Debug: Print if API key is loaded
if settings.GOOGLE_API_KEY:
    print(f"✓ GOOGLE_API_KEY loaded successfully")
else:
    print(f"⚠ GOOGLE_API_KEY not found. Make sure .env file exists with GOOGLE_API_KEY=your_key")