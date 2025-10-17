import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API Proxy для получения быстрой статистики объявлений
 * Проксирует запросы к Django backend
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 QUICK STATS API: GET request received!');

    // Проксируем запрос к Django backend
    const backendUrl = `${BACKEND_URL}/api/ads/statistics/quick/`;
    console.log('🔗 QUICK STATS API: Proxying to:', backendUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('🔐 QUICK STATS API: Auth headers:', Object.keys(authHeaders));

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
    });

    console.log('📊 QUICK STATS API: Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ QUICK STATS API: Backend error:', errorText);

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
    console.log('✅ QUICK STATS API: Success!', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ QUICK STATS API: Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}