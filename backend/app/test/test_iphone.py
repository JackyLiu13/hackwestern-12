import asyncio
import os
import sys

# Add project root to python path
sys.path.append(os.getcwd())

from app.services.reasoning_brain import RepairBrain
from app.services.vision_engine import VisionEngine

async def test_iphone():
    image_path = "app/sample/broken_iphone.jpg"
    
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    print(f"Loading image from {image_path}...")
    with open(image_path, "rb") as f:
        image_data = f.read()

    print("\n--- Testing Vision Engine (Segmentation) ---")
    vision = VisionEngine()
    try:
        masks = await vision.generate_masks(image_data)
        print(f"Successfully generated {len(masks)} masks.")
        # Print first few masks
        for i, mask in enumerate(masks[:3]):
            print(f"  Mask {i+1}: {mask.get('label')} (Conf: {mask.get('confidence'):.2f})")
    except Exception as e:
        print(f"Vision Engine failed: {e}")

    print("\n--- Testing Repair Brain (Analysis with CoT) ---")
    brain = RepairBrain()
    user_prompt = "The back glass is shattered."
    print(f"User Context: '{user_prompt}'")
    
    try:
        result = await brain.process_request(image_data, user_prompt)
        
        print(f"\nFinal Target: {result.get('device')}")
        print(f"Source: {result.get('source')}")
        
        print("\n--- Reasoning Trace ---")
        for log in result.get('reasoning_log', []):
            print(f"  > {log}")
            
        print("\n--- Repair Steps ---")
        steps = result.get('steps', [])
        print(f"Found {len(steps)} steps.")
        for step in steps[:3]: # Show first 3
            print(f"  {step.get('step')}. {step.get('instruction')}")
            if step.get('warning'):
                print(f"     [!] {step.get('warning')}")
        
        if result.get('guides_available'):
            print(f"\n(Found {len(result.get('guides_available'))} verified iFixit guides available)")

    except Exception as e:
        print(f"Repair Brain failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_iphone())