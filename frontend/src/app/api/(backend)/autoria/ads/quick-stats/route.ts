import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API Proxy для получения быстрой статистики объявлений
 * Проксирует запросы к Django backend
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 AUTORIA QUICK STATS API: GET request received!');

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force_refresh');

    console.log('🔄 AUTORIA QUICK STATS API: force_refresh =', forceRefresh);

    // Проксируем запрос к Django backend
    const backendUrl = `${BACKEND_URL}/api/ads/statistics/quick/${forceRefresh ? '?force_refresh=true' : ''}`;
    console.log('🔗 AUTORIA QUICK STATS API: Proxying to:', backendUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('🔐 AUTORIA QUICK STATS API: Auth headers:', Object.keys(authHeaders));

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
    });

    console.log('📊 AUTORIA QUICK STATS API: Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AUTORIA QUICK STATS API: Backend error:', errorText);

      return NextResponse.json(
        {
          error: 'Failed to fetch quick statistics',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ AUTORIA QUICK STATS API: Success!', result);
    console.log('📦 AUTORIA QUICK STATS API: Data source:', result.source);
    console.log('📊 AUTORIA QUICK STATS API: Stats:', {
      total_ads: result.data?.total_ads,
      active_ads: result.data?.active_ads,
      total_users: result.data?.total_users
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ AUTORIA QUICK STATS API: Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}