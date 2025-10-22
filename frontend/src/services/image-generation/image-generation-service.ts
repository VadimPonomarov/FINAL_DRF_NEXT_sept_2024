/**
 * Image Generation Service - специализированный сервис для генерации изображений
 * Выделен из generate-car-images/route.ts для соблюдения принципа единственной ответственности
 */

import { CarAdFormData } from '@/types/autoria';
import { ImagePromptService } from './image-prompt-service';

export interface CarImageGenerationRequest {
  formData: CarAdFormData;
  angles?: string[];
  style?: string;
  quality?: string;
  useDescription?: boolean;
  sessionId?: string;
}

export interface CarImageGenerationResponse {
  success: boolean;
  error?: string;
  images?: Array<{
    angle: string;
    url: string;
    prompt: string;
  }>;
  prompts?: string[];
  sessionId?: string;
}

export class ImageGenerationService {
  /**
   * Генерировать изображения автомобиля
   */
  static async generateCarImages(
    request: CarImageGenerationRequest
  ): Promise<CarImageGenerationResponse> {
    const { 
      formData, 
      angles = ['front', 'side', 'rear', 'interior'], 
      style = 'realistic', 
      quality = 'standard', 
      useDescription = true, 
      sessionId 
    } = request;

    try {
      // Валидация данных
      if (!formData.brand || !formData.model || !formData.year) {
        return {
          success: false,
          error: 'Insufficient data for image generation. Brand, model, and year are required.'
        };
      }

      // Создаем session ID
      const carSessionId = this.createSessionId(formData, sessionId);

      // Генерируем промпты для всех углов
      const prompts = angles.map(angle => 
        ImagePromptService.createCarImagePrompt(formData, angle, style, carSessionId)
      );

      // Если требуется только промпт (debug режим)
      if (this.isPromptOnlyMode()) {
        return {
          success: true,
          prompts,
          sessionId: carSessionId
        };
      }

      // Генерируем изображения
      const images = await this.generateImagesForAngles(angles, prompts, style, quality);

      return {
        success: true,
        images,
        prompts,
        sessionId: carSessionId
      };

    } catch (error) {
      console.error('[ImageGenerationService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Создать session ID для серии изображений
   */
  private static createSessionId(formData: CarAdFormData, existingSessionId?: string): string {
    if (existingSessionId && existingSessionId.trim()) {
      return existingSessionId.trim();
    }

    const sessionData = `${formData.brand}_${formData.model}_${formData.year}_${formData.color}_${formData.body_type}`;
    return Buffer.from(`${sessionData}_${Date.now()}`).toString('base64').substring(0, 8);
  }

  /**
   * Проверить режим "только промпт"
   */
  private static isPromptOnlyMode(): boolean {
    // В реальной реализации здесь будет проверка query параметров
    return false;
  }

  /**
   * Генерировать изображения для всех углов
   */
  private static async generateImagesForAngles(
    angles: string[],
    prompts: string[],
    style: string,
    quality: string
  ): Promise<Array<{ angle: string; url: string; prompt: string }>> {
    const images = [];

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      const prompt = prompts[i];

      try {
        const imageUrl = await this.generateSingleImage(prompt, style, quality);
        
        images.push({
          angle,
          url: imageUrl,
          prompt
        });
      } catch (error) {
        console.error(`[ImageGenerationService] Failed to generate image for angle ${angle}:`, error);
        // Продолжаем с другими углами даже если один не удался
      }
    }

    return images;
  }

  /**
   * Генерировать одно изображение
   */
  private static async generateSingleImage(
    prompt: string,
    style: string,
    quality: string
  ): Promise<string> {
    // Здесь будет реальная интеграция с сервисом генерации изображений
    // Пока возвращаем заглушку
    return `https://example.com/generated-image-${Date.now()}.jpg`;
  }

  /**
   * Валидировать параметры запроса
   */
  static validateRequest(request: CarImageGenerationRequest): { valid: boolean; error?: string } {
    if (!request.formData) {
      return { valid: false, error: 'Form data is required' };
    }

    if (!request.formData.brand) {
      return { valid: false, error: 'Brand is required' };
    }

    if (!request.formData.model) {
      return { valid: false, error: 'Model is required' };
    }

    if (!request.formData.year) {
      return { valid: false, error: 'Year is required' };
    }

    return { valid: true };
  }
}
