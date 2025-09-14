/**
 * LLM Content Generator Service
 * Generates car ad titles and descriptions using g4f
 */

import { CarAdFormData } from '@/types/autoria';

export interface ContentGenerationRequest {
  formData: Partial<CarAdFormData>;
  language?: 'ru' | 'uk' | 'en';
  style?: 'professional' | 'casual' | 'premium';
}

export interface ContentGenerationResponse {
  title: string;
  description: string;
  confidence: number;
  reasoning?: string;
}

class LLMContentGeneratorService {
  private readonly API_ENDPOINT = '/api/llm/generate-content';

  /**
   * Generate title and description based on form data
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error('Failed to generate content');
    }
  }

  /**
   * Generate title only
   */
  async generateTitle(formData: Partial<CarAdFormData>, language: string = 'ru'): Promise<string> {
    const content = await this.generateContent({ formData, language: language as any });
    return content.title;
  }

  /**
   * Generate description only
   */
  async generateDescription(formData: Partial<CarAdFormData>, language: string = 'ru'): Promise<string> {
    const content = await this.generateContent({ formData, language: language as any });
    return content.description;
  }

  /**
   * Check if form data is sufficient for content generation
   */
  canGenerateContent(formData: Partial<CarAdFormData>): boolean {
    const requiredFields = ['brand', 'model', 'year', 'price'];
    return requiredFields.every(field => formData[field as keyof CarAdFormData]);
  }

  /**
   * Get content generation readiness score (0-100)
   */
  getReadinessScore(formData: Partial<CarAdFormData>): number {
    const fields = [
      'brand', 'model', 'year', 'price', 'currency',
      'mileage', 'fuel_type', 'transmission_type', 'body_type',
      'color', 'region', 'city', 'contact_name', 'phone'
    ];

    const filledFields = fields.filter(field => {
      const value = formData[field as keyof CarAdFormData];
      return value !== undefined && value !== null && value !== '';
    });

    return Math.round((filledFields.length / fields.length) * 100);
  }

  /**
   * Create prompt for content generation
   */
  private createPrompt(formData: Partial<CarAdFormData>, language: string): string {
    const carInfo = this.formatCarInfo(formData);
    
    const prompts = {
      ru: `Создай привлекательное объявление о продаже автомобиля на основе следующих данных:

${carInfo}

Требования:
1. Заголовок: краткий, информативный, до 80 символов
2. Описание: подробное, привлекательное, 150-500 слов
3. Стиль: профессиональный, но дружелюбный
4. Упомяни ключевые преимущества и особенности
5. Добавь призыв к действию

Формат ответа:
ЗАГОЛОВОК: [заголовок]
ОПИСАНИЕ: [описание]`,

      uk: `Створи привабливе оголошення про продаж автомобіля на основі наступних даних:

${carInfo}

Вимоги:
1. Заголовок: короткий, інформативний, до 80 символів
2. Опис: детальний, привабливий, 150-500 слів
3. Стиль: професійний, але дружелюбний
4. Згадай ключові переваги та особливості
5. Додай заклик до дії

Формат відповіді:
ЗАГОЛОВОК: [заголовок]
ОПИС: [опис]`,

      en: `Create an attractive car sale advertisement based on the following data:

${carInfo}

Requirements:
1. Title: concise, informative, up to 80 characters
2. Description: detailed, attractive, 150-500 words
3. Style: professional but friendly
4. Mention key advantages and features
5. Add call to action

Response format:
TITLE: [title]
DESCRIPTION: [description]`
    };

    return prompts[language as keyof typeof prompts] || prompts.ru;
  }

  /**
   * Format car information for prompt
   */
  private formatCarInfo(formData: Partial<CarAdFormData>): string {
    const info: string[] = [];

    if (formData.brand && formData.model) {
      info.push(`Автомобиль: ${formData.brand} ${formData.model}`);
    }
    if (formData.year) {
      info.push(`Год выпуска: ${formData.year}`);
    }
    if (formData.mileage) {
      info.push(`Пробег: ${formData.mileage} км`);
    }
    if (formData.price && formData.currency) {
      info.push(`Цена: ${formData.price} ${formData.currency}`);
    }
    if (formData.fuel_type) {
      info.push(`Топливо: ${formData.fuel_type}`);
    }
    if (formData.transmission_type) {
      info.push(`КПП: ${formData.transmission_type}`);
    }
    if (formData.body_type) {
      info.push(`Кузов: ${formData.body_type}`);
    }
    if (formData.color) {
      info.push(`Цвет: ${formData.color}`);
    }
    if (formData.region && formData.city) {
      info.push(`Местоположение: ${formData.region}, ${formData.city}`);
    }
    if (formData.engine_volume) {
      info.push(`Объем двигателя: ${formData.engine_volume}л`);
    }
    if (formData.engine_power) {
      info.push(`Мощность: ${formData.engine_power} л.с.`);
    }

    return info.join('\n');
  }

  /**
   * Parse generated content from LLM response
   */
  private parseGeneratedContent(response: string): { title: string; description: string } {
    const titleMatch = response.match(/(?:ЗАГОЛОВОК|TITLE|ЗАГОЛОВОК):\s*(.+)/i);
    const descriptionMatch = response.match(/(?:ОПИСАНИЕ|DESCRIPTION|ОПИС):\s*([\s\S]+)/i);

    return {
      title: titleMatch?.[1]?.trim() || 'Продается автомобиль',
      description: descriptionMatch?.[1]?.trim() || 'Автомобиль в хорошем состоянии'
    };
  }
}

export const llmContentGenerator = new LLMContentGeneratorService();
