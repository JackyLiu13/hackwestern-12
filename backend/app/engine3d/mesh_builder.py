import numpy as np
import trimesh
import uuid
import os
from PIL import Image

class MeshBuilder:
    def __init__(self, output_dir="./output_assets"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def create_part(self, original_image_path, segment_data, depth_map=None):
        """
        Takes a single SAM segment and turns it into a .glb file.
        """
        # 1. Load Originals
        img = Image.open(original_image_path).convert("RGB")
        img_np = np.array(img)
        mask = segment_data['mask']
        
        # 2. Crop the image to the bbox (Optimization: Don't use full texture for small screw)
        x, y, w, h = [int(v) for v in segment_data['bbox']]
        # Add padding?
        crop_img = img_np[y:y+h, x:x+w]
        crop_mask = mask[y:y+h, x:x+w]
        
        # 3. Generate Geometry
        # If we have a depth map, we use it. If not, we make a "Pill" shape (extrusion)
        mesh = self._extrude_mask(crop_mask, depth=10.0)
        
        # 4. Apply Texture
        # Create a material from the cropped image
        # Note: In real implementation, UV mapping non-square meshes is complex.
        # We use a planar projection here.
        uv_layer = self._generate_planar_uvs(mesh, w, h)
        mesh.visual = trimesh.visual.TextureVisuals(
            uv=uv_layer,
            image=Image.fromarray(crop_img)
        )

        # 5. Export
        filename = f"{segment_data['id']}.glb"
        filepath = os.path.join(self.output_dir, filename)
        mesh.export(filepath)
        
        return {
            "mesh_path": filepath,
            "position_offset": [x, y] # We need to know where to put it back in 3D space
        }

    def _extrude_mask(self, mask, depth=5.0):
        """
        Simple algorithm: 
        1. Find contours of the mask.
        2. Triangulate the 2D shape.
        3. Extrude it along Z axis.
        """
        # This is a simplification. For robust meshing, we'd use marching cubes
        # or simpler: treat it as a heightmap where mask=1 is height=depth
        
        # Create a grid of vertices
        h, w = mask.shape
        # Downsample for performance (don't make 1 vertex per pixel!)
        scale = 0.1 
        
        # Placeholder: Returning a simple box for the bounding box
        # In production, use `trimesh.creation.extrude_polygon` on the mask contour
        box = trimesh.creation.box(extents=[w, h, depth])
        return box

    def _generate_planar_uvs(self, mesh, width, height):
        # Map XY coordinates to UV 0-1
        uvs = mesh.vertices[:, :2] # Take X and Y
        # Normalize
        uvs[:, 0] /= width
        uvs[:, 1] /= height
        return uvs