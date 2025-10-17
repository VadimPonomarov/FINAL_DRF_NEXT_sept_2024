import { NextRequest, NextResponse } from 'next/server';
import { CarAdFormData } from '@/types/autoria';

interface ContentGenerationRequest {
  formData: Partial<CarAdFormData>;
  language?: 'ru' | 'uk' | 'en';
  style?: 'professional' | 'casual' | 'premium';
}

interface ContentGenerationResponse {
  title: string;
  description: string;
  confidence: number;
  reasoning?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContentGenerationRequest = await request.json();
    const { formData, language = 'ru', style = 'professional' } = body;

    // Validate required data
    if (!formData.brand || !formData.model || !formData.year) {
      return NextResponse.json(
        { error: 'Insufficient data for content generation. Brand, model, and year are required.' },
        { status: 400 }
      );
    }

    // Create prompt for g4f
    const prompt = createPrompt(formData, language, style);

    // Call g4f service (simulated for now)
    const generatedContent = await generateWithG4F(prompt);

    // Parse the response
    const parsedContent = parseGeneratedContent(generatedContent);

    const response: ContentGenerationResponse = {
      title: parsedContent.title,
      description: parsedContent.description,
      confidence: calculateConfidence(formData),
      reasoning: `Generated based on ${Object.keys(formData).length} provided fields`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

/**
 * Generate content using g4f (placeholder implementation)
 */
async function generateWithG4F(prompt: string): Promise<string> {
  // TODO: Implement actual g4f integration
  // For now, return a mock response
  
  // This would be the actual g4f call:
  // const g4f = require('g4f');
  // const response = await g4f.ChatCompletion.create({
  //   model: "gpt-3.5-turbo",
  //   messages: [{ role: "user", content: prompt }],
  // });
  // return response;

  // Mock response for development
  return `ЗАГОЛОВОК: BMW X5 2020 - премиум кроссовер в отличном состоянии
ОПИСАНИЕ: Продается BMW X5 2020 года в идеальном состоянии. Один владелец, полная история обслуживания в официальном дилере. Автомобиль не участвовал в ДТП, все ТО пройдены вовремя. Комплектация: кожаный салон, панорамная крыша, система навигации, камеры кругового обзора, адаптивный круиз-контроль. Двигатель 3.0 л, 340 л.с., полный привод xDrive. Пробег 45 000 км. Цена договорная. Торг уместен. Звоните!`;
}

/**
 * Create prompt for content generation
 */
function createPrompt(formData: Partial<CarAdFormData>, language: string, style: string): string {
  const carInfo = formatCarInfo(formData);
  
  const styleDescriptions = {
    professional: 'профессиональный, деловой',
    casual: 'дружелюбный, неформальный',
    premium: 'премиальный, роскошный'
  };

  const prompts = {
    ru: `Создай привлекательное объявление о продаже автомобиля в ${styleDescriptions[style as keyof typeof styleDescriptions]} стиле на основе следующих данных:

${carInfo}

Требования:
1. Заголовок: краткий, информативный, до 80 символов
2. Описание: подробное, привлекательное, 150-500 слов
3. Упомяни ключевые преимущества и особенности
4. Добавь призыв к действию
5. Используй эмоциональные триггеры для привлечения покупателей

Формат ответа:
ЗАГОЛОВОК: [заголовок]
ОПИСАНИЕ: [описание]`,

    uk: `Створи привабливе оголошення про продаж автомобіля у ${styleDescriptions[style as keyof typeof styleDescriptions]} стилі на основі наступних даних:

${carInfo}

Вимоги:
1. Заголовок: короткий, інформативний, до 80 символів
2. Опис: детальний, привабливий, 150-500 слів
3. Згадай ключові переваги та особливості
4. Додай заклик до дії
5. Використовуй емоційні тригери для залучення покупців

Формат відповіді:
ЗАГОЛОВОК: [заголовок]
ОПИС: [опис]`,

    en: `Create an attractive car sale advertisement in ${style} style based on the following data:

${carInfo}

Requirements:
1. Title: concise, informative, up to 80 characters
2. Description: detailed, attractive, 150-500 words
3. Mention key advantages and features
4. Add call to action
5. Use emotional triggers to attract buyers

Response format:
TITLE: [title]
DESCRIPTION: [description]`
  };

  return prompts[language as keyof typeof prompts] || prompts.ru;
}

/**
 * Format car information for prompt
 */
function formatCarInfo(formData: Partial<CarAdFormData>): string {
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
function parseGeneratedContent(response: string): { title: string; description: string } {
  const titleMatch = response.match(/(?:ЗАГОЛОВОК|TITLE|ЗАГОЛОВОК):\s*(.+)/i);
  const descriptionMatch = response.match(/(?:ОПИСАНИЕ|DESCRIPTION|ОПИС):\s*([\s\S]+)/i);

  return {
    title: titleMatch?.[1]?.trim() || 'Продается автомобиль',
    description: descriptionMatch?.[1]?.trim() || 'Автомобиль в хорошем состоянии'
  };
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidence(formData: Partial<CarAdFormData>): number {
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
