import requests
import base64
import json
import os
import sys
import io
import subprocess
import platform
import fal_client
from PIL import Image
from dotenv import load_dotenv
load_dotenv()

# Load environment variables from .env file
load_dotenv()

# --- CONFIGURATION ---
FAL_KEY = os.environ.get("FAL_KEY")
OUTPUT_FILENAME = "trellis_model.glb"

def process_and_encode_image(image_path):
    """
    Resizes image to 1024x1024 (standard for Trellis), converts to PNG, 
    and encodes to Base64.
    """
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        sys.exit(1)

    try:
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            
            # Resize/Crop to Square (1024x1024)
            target_size = 1024
            img.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
            
            new_img = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
            paste_x = (target_size - img.width) // 2
            paste_y = (target_size - img.height) // 2
            new_img.paste(img, (paste_x, paste_y))
            
            buffered = io.BytesIO()
            new_img.save(buffered, format="PNG")
            img_bytes = buffered.getvalue()
            
            encoded_string = base64.b64encode(img_bytes).decode('utf-8')
            return f"data:image/png;base64,{encoded_string}"
            
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)


def _find_model_mesh(node):
    """
    Recursively search a nested JSON-like structure for a `model_mesh` dict.
    """
    if isinstance(node, dict):
        if "model_mesh" in node and isinstance(node["model_mesh"], dict):
            return node["model_mesh"]
        for value in node.values():
            found = _find_model_mesh(value)
            if found:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _find_model_mesh(item)
            if found:
                return found
    return None

def open_file_in_default_viewer(filepath):
    """
    Opens the file in the operating system's default application.
    Windows: 3D Viewer
    macOS: Preview
    Linux: Default handler
    """
    filepath = os.path.abspath(filepath)
    print(f"Attempting to open {filepath}...")
    
    try:
        if platform.system() == 'Darwin':       # macOS
            subprocess.call(('open', filepath))
        elif platform.system() == 'Windows':    # Windows
            os.startfile(filepath)
        else:                                   # linux variants
            subprocess.call(('xdg-open', filepath))
    except Exception as e:
        print(f"Could not open viewer automatically: {e}")
        print(f"Please find the file '{filepath}' and open it manually.")

def main():
    image_path = "iphone_exploded_flash.png"  # <--- MAKE SURE THIS FILE EXISTS

    if not FAL_KEY:
        print("ERROR: FAL_KEY / FAL_KEY not found in environment.")
        print("Please add FAL_KEY=your_key to your .env file in the backend folder.")
        return

    # 1. Process Image
    print("Preprocessing image...")
    b64_image = process_and_encode_image(image_path)

    # 2. Call fal-ai Trellis via official fal_client
    print("Calling fal-ai Trellis (fal-ai/trellis) via fal_client...")

    def on_queue_update(update):
        if isinstance(update, fal_client.InProgress):
            for log in update.logs:
                msg = log.get("message") if isinstance(log, dict) else str(log)
                print(msg)

    try:
        result = fal_client.subscribe(
            "fal-ai/trellis",
            arguments={
                # Trellis supports URLs; fal often also accepts data URLs for images.
                "image_url": b64_image,
                "slat_cfg_scale": 3,
                "ss_cfg_scale": 7.5,
                "slat_sampling_steps": 25,
                "ss_sampling_steps": 25,
                "seed": 0,
            },
            with_logs=True,
            on_queue_update=on_queue_update,
        )
    except Exception as e:
        print(f"API error via fal_client: {e}")
        return

    try:
        # fal_client returns a dict-like object
        response_body = result or {}

        # Fal often wraps the actual result under `data`
        result_data = response_body.get("data", response_body)

        print("\n--- FAL TOP-LEVEL KEYS ---")
        print(list(result_data.keys()))

        # 4a. New: handle `model_mesh` schema from Trellis via fal-ai
        # Try to find `model_mesh` anywhere in the structure (sometimes nested).
        model_mesh = _find_model_mesh(result_data)
        if model_mesh and isinstance(model_mesh, dict) and model_mesh.get("url"):
            file_url = model_mesh["url"]
            file_name = model_mesh.get("file_name") or OUTPUT_FILENAME

            print(f"\nDownloading 3D asset from: {file_url}")
            try:
                file_resp = requests.get(file_url)
                if file_resp.status_code != 200:
                    print(f"Failed to download asset: {file_resp.status_code}")
                    print(file_resp.text)
                    return

                # Use the Trellis-provided filename extension but save locally
                local_path = os.path.join(os.getcwd(), file_name)
                with open(local_path, "wb") as f:
                    f.write(file_resp.content)

                print(f"SUCCESS: Saved model asset to {local_path}")
                open_file_in_default_viewer(local_path)
                return
            except Exception as e:
                print(f"Error downloading model_mesh asset: {e}")
                # fall through to legacy parsing below

        # 4b. Legacy: handle direct base64 fields if present
        glb_content = None
        if "mesh" in result_data:
            glb_content = result_data["mesh"]
        elif "model" in result_data:
            glb_content = result_data["model"]
        elif "glb" in result_data:
            glb_content = result_data["glb"]

        if glb_content:
            with open(OUTPUT_FILENAME, "wb") as f:
                f.write(base64.b64decode(glb_content))
            print(f"SUCCESS: Saved model to {os.path.abspath(OUTPUT_FILENAME)}")

            # 5. Open in System Viewer
            open_file_in_default_viewer(OUTPUT_FILENAME)
        else:
            print("Response valid, but could not find 'model_mesh' or base64 'mesh'/'model'/'glb' keys.")
            print("Top-level keys were:", list(result_data.keys()))

    except Exception as e:
        print(f"Error saving/parsing response: {e}")

if __name__ == "__main__":
    main()