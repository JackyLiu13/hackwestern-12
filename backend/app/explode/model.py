import google.generativeai as genai
import os

# 1. Setup Client
load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")
# OR uncomment the line below and paste your key if the env var isn't working
# api_key = "YOUR_ACTUAL_API_KEY_HERE"

if not api_key:
    print("Error: API Key is missing.")
    exit()

genai.configure(api_key=api_key)

print("------------------------------------------------")
print("CHECKING AVAILABLE MODELS FOR YOUR KEY...")
print("------------------------------------------------")

try:
    # Loop through all models available to your account
    for m in genai.list_models():
        # Print the model name
        print(f"Model: {m.name}")
        print(f"   - Methods: {m.supported_generation_methods}")
        
        # Check specifically for image generation capability
        if 'generateImages' in m.supported_generation_methods:
            print("   *** THIS MODEL CAN GENERATE IMAGES ***")
        
        print("") # Newline for readability

except Exception as e:
    print(f"Error listing models: {e}")
    print("\nTIP: If you see an error here, try running: pip install -U google-generativeai")