import asyncio
import os
from pathlib import Path

# Resolve project paths properly
CURRENT_DIR = Path(__file__).resolve().parent          # app/test/
SAMPLE_PATH = CURRENT_DIR.parent / "sample" / "table.JPG"  # app/sample/table.JPG

# Import after fixing sys.path
from app.services.reasoning_brain import RepairBrain

async def test_cot():
    image_path = SAMPLE_PATH

    if not image_path.exists():
        print(f"Error: Image not found at {image_path}")
        return

    print(f"Loading image from {image_path}...")
    image_data = image_path.read_bytes()

    brain = RepairBrain()

    print("\n--- Scenario 1: User asks about the Table ---")
    user_prompt_1 = "The leg is wobbly."
    print(f"User Prompt: '{user_prompt_1}'")

    result_1 = await brain.process_request(image_data, user_prompt_1)

    print(f"Target Selected: {result_1.get('device')}")
    print("Reasoning Trace:")
    for log in result_1.get("reasoning_log", []):
        print(f"  > {log}")

    print("\n--- Scenario 2: User asks about the Lamp ---")
    user_prompt_2 = "The bulb is flickering."
    print(f"User Prompt: '{user_prompt_2}'")

    result_2 = await brain.process_request(image_data, user_prompt_2)

    print(f"Target Selected: {result_2.get('device')}")
    print("Reasoning Trace:")
    for log in result_2.get("reasoning_log", []):
        print(f"  > {log}")

if __name__ == "__main__":
    asyncio.run(test_cot())
