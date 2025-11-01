import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения

/**
 * Универсальный API эндпоинт для публичных reference данных
 * Проксирует запросы к Django backend для получения реальных каскадных данных
 * 
 * ДУБЛИКАТ route handler из (backend)/public/reference/[type]/route.ts
 * для обеспечения совместимости в production build
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
    // ВАЖНО: NEXT_PUBLIC_BACKEND_URL должен быть установлен для локальной разработки
    // Значение по умолчанию: http://localhost/api (через nginx) или http://localhost:8000 (напрямую)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';
    console.log(`🔧 [PUBLIC REFERENCE API] Using backend URL: ${backendUrl}`);
    
    // Перекладываем параметры запроса в соответствии с ожиданиями Django
    const adjustedParams = new URLSearchParams(searchParams.toString());
    if (djangoType === 'cities') {
      // Бэкенд DRF обычно ждёт 'region', а фронт шлёт 'region_id'
      const regionId = adjustedParams.get('region_id');
      if (regionId && !adjustedParams.get('region')) {
        adjustedParams.set('region', regionId);
        // Удаляем region_id после преобразования для избежания дублирования
        adjustedParams.delete('region_id');
      }
      // Увеличиваем размер страницы по умолчанию, если не передан
      if (!adjustedParams.get('page_size')) {
        adjustedParams.set('page_size', '1000');
      }
    }
    if (djangoType === 'models/choices') {
      // Для моделей бэкенд может ждать 'mark' вместо 'mark_id'
      const markId = adjustedParams.get('mark_id');
      if (markId && !adjustedParams.get('mark')) {
        adjustedParams.set('mark', markId);
      }
    }
    const queryString = adjustedParams.toString();
    // Django использует /api/ads/reference/ вместо /api/public/reference/
    const djangoUrl = `${backendUrl}/api/ads/reference/${djangoType}/${queryString ? `?${queryString}` : ''}`;

    console.log(`🔗 PUBLIC REFERENCE API: Proxying to Django: ${djangoUrl}`);

    // Проксируем запрос к Django
    // 1) Пробрасываем авторизацию если она пришла на публичный роут
    let authHeader = request.headers.get('authorization') || '';
    // 2) Если заголовка нет — пытаемся достать токен из Redis через внутренний API
    if (!authHeader) {
      try {
        const tokenRes = await fetch(`${request.nextUrl.origin}/api/auth/token`, { cache: 'no-store' });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.access) {
            authHeader = `Bearer ${tokenData.access}`;
          }
        }
      } catch (e) {
        console.warn('⚠️ PUBLIC REFERENCE API: Failed to load auth token from Redis:', e);
      }
    }

    const doRequest = async (authorization?: string) => {
      return fetch(djangoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { 'Authorization': authorization } : {}),
        },
        cache: 'no-store'
      });
    };

    let response = await doRequest(authHeader || undefined);

    // При 401 пробуем авто-рефреш токена и повторяем 1 раз
    if (response.status === 401 && authHeader) {
      console.log('🔄 PUBLIC REFERENCE API: Got 401, attempting token refresh...');
      try {
        const refreshRes = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.access) {
            console.log('✅ PUBLIC REFERENCE API: Token refreshed, retrying request');
            response = await doRequest(`Bearer ${refreshData.access}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ PUBLIC REFERENCE API: Token refresh failed:', e);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ PUBLIC REFERENCE API: Django returned ${response.status}: ${errorText}`);
      
      return NextResponse.json(
        {
          error: 'Failed to fetch reference data',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const rawData = await response.json();
    console.log(`✅ PUBLIC REFERENCE API: Received data from Django for type: ${type}`);

    // Обрабатываем данные в зависимости от типа
    let options: any[] = [];

    // Django может возвращать данные в разных форматах
    if (Array.isArray(rawData)) {
      options = rawData;
    } else if (rawData.results && Array.isArray(rawData.results)) {
      options = rawData.results;
    } else if (rawData.options && Array.isArray(rawData.options)) {
      options = rawData.options;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      options = rawData.data;
    } else {
      console.warn(`⚠️ PUBLIC REFERENCE API: Unexpected data format for type: ${type}`, rawData);
      options = [];
    }

    // Формируем ответ в едином формате
    const responseData = {
      success: true,
      type,
      options,
      count: options.length,
      source: 'django_backend'
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

