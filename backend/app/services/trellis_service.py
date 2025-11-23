import base64
import io
import os
import tempfile
from typing import Any, Dict, Optional

import fal_client
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

FAL_KEY = os.environ.get("FAL_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
api_key = os.environ.get("GOOGLE_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY)


def _encode_image_bytes_to_data_url(image_bytes: bytes) -> str:
    """
    Takes raw image bytes, converts to 1024x1024 PNG, and encodes as data URL.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = img.convert("RGBA")

        # Resize / letterbox to square 1024x1024
        target_size = 1024
        img.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        paste_x = (target_size - img.width) // 2
        paste_y = (target_size - img.height) // 2
        canvas.paste(img, (paste_x, paste_y))

        buf = io.BytesIO()
        canvas.save(buf, format="PNG")
        png_bytes = buf.getvalue()

    encoded = base64.b64encode(png_bytes).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _find_model_mesh(node: Any) -> Optional[Dict[str, Any]]:
    """
    Recursively search a nested JSON-like structure for a `model_mesh` dict.
    """
    if isinstance(node, dict):
        if "model_mesh" in node and isinstance(node["model_mesh"], dict):
            return node["model_mesh"]
        for value in node.values():
            found = _find_model_mesh(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _find_model_mesh(item)
            if found is not None:
                return found
    return None


def _generate_exploded_view_image_bytes(_: bytes, device_name: Optional[str]) -> Optional[bytes]:
    """
    Uses Gemini to generate an exploded-view illustration (like explode.py).

    Note: For now this uses a prompt-based generation (not conditioned on the
    specific uploaded photo) to stay aligned with your working explode.py script.
    """

    target = device_name or "the device shown in the photo"
    prompt = (
        f"Generate an image of a detailed technical exploded view illustration of {target}. "
        "All components are separated and floating apart in an isometric perspective, showing their assembly order. "
        "Clearly visible parts include: the front screen assembly, lithium battery pack, main logic board with chips visible, "
        "taptic engine, rear camera module, screws, and the aluminum back housing. "
        "The style is a clean, technical schematic with guide lines showing how parts connect. "
        "Studio lighting, neutral background."
    )

    try:
        print("TrellisService: Calling Gemini to generate exploded-view illustration...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],  # ensure we get an image back
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_ONLY_HIGH",
                    ),
                ],
            ),
        )

        # Mirror explode.py logic: grab first inline image, but return PNG bytes
        for part in response.candidates[0].content.parts:
            if part.text:
                print(part.text)
            elif part.inline_data:
                img = part.as_image()  # PIL.Image

                # part.as_image().save expects a filesystem path (as in explode.py),
                # so we save to a temporary file and then read the bytes back.
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    temp_path = tmp.name

                try:
                    img.save(temp_path)
                    with open(temp_path, "rb") as f:
                        png_bytes = f.read()
                    print("TrellisService: Exploded-view image generated.")
                    return png_bytes
                finally:
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass

        print("TrellisService: No inline image found in Gemini response.")
        return None
    except Exception as e:
        print(f"TrellisService Error: Failed to generate exploded view: {e}")
        return None


def generate_trellis_model_url(image_bytes: bytes) -> Optional[str]:
    """
    Calls fal-ai Trellis and returns the hosted 3D asset URL (GLB/USDZ/etc).

    This expects `image_bytes` to already be an exploded-view illustration.
    """
    if not FAL_KEY:
        print("TrellisService: FAL_KEY not configured; skipping 3D generation.")
        return None

    print("TrellisService: Preprocessing image for Trellis...")
    data_url = _encode_image_bytes_to_data_url(image_bytes)

    def on_queue_update(update):
        if isinstance(update, fal_client.InProgress):
            for log in update.logs:
                msg = log.get("message") if isinstance(log, dict) else str(log)
                print(f"TrellisService Log: {msg}")

    try:
        print("TrellisService: Calling fal-ai/trellis via fal_client.subscribe...")
        result = fal_client.subscribe(
            "fal-ai/trellis",
            arguments={
                "image_url": data_url,
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
        print(f"TrellisService Error: fal_client.subscribe failed: {e}")
        return None

    try:
        body: Dict[str, Any] = result or {}
        data = body.get("data", body)

        model_mesh = _find_model_mesh(data)
        if model_mesh and isinstance(model_mesh, dict):
            url = model_mesh.get("url")
            if url:
                print(f"TrellisService: Received model_mesh URL: {url}")
                return url

        print("TrellisService: No model_mesh.url found in response. Keys:", list(data.keys()))
        return None
    except Exception as e:
        print(f"TrellisService Error: failed to parse Trellis response: {e}")
        return None


def generate_exploded_model_url(original_image_bytes: bytes, device_name: Optional[str]) -> Optional[str]:
    """
    Full visual pipeline:
      1. Generate an exploded-view diagram with Gemini (like explode.py).
      2. Send that exploded image to Trellis to get a 3D exploded model URL.

    If exploded-view generation fails, we fall back to using the original image.
    """
    exploded = _generate_exploded_view_image_bytes(original_image_bytes, device_name)
    if not exploded:
        print("TrellisService: Exploded view generation failed; skipping 3D model generation.")
        return None

    return generate_trellis_model_url(exploded)

