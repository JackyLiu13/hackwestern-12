import argparse
import json
import os
import sys

# --- FIX IMPORT PATHS ---
try:
    # 1. Try Absolute Import (Works for: python -m app.engine3d.run_pipeline)
    from app.engine3d.sam3_wrapper import SAM3Scanner
    from app.engine3d.mesh_builder import MeshBuilder
except ImportError:
    # 2. Fallback to Relative Path (Works for: python run_pipeline.py inside the folder)
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    try:
        from sam3_wrapper import SAM3Scanner
        from mesh_builder import MeshBuilder
    except ImportError as e:
        print(f"❌ Critical Import Error: {e}")
        print("   Make sure you are running this from the 'backend' root directory.")
        sys.exit(1)

# Mock Depth Estimator (Replace with Depth-Anything-V2 later)
def estimate_depth(image_path):
    print("Estimating depth map (Mock)...")
    return None 

def main():
    parser = argparse.ArgumentParser(description="Run the SAM 3 Explosion Pipeline")
    parser.add_argument("--image", type=str, required=True, help="Path to input image")
    parser.add_argument("--output", type=str, default="./output_explosion", help="Folder to save GLBs")
    args = parser.parse_args()

    # 1. Initialize Engines
    try:
        scanner = SAM3Scanner()
        builder = MeshBuilder(output_dir=args.output)
    except Exception as e:
        print(f"❌ Engine Initialization Failed: {e}")
        return

    print(f"🚀 Starting Pipeline for: {args.image}")

    # 2. Run SAM 3 (The Eyes)
    print("   > Scanning object...")
    segments = scanner.scan_image(args.image)
    print(f"   > Found {len(segments)} distinct parts.")

    if not segments:
        print("⚠️ No segments found! Check if your image path is correct and SAM is loaded.")
        return

    # 3. Run Depth (The Structure)
    # depth_map = estimate_depth(args.image)

    # 4. Build 3D Assets (The Hands)
    manifest = {
        "original_image": args.image,
        "parts": []
    }

    print("   > Generating 3D meshes...")
    for i, seg in enumerate(segments):
        print(f"     - Meshing part {i+1}/{len(segments)} ({seg['id']})...")
        
        result = builder.create_part(args.image, seg)
        
        # Calculate the "Explosion Vector"
        # Logic: If it's a small part (screw), explode further out. 
        # If it's big (body), stay close.
        area_ratio = (seg['bbox'][2] * seg['bbox'][3]) / 10000
        z_dist = 50 if area_ratio < 50 else 10

        part_metadata = {
            "id": seg['id'],
            "mesh_url": result['mesh_path'],
            "original_bbox": seg['bbox'],
            "transforms": {
                "origin": {"x": result['position_offset'][0], "y": result['position_offset'][1], "z": 0},
                "explode_to": {"x": 0, "y": 0, "z": z_dist}
            }
        }
        manifest['parts'].append(part_metadata)

    # 5. Save Manifest
    manifest_path = os.path.join(args.output, "explosion_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"✅ Done! Manifest saved to {manifest_path}")
    print("   Load this JSON in your React Three.js Frontend.")

if __name__ == "__main__":
    main()