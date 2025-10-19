import { NextRequest, NextResponse } from 'next/server';

/**
 * Универсальный API эндпоинт для публичных reference данных
 * Проксирует запросы к Django backend для получения реальных каскадных данных
 */

// Маппинг типов Next.js → Django endpoints
// Для некоторых типов используем специальные endpoints для форм (choices)
const TYPE_MAPPING: Record<string, string> = {
  'vehicle-types': 'vehicle-types/choices',  // Используем choices endpoint
  'brands': 'marks/choices',  // Django использует 'marks' вместо 'brands', используем choices
  'models': 'models/choices',  // Используем choices endpoint для форм
  'regions': 'regions',
  'cities': 'cities',
  'colors': 'colors/choices',  // Используем choices endpoint
  'fuel-types': 'fuel-types',
  'transmissions': 'transmissions',
  'body-types': 'body-types',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const { searchParams } = new URL(request.url);

    console.log(`📋 PUBLIC REFERENCE API: GET request for type: ${type}`);

    // Получаем Django endpoint
    const djangoType = TYPE_MAPPING[type];
    if (!djangoType) {
      console.warn(`⚠️ PUBLIC REFERENCE API: Unknown type: ${type}`);
      return NextResponse.json(
        { error: 'Unknown reference type', success: false },
        { status: 400 }
      );
    }

    // Строим URL для Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const queryString = searchParams.toString();
    // Django использует /api/ads/reference/ вместо /api/public/reference/
    const djangoUrl = `${backendUrl}/api/ads/reference/${djangoType}/${queryString ? `?${queryString}` : ''}`;

    console.log(`🔗 PUBLIC REFERENCE API: Proxying to Django: ${djangoUrl}`);

    // Проксируем запрос к Django
    const response = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ PUBLIC REFERENCE API: Django returned ${response.status}`);
      const errorText = await response.text();
      console.error(`❌ Django error: ${errorText}`);
      return NextResponse.json(
        { error: 'Backend error', success: false, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Трансформируем данные в формат {value, label} для VirtualSelect
    let options: any[] = [];
    let rawData: any[] = [];

    // Choices endpoints возвращают массив напрямую, а не {results: [...]}
    const isChoicesEndpoint = djangoType.includes('/choices');

    if (isChoicesEndpoint && Array.isArray(data)) {
      // Choices endpoint возвращает массив напрямую: [{id, name, mark}, ...]
      rawData = data;
      options = data.map((item: any) => ({
        value: String(item.id),
        label: item.name,
        // Сохраняем дополнительные поля для каскадных связей
        // Choices endpoints используют 'mark' вместо 'mark_id', 'vehicle_type' вместо 'vehicle_type_id'
        ...(item.vehicle_type && { vehicle_type_id: item.vehicle_type }),
        ...(item.mark && { brand_id: item.mark }),
        ...(item.region && { region_id: item.region }),
      }));
    } else if (data.results && Array.isArray(data.results)) {
      // Обычные endpoints возвращают {results: [...], count, next, previous}
      rawData = data.results;
      options = data.results.map((item: any) => ({
        value: String(item.id),
        label: item.name,
        // Сохраняем дополнительные поля для каскадных связей
        // Django использует vehicle_type для типов транспорта
        ...(item.vehicle_type && { vehicle_type_id: item.vehicle_type }),
        ...(item.vehicle_type_id && { vehicle_type_id: item.vehicle_type_id }),
        // Django использует mark для марок (brands)
        ...(item.mark && { brand_id: item.mark }),
        ...(item.mark_id && { brand_id: item.mark_id }),
        ...(item.brand_id && { brand_id: item.brand_id }),
        // Регионы
        ...(item.region && { region_id: item.region }),
        ...(item.region_id && { region_id: item.region_id }),
      }));
    }

    // Формируем ответ в формате совместимом с фронтендом
    const responseData = {
      success: true,
      data: rawData,
      options: options,
      pagination: isChoicesEndpoint ? {
        // Choices endpoints не возвращают пагинацию - возвращают все данные сразу
        count: rawData.length,
        page: 1,
        page_size: rawData.length,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        next: null,
        previous: null,
      } : {
        count: data.count || 0,
        page: parseInt(searchParams.get('page') || '1'),
        page_size: parseInt(searchParams.get('page_size') || '20'),
        total_pages: Math.ceil((data.count || 0) / parseInt(searchParams.get('page_size') || '20')),
        has_next: !!data.next,
        has_previous: !!data.previous,
        next: data.next,
        previous: data.previous,
      }
    };

    console.log(`✅ PUBLIC REFERENCE API: Returning ${options.length} items (${rawData.length} options) for type: ${type}`);

    return NextResponse.json(responseData);



  } catch (error) {
    console.error('❌ PUBLIC REFERENCE API: Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}