import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('[Cars API] 📤 Getting car advertisements...');

    const { searchParams } = new URL(request.url);

    // Подготавливаем параметры для backend API
    const params: Record<string, string> = {};

    // Копируем все параметры из запроса
    searchParams.forEach((value, key) => {
      if (value) {
        params[key] = value;
      }
    });
    // Нормализация параметров избранного для совместимости
    if (params.favorites === 'true' || params.only_favorites === 'true') {
      params.favorites_only = 'true';
    }


    console.log('[Cars API] 🔄 Fetching from backend:', {
      endpoint: 'api/ads/cars/',
      params,
      ordering: params.ordering || 'not set'
    });

    // Дополнительное логирование для отладки фильтров
    if (params.mark) console.log('[Cars API] 🏷️ Brand filter (mark):', params.mark);
    if (params.model) console.log('[Cars API] 🚗 Model filter:', params.model);
    if (params.search) console.log('[Cars API] 🔍 Text search:', params.search);

    // Специальное логирование для пагинации
    console.log('[Cars API] 📄 Pagination params:', {
      page: params.page || 'not set',
      page_size: params.page_size || 'not set',
      hasPage: !!params.page,
      hasPageSize: !!params.page_size
    });

    // Отправляем запрос на backend напрямую
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const queryString = new URLSearchParams(params).toString();
    const url = `${backendUrl}/api/ads/cars/${queryString ? `?${queryString}` : ''}`;

    console.log('[Cars API] 🔗 Making request to:', url);
    console.log('[Cars API] 🔧 Backend URL from env:', {
      BACKEND_URL: process.env.BACKEND_URL,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      finalUrl: backendUrl
    });

    // Получаем заголовки авторизации — используем origin, чтобы корректно достучаться до /api/redis
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    // Если запрошены персональные фильтры (избранное/мои) и нет авторизации — вернем 401,
    // чтобы фронт мог показать понятный тост вместо пустой выдачи
    const needsAuth = (() => {
      const sp = searchParams;
      const truthy = (key: string) => {
        const v = sp.get(key);
        return v === 'true' || v === '1' || v === 'yes';
      };
      return truthy('favorites_only') || truthy('invert_favorites') || truthy('my_ads_only') || truthy('invert_my_ads');
    })();

    const hasAuth = !!(authHeaders as any).Authorization;
    if (needsAuth && !hasAuth) {
      console.warn('[Cars API] ⚠️ Auth required for personal filter but no token found');
      return NextResponse.json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authorization required for this filter'
      }, { status: 401 });
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cars API] ❌ Backend request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return NextResponse.json({
        success: false,
        error: `Backend request failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();

    if (!result) {
      console.error('[Cars API] ❌ No data received from backend');
      return NextResponse.json({
        success: false,
        error: 'No data received from backend'
      }, { status: 500 });
    }

    console.log('[Cars API] ✅ Successfully fetched car ads:', {
      count: result.count || 0,
      results: result.results?.length || 0,
      page: result.page || 'not set',
      page_size: result.page_size || 'not set',
      total: result.total || 'not set'
    });

    // Логируем структуру первого объявления для отладки изображений
    if (result.results && result.results.length > 0) {
      const firstCar = result.results[0];
      console.log('[Cars API] 📸 First car image structure:', {
        id: firstCar.id,
        title: firstCar.title?.substring(0, 50) + '...',
        hasImages: !!firstCar.images,
        imagesType: typeof firstCar.images,
        imagesLength: firstCar.images?.length || 0,
        firstImageKeys: firstCar.images?.[0] ? Object.keys(firstCar.images[0]) : 'no images',
        firstImageSample: firstCar.images?.[0]
      });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Cars API] ❌ Error fetching car ads:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch car advertisements',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}


// Proxy create to our improved endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('[Cars API] 🔄 Proxying POST request to improved create endpoint...');

    const body = await request.json();
    console.log('[Cars API] 📋 Received data keys:', Object.keys(body));

    // Используем наш улучшенный endpoint вместо прямого обращения к backend
    const createUrl = new URL('/api/autoria/cars/create', request.nextUrl.origin);
    console.log('[Cars API] 🔗 Proxying to:', createUrl.toString());

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('[Cars API] 📡 Proxy response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Cars API] ❌ Proxy error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    console.log('[Cars API] ✅ Proxy success:', result.success);
    // Возвращаем только данные сущности, чтобы фронт получал созданный объект
    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[Cars API] ❌ Proxy error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Create failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
