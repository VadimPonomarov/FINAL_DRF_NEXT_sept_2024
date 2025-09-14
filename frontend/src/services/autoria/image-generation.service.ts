/**
 * Сервис для генерации изображений автомобилей через backend
 */

export class ImageGenerationService {
  /**
   * Генерирует изображение автомобиля через backend endpoint
   */
  static async generateCarImage(prompt: string): Promise<string> {
    console.log(`🎨 Generating car image via backend: ${prompt}`);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Используем универсальный backend endpoint для генерации изображений
      const response = await fetch(`${backendUrl}/api/users/generate-image/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style: 'realistic',
          custom_requirements: 'high quality automotive photography, professional lighting, clean background',
          width: 1024,
          height: 768
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend image generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.image_url) {
        console.log(`✅ Generated car image via backend: ${result.image_url}`);
        return result.image_url;
      } else {
        throw new Error(`Backend generation failed: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ Failed to generate car image via backend:`, error);
      // Возвращаем placeholder изображение
      return 'https://via.placeholder.com/400x300/cccccc/666666?text=Car+Image';
    }
  }

  /**
   * Генерирует изображения автомобиля через специализированный backend endpoint
   */
  static async generateCarImagesForAd(carData: any, imageTypes: string[] = ['front', 'side']): Promise<string[]> {
    console.log(`🎨 Generating car images for ad via backend:`, carData);
    console.log(`📸 Requested image types:`, imageTypes);

    // Проверяем, что типы изображений не пустые
    if (imageTypes.length === 0) {
      throw new Error('Cannot generate images without specified types - empty content not allowed');
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Используем специализированный endpoint для генерации изображений автомобилей
      const response = await fetch(`${backendUrl}/api/chat/generate-car-images/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          car_data: {
            brand: carData.mark,
            model: carData.model,
            year: carData.dynamic_fields?.year || 2020,
            color: carData.dynamic_fields?.color || 'silver',
            body_type: carData.dynamic_fields?.body_type || 'sedan',
            vehicle_type: carData.dynamic_fields?.vehicle_type || carData.vehicle_type,
            vehicle_type_name: carData.dynamic_fields?.vehicle_type_name || carData.vehicle_type_name,
            condition: carData.dynamic_fields?.condition || 'good',
            description: carData.dynamic_fields?.description || carData.description
          },
          angles: imageTypes, // Используем выбранные типы изображений
          style: 'realistic'
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend car images generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.images && result.images.length > 0) {
        const imageUrls = result.images.map((img: any) => img.url).filter((url: string) => url && url.trim() !== '');

        if (imageUrls.length === 0) {
          throw new Error('All generated images are empty - no valid content received');
        }

        if (imageUrls.length !== imageTypes.length) {
          console.warn(`⚠️ Expected ${imageTypes.length} images but got ${imageUrls.length}`);
        }

        console.log(`✅ Generated ${imageUrls.length} valid car images via backend`);
        return imageUrls;
      } else {
        throw new Error(`Backend car images generation failed: ${result.error || 'No images generated'}`);
      }

    } catch (error) {
      console.error(`❌ Failed to generate car images via backend:`, error);

      // Возвращаем placeholder изображения для каждого запрошенного типа
      const placeholderImages = imageTypes.map(type => {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        return `https://via.placeholder.com/400x300/cccccc/666666?text=Car+${typeLabel}`;
      });

      console.log(`🔄 Using ${placeholderImages.length} placeholder images for types:`, imageTypes);
      return placeholderImages;
    }
  }

  /**
   * Генерирует несколько изображений автомобиля
   */
  static async generateCarImages(prompt: string, count: number = 2): Promise<string[]> {
    console.log(`🎨 Generating ${count} car images with prompt: ${prompt}`);
    
    const images: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const imageUrl = await this.generateCarImage(`${prompt} - view ${i + 1}`);
        images.push(imageUrl);
        
        // Небольшая задержка между генерациями
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Failed to generate image ${i + 1}:`, error);
        // Добавляем placeholder
        images.push('https://via.placeholder.com/400x300/cccccc/666666?text=Car+Image');
      }
    }
    
    console.log(`✅ Generated ${images.length} car images`);
    return images;
  }
}
