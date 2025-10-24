"""Image generation service using pollinations.ai."""

import logging
import urllib.parse
import time
from typing import Optional

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for AI image generation using pollinations.ai with flux model."""
    
    def __init__(self):
        self.base_url = "https://image.pollinations.ai/prompt"
        self.model = "flux"
        self.default_size = (1024, 1024)
    
    def generate_image(
        self, 
        prompt: str, 
        width: int = 1024, 
        height: int = 1024,
        enhance: bool = True,
        nologo: bool = True
    ) -> str:
        """
        Generate image URL using pollinations.ai with flux model.
        Always free, no auth required.
        
        Args:
            prompt: Image generation prompt
            width: Image width
            height: Image height
            enhance: Enable prompt enhancement
            nologo: Remove pollinations.ai logo
            
        Returns:
            Image URL
        """
        try:
            logger.info(f"🎨 Generating image with pollinations.ai flux model: {prompt[:50]}...")
            
            # Создаем уникальный seed для каждого изображения
            seed = abs(hash(f"{prompt}_{int(time.time())}")) % 1000000
            
            # Кодируем промпт для URL
            encoded_prompt = urllib.parse.quote(prompt)
            
            # Генерируем URL изображения
            image_url = (
                f"{self.base_url}/{encoded_prompt}"
                f"?width={width}&height={height}"
                f"&model={self.model}"
                f"&enhance={'true' if enhance else 'false'}"
                f"&seed={seed}"
                f"&nologo={'true' if nologo else 'false'}"
            )
            
            logger.info(f"✅ Image URL generated: {image_url[:100]}...")
            return image_url
                
        except Exception as e:
            logger.error(f"❌ Image generation error: {e}")
            # Даже при ошибке возвращаем URL (pollinations.ai очень надежный)
            encoded_prompt = urllib.parse.quote(prompt)
            return f"{self.base_url}/{encoded_prompt}?width={width}&height={height}&model={self.model}&nologo=true"
    
    def generate_response_text(
        self, 
        original_prompt: str, 
        user_language: str = 'ru'
    ) -> str:
        """
        Generate minimal response text for image generation.
        Image is the main content, text is minimal.
        
        Args:
            original_prompt: Original user prompt
            user_language: User's language
            
        Returns:
            Minimal response text
        """
        return f"🎨 {original_prompt}"


# Global service instance
image_generation_service = ImageGenerationService()

