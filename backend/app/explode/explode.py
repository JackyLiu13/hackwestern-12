import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# 1. Setup Client
load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

# 2. Prompt
prompt = (
    "Generate an image of a detailed technical exploded view illustration of an iPhone 15 Pro smartphone. "
    "All components are separated and floating apart in an isometric perspective, showing their assembly order. "
    "Clearly visible parts include: the front screen assembly, lithium battery pack, main logic board with chips visible, "
    "taptic engine, rear camera module, screws, and the aluminum back housing. "
    "The style is a clean, technical schematic with guide lines showing how parts connect. "
    "Studio lighting, neutral background."
)

print("Generating with Gemini 2.5 Flash Image...")

# 3. Generation (FIXED CONFIGURATION)
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"], # <--- THIS IS THE FIX
            safety_settings=[ # Optional: Lower safety to ensure technical parts aren't flagged
                 types.SafetySetting(
                     category="HARM_CATEGORY_DANGEROUS_CONTENT",
                     threshold="BLOCK_ONLY_HIGH"
                 ),
            ]
        )
    )

    # 4. Save Loop
    for part in response.candidates[0].content.parts:
        if part.text:
            print(part.text)
        elif part.inline_data:
            image = part.as_image()
            image.save("iphone_exploded_flash.png")
            print("Success! Saved as iphone_exploded_flash.png")
            
except Exception as e:
    print(f"Gemini Error: {e}")