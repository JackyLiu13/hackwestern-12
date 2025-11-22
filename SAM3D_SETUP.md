# SAM 3D Objects Setup Guide

## Quick Start

SAM 3D is **currently disabled** in RepairLens. To enable it:

### Prerequisites
- **NVIDIA GPU** (RTX 3060+, A100, etc.)
- **CUDA Toolkit** installed: https://developer.nvidia.com/cuda-downloads
- **cuDNN** (optional but recommended)

### Step 1: Clone SAM 3D Repository

```bash
cd c:\Users\16476\hw12\hackwestern-12
git clone https://github.com/facebookresearch/sam-3d-objects.git
```

### Step 2: Download Checkpoints

```bash
pip install huggingface-hub
huggingface-cli login  # Enter your Hugging Face token
huggingface-cli download facebook/sam-3d-objects --repo-type model --local-dir sam-3d-objects/checkpoints/hf
```

### Step 3: Install Dependencies

```bash
pip install kaolin==0.17.0 gsplat seaborn gradio omegaconf hydra-core utils3d
```

**Note:** `kaolin` and `gsplat` require CUDA. If installation fails, ensure CUDA toolkit is installed.

### Step 4: Enable SAM 3D

Edit `backend/app/services/sam3d_service.py` and change:

```python
ENABLE_SAM3D = False  # Change to True
```

### Step 5: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

You should see:
```
✓ SAM 3D model loaded successfully
```

## Usage

1. Upload an image in RepairLens
2. Get repair guide
3. Click the **3D box icon** in the header
4. Wait for 3D model to generate
5. Interact with the 3D model (drag to rotate, scroll to zoom)

## Troubleshooting

### "CUDA_HOME environment variable is not set"
- Install CUDA Toolkit from: https://developer.nvidia.com/cuda-downloads
- Restart your terminal after installation

### "No module named 'kaolin'"
- Requires CUDA to be installed first
- Run: `pip install kaolin==0.17.0`

### "No module named 'gsplat'"
- Requires CUDA and build tools
- Run: `pip install git+https://github.com/nerfstudio-project/gsplat.git`

### "Out of memory"
- Reduce image size before upload
- Use a GPU with more VRAM
- Or run on remote GPU machine (see below)

## Remote GPU Setup

If you have a remote GPU machine, you can run SAM 3D there:

1. **On remote machine:**
   ```bash
   git clone https://github.com/facebookresearch/sam-3d-objects.git
   cd sam-3d-objects
   pip install -r requirements.inference.txt
   huggingface-cli download facebook/sam-3d-objects --repo-type model --local-dir checkpoints/hf
   ```

2. **Create a simple inference server** (Flask/FastAPI)

3. **Update backend** to call remote service instead of local

## Performance

- **GPU (RTX 3080+):** 30-60 seconds per image
- **GPU (RTX 3060):** 1-2 minutes per image
- **CPU:** 5-10 minutes per image

## Architecture

```
User uploads image
    ↓
Backend receives image
    ↓
SAM 3D inference (generates 3D model)
    ↓
Export to PLY (gaussian splat format)
    ↓
Frontend loads PLY in Three.js viewer
    ↓
User interacts with 3D model
```
