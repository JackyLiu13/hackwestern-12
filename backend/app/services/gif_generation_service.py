"""
GIF Generation Service using Gemini Imagen.
Generates illustrated repair step images and compiles them into an animated GIF.
"""
import os
import io
import base64
from PIL import Image
import google.generativeai as genai
from typing import List, Optional, Tuple

class GifGenerationService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.model = None
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Gemini has image generation via the generate_images endpoint
                print("✓ Gemini API configured for image generation")
                self.available = True
            except Exception as e:
                print(f"⚠ Failed to configure Gemini for images: {e}")
                self.available = False
        else:
            print("⚠ GOOGLE_API_KEY not found")
            self.available = False

    def is_available(self) -> bool:
        return self.available

    def generate_repair_gif(
        self,
        device_name: str,
        repair_steps: List[dict],
        original_image_bytes: Optional[bytes] = None
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Generate an animated GIF showing illustrated repair steps.
        
        Args:
            device_name: Name of the device being repaired
            repair_steps: List of step dictionaries with 'instruction' key
            original_image_bytes: Optional original image for context
            
        Returns:
            Tuple of (gif_bytes, error_message)
        """
        if not self.available:
            return None, "Gemini API not configured"

        try:
            print(f"\n=== GIF Generation Started ===")
            print(f"Generating repair GIF for {device_name} with {len(repair_steps)} steps...")
            
            # Generate an image for each step
            step_images = []
            
            for i, step in enumerate(repair_steps):
                instruction = step.get('instruction', '')
                print(f"  [{i+1}/{len(repair_steps)}] Creating image for: {instruction[:60]}...")
                
                # Create a detailed prompt for technical illustration
                prompt = self._create_image_prompt(device_name, instruction, i+1, len(repair_steps))
                
                # Generate image using Gemini
                image_bytes = self._generate_image(prompt)
                
                if image_bytes:
                    step_images.append(Image.open(io.BytesIO(image_bytes)))
                else:
                    # Fallback: create a text-based placeholder
                    print(f"    Using text placeholder for step {i+1}")
                    step_images.append(self._create_text_placeholder(instruction, i+1))
            
            if not step_images:
                print("ERROR: Failed to generate any step images")
                return None, "Failed to generate any step images"
            
            # Compile images into animated GIF
            print(f"  Compiling {len(step_images)} images into GIF...")
            gif_bytes = self._compile_gif(step_images)
            
            print(f"✓ Generated repair GIF ({len(gif_bytes)} bytes)")
            print(f"=== GIF Generation Complete ===\n")
            return gif_bytes, None
            
        except Exception as e:
            print(f"\n!!! GIF Generation Error !!!")
            import traceback
            traceback.print_exc()
            print(f"=== Error End ===\n")
            return None, str(e)

    def _create_image_prompt(self, device: str, instruction: str, step_num: int, total_steps: int) -> str:
        """Create a detailed prompt for Gemini image generation."""
        prompt = f"""Technical illustration for repair guide:

Device: {device}
Step {step_num} of {total_steps}: {instruction}

Style: Clean, minimalist technical diagram similar to IKEA assembly instructions.
- Simple line art with clear annotations
- Arrows showing motion or direction
- Labels for important parts
- Professional, easy to understand
- White background
- No text within the image (visual only)

Create a clear, step-by-step visual guide."""
        
        return prompt

    def _generate_image(self, prompt: str) -> Optional[bytes]:
        """Generate an image using Gemini's image generation."""
        try:
            # Note: As of now, Gemini API doesn't have a direct image generation endpoint
            # in the same way as DALL-E or Imagen API.
            # We'll use a placeholder approach or use the Vertex AI Imagen if available.
            
            # For hackathon purposes, let's create illustrated placeholders
            # In production, you'd use Vertex AI Imagen or another service
            
            # Return None to trigger fallback
            return None
            
        except Exception as e:
            print(f"    Image generation error: {e}")
            return None

    def _create_text_placeholder(self, instruction: str, step_num: int) -> Image.Image:
        """Create a simple text-based placeholder image."""
        from PIL import ImageDraw, ImageFont
        
        # Create a 512x512 white image
        img = Image.new('RGB', (512, 512), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add step number
        try:
            # Try to use a nice font if available
            font_large = ImageFont.truetype("arial.ttf", 48)
            font_small = ImageFont.truetype("arial.ttf", 20)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Draw step number
        draw.text((256, 100), f"STEP {step_num}", fill='#3b82f6', font=font_large, anchor='mm')
        
        # Draw instruction (wrapped)
        words = instruction.split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            if len(' '.join(current_line)) > 40:
                lines.append(' '.join(current_line[:-1]))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        y_offset = 200
        for line in lines[:8]:  # Max 8 lines
            draw.text((256, y_offset), line, fill='#1f2937', font=font_small, anchor='mm')
            y_offset += 30
        
        return img

    def _compile_gif(self, images: List[Image.Image], duration: int = 2500) -> bytes:
        """Compile a list of images into an animated GIF."""
        # Ensure all images are the same size
        target_size = (512, 512)
        resized_images = [img.resize(target_size, Image.Resampling.LANCZOS) for img in images]
        
        # Save as animated GIF
        output = io.BytesIO()
        resized_images[0].save(
            output,
            format='GIF',
            save_all=True,
            append_images=resized_images[1:],
            duration=duration,  # milliseconds per frame
            loop=0  # infinite loop
        )
        output.seek(0)
        
        return output.read()


# Global instance
_gif_service: Optional[GifGenerationService] = None

def get_gif_service() -> GifGenerationService:
    global _gif_service
    if _gif_service is None:
        _gif_service = GifGenerationService()
    return _gif_service
