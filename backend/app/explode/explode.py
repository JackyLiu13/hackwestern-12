import os
import io
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

prompt = "Create a picture of a nano banana"

try:
    print("Generating with Gemini 2.5 Flash Image...")
    response = client.models.generate_content(
        model='gemini-2.5-flash-image',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"] # CRITICAL: Forces image output
        )
    )

    for part in response.parts:
        if part.inline_data:
            image = Image.open(io.BytesIO(part.inline_data.data))
            image.save("gemini_flash_output.png")
            print("Success! Saved to gemini_flash_output.png")

except Exception as e:
    print(f"Gemini Error: {e}")