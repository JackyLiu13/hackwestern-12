# How to Run the RepairLens Backend

This guide explains how to set up and run the FastAPI backend server for RepairLens.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Setup Instructions

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create a Virtual Environment (Recommended)

```bash
python3 -m venv venv
```

### 3. Activate the Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following content:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> Replace `your_gemini_api_key_here` with your actual Gemini API key.

## Running the Server

### Development Mode (with auto-reload)

From the `backend` directory, run:

```bash
uvicorn app.main:app --reload
```

The server will start at: **http://localhost:8000**

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, you can access:

- **Interactive API docs (Swagger UI)**: http://localhost:8000/docs
- **Alternative API docs (ReDoc)**: http://localhost:8000/redoc
- **Root endpoint**: http://localhost:8000/

## Testing the API

### Quick Health Check

Open your browser or use curl:

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "RepairLens Brain is Online",
  "status": "active"
}
```

## Common Issues

### Port Already in Use

If port 8000 is already in use, specify a different port:

```bash
uvicorn app.main:app --reload --port 8001
```

### Module Not Found Errors

Make sure you're in the `backend` directory and your virtual environment is activated.

### CORS Issues

The backend is configured to accept requests from `http://localhost:3000`. If your frontend runs on a different port, update the CORS configuration in `app/main.py`.

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

## Deactivating Virtual Environment

When you're done, deactivate the virtual environment:

```bash
deactivate
```
