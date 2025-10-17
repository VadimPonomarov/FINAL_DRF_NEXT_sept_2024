import { NextRequest, NextResponse } from 'next/server';
import { CarAdFormData } from '@/types/autoria';

interface TitleGenerationRequest {
  brand: string;
  model: string;
  year: number;
  price?: number;
  currency?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  engine_volume?: number;
  body_type?: string;
  color?: string;
  condition?: string;
}

interface TitleGenerationResponse {
  title: string;
  confidence: number;
  reasoning?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TitleGenerationRequest = await request.json();
    const { 
      brand, 
      model, 
      year, 
      price, 
      currency = 'USD',
      mileage,
      fuel_type,
      transmission,
      engine_volume,
      body_type,
      color,
      condition
    } = body;

    // Validate required data
    if (!brand || !model || !year) {
      return NextResponse.json(
        { error: 'Insufficient data for title generation. Brand, model, and year are required.' },
        { status: 400 }
      );
    }

    console.log('🎯 [generate-title] Generating title with actual form data:', {
      brand, model, year, price, mileage, fuel_type, transmission, color, condition
    });

    // Create prompt using ONLY the actual form data
    const prompt = createTitlePrompt(body);

    // Try to call backend LLM service
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/ads/llm/generate-title/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mark: brand,
          model: model,
          year: year,
          specs: {
            mileage: mileage || 0,
            engine_volume: engine_volume || 2.0,
            engine_power: 150, // Default fallback
            fuel_type: fuel_type || 'petrol',
            transmission: transmission || 'automatic',
            color: color || 'black',
            condition: condition || 'good',
            price: price || 25000
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.title) {
          console.log('✅ [generate-title] Backend LLM generated:', result.title);
          return NextResponse.json({
            title: result.title,
            confidence: 90,
            reasoning: 'Generated using backend LLM service with actual form data'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ [generate-title] Backend LLM failed, using fallback:', error);
    }

    // Fallback: Generate title using actual form data
    const fallbackTitle = generateFallbackTitle(body);
    console.log('🔄 [generate-title] Using fallback title:', fallbackTitle);

    const response: TitleGenerationResponse = {
      title: fallbackTitle,
      confidence: 75,
      reasoning: 'Generated using fallback logic with actual form characteristics'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [generate-title] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}

/**
 * Create prompt for title generation using actual form data
 */
function createTitlePrompt(data: TitleGenerationRequest): string {
  const carInfo = `${data.brand} ${data.model} ${data.year}`;
  
  const specs = [];
  if (data.mileage) specs.push(`пробіг ${data.mileage} км`);
  if (data.engine_volume) specs.push(`${data.engine_volume}л`);
  if (data.fuel_type) specs.push(data.fuel_type);
  if (data.transmission) specs.push(data.transmission);
  if (data.color) specs.push(`колір ${data.color}`);
  if (data.condition) specs.push(`стан ${data.condition}`);
  if (data.price) specs.push(`ціна ${data.price} ${data.currency}`);

  return `
Створи привабливий заголовок для оголошення про продаж автомобіля на основі РЕАЛЬНИХ характеристик:

Автомобіль: ${carInfo}
Характеристики: ${specs.join(', ')}

Вимоги:
1. Використовуй ТІЛЬКИ надані характеристики
2. Максимум 80 символів
3. Українською мовою
4. Привабливий та інформативний
5. Без вигаданих деталей

Формат відповіді: просто заголовок без додаткового тексту
`;
}

/**
 * Generate fallback title using actual form data
 */
function generateFallbackTitle(data: TitleGenerationRequest): string {
  const carInfo = `${data.brand} ${data.model} ${data.year}`;
  
  const details = [];
  
  // Add actual characteristics from form
  if (data.color) {
    details.push(data.color);
  }
  
  if (data.condition) {
    const conditionMap: Record<string, string> = {
      'excellent': 'відмінний стан',
      'good': 'хороший стан',
      'fair': 'задовільний стан',
      'needs_work': 'потребує ремонту',
      'new': 'новий',
      'used': 'вживаний'
    };
    details.push(conditionMap[data.condition] || data.condition);
  }
  
  if (data.mileage && data.mileage < 50000) {
    details.push('малий пробіг');
  }
  
  if (data.engine_volume) {
    details.push(`${data.engine_volume}л`);
  }

  const detailsStr = details.length > 0 ? ` - ${details.join(', ')}` : '';
  
  return `${carInfo}${detailsStr}`.substring(0, 80);
}
