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
    // На сервере ВСЕГДА используем BACKEND_URL (напрямую к Django),
    // а не NEXT_PUBLIC_BACKEND_URL (который может указывать на nginx http://localhost/api)
    const backendBaseRaw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    // Нормализуем до origin и убираем завершающий /api
    const baseNoSlash = backendBaseRaw.replace(/\/+$/, '');
    const baseWithoutApi = baseNoSlash.replace(/\/(api)\/?$/i, '');
    let backendOrigin = baseWithoutApi;
    try {
      const u = new URL(backendBaseRaw);
      backendOrigin = `${u.protocol}//${u.host}`;
    } catch {}
    console.log(`🔧 [PUBLIC REFERENCE API] Using backend origin: ${backendOrigin}`);
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
    const djangoUrl = `${backendOrigin}/api/ads/reference/${djangoType}/${queryString ? `?${queryString}` : ''}`;

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

    // Add timeout to prevent hanging requests
    const FETCH_TIMEOUT_MS = 30000; // 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const doRequest = async (authorization?: string, signal?: AbortSignal) => {
      return fetch(djangoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { 'Authorization': authorization } : {}),
        },
        cache: 'no-store',
        signal: signal || controller.signal,
      });
    };

    let response: Response;
    try {
      response = await doRequest(authHeader || undefined);
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If request was aborted due to timeout, return 504
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`❌ PUBLIC REFERENCE API: Request timeout: ${djangoUrl}`);
        return NextResponse.json(
          { 
            error: 'Gateway Timeout', 
            message: 'Backend request timed out',
            success: false 
          },
          { status: 504 }
        );
      }
      
      // Re-throw other errors to be handled by outer catch
      throw error;
    }

    // При 401 пробуем авто-рефреш токена и повторяем 1 раз
    if (response.status === 401) {
      console.warn('🔁 PUBLIC REFERENCE API: 401 from Django, trying to refresh token...');
      try {
        const refreshController = new AbortController();
        const refreshTimeoutId = setTimeout(() => refreshController.abort(), 5000); // 5 seconds for refresh
        
        try {
          const refreshRes = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, { 
            method: 'POST', 
            cache: 'no-store',
            signal: refreshController.signal,
          });
          clearTimeout(refreshTimeoutId);
          
          if (refreshRes.ok) {
            const tokenController = new AbortController();
            const tokenTimeoutId = setTimeout(() => tokenController.abort(), 5000);
            
            try {
              const tokenRes = await fetch(`${request.nextUrl.origin}/api/auth/token`, { 
                cache: 'no-store',
                signal: tokenController.signal,
              });
              clearTimeout(tokenTimeoutId);
              
              if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                const newAuth = tokenData?.access ? `Bearer ${tokenData.access}` : undefined;
                
                // Retry with new token (use new controller for retry)
                const retryController = new AbortController();
                const retryTimeoutId = setTimeout(() => retryController.abort(), FETCH_TIMEOUT_MS);
                
                try {
                  response = await doRequest(newAuth, retryController.signal);
                  clearTimeout(retryTimeoutId);
                } catch (retryError) {
                  clearTimeout(retryTimeoutId);
                  // If retry also times out, continue with original 401 response
                  if (retryError instanceof Error && retryError.name === 'AbortError') {
                    console.error(`❌ PUBLIC REFERENCE API: Retry request timeout: ${djangoUrl}`);
                  }
                }
              }
            } catch (tokenError) {
              clearTimeout(tokenTimeoutId);
              if (tokenError instanceof Error && tokenError.name === 'AbortError') {
                console.error(`❌ PUBLIC REFERENCE API: Token fetch timeout`);
              }
            }
          }
        } catch (refreshError) {
          clearTimeout(refreshTimeoutId);
          // If refresh times out, continue with original 401 response
          if (refreshError instanceof Error && refreshError.name === 'AbortError') {
            console.error(`❌ PUBLIC REFERENCE API: Token refresh timeout`);
          }
        }
      } catch (e) {
        console.error('❌ PUBLIC REFERENCE API: Refresh flow failed:', e);
      }
    }

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

    console.log(`📊 PUBLIC REFERENCE API: Django response for ${type}:`, {
      isArray: Array.isArray(data),
      hasResults: !!data.results,
      dataLength: Array.isArray(data) ? data.length : (data.results?.length || 0),
      sampleItem: Array.isArray(data) ? data[0] : data.results?.[0]
    });

    // Трансформируем данные в формат {value, label} для VirtualSelect
    let options: any[] = [];
    let rawData: any[] = [];

    // Choices endpoints возвращают массив напрямую, а не {results: [...]}
    const isChoicesEndpoint = djangoType.includes('/choices');

    // 1) Некоторые не-choices эндпоинты (например, regions) тоже возвращают ПРЯМО массив
    if (Array.isArray(data)) {
      rawData = data;
      options = data.map((item: any) => ({
        value: String(item.id),
        label: item.name,
        ...(item.vehicle_type && { vehicle_type_id: item.vehicle_type }),
        ...(item.mark && { brand_id: item.mark }),
        ...(item.region && { region_id: item.region }),
      }));
      console.log(`✅ PUBLIC REFERENCE API: Transformed ${options.length} array items for ${type}`);
    } else if (isChoicesEndpoint) {
      // 2) Choices endpoints: на всякий случай обработка, если вдруг формат изменится
      const arr = Array.isArray(data) ? data : [];
      rawData = arr;
      options = arr.map((item: any) => ({
        value: String(item.id),
        label: item.name,
        ...(item.vehicle_type && { vehicle_type_id: item.vehicle_type }),
        ...(item.mark && { brand_id: item.mark }),
        ...(item.region && { region_id: item.region }),
      }));
      console.log(`✅ PUBLIC REFERENCE API: Transformed ${options.length} choices items for ${type}`);
    } else if (data.results && Array.isArray(data.results)) {
      // 3) Пагинированные ответы {results: [...], count, next, previous}
      rawData = data.results;
      options = data.results.map((item: any) => ({
        value: String(item.id),
        label: item.name,
        // Сохраняем дополнительные поля для каскадных связей
        ...(item.vehicle_type && { vehicle_type_id: item.vehicle_type }),
        ...(item.vehicle_type_id && { vehicle_type_id: item.vehicle_type_id }),
        ...(item.mark && { brand_id: item.mark }),
        ...(item.mark_id && { brand_id: item.mark_id }),
        ...(item.brand_id && { brand_id: item.brand_id }),
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

// Increase max duration for this route to handle slow backend responses
export const maxDuration = 60; // 60 seconds