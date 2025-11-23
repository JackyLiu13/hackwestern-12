import os
from dotenv import load_dotenv
from google import genai

# 1. Load environment variables
load_dotenv()

# 2. Initialize the client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

print("Testing gemini-2.5-flash...")

try:
    # 3. Generate text
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents="Write a one-sentence haiku about a coding hackathon."
    )
    
    # 4. Success output
    print("\nSUCCESS! Response:")
    print(response.text)

except Exception as e:
    print(f"\nERROR: {e}")