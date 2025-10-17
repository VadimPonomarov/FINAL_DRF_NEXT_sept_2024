import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API route для получения объявлений текущего пользователя
 * GET /api/ads/my-ads
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[My Ads API] Fetching user ads...');

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '10';
    const status = searchParams.get('status');
    const ordering = searchParams.get('ordering') || '-created_at';
    const search = searchParams.get('search');

    // Формируем URL к backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    let apiUrl = `${backendUrl}/api/ads/cars/my?page=${page}&page_size=${pageSize}&ordering=${ordering}`;

    if (status && status !== 'all') {
      apiUrl += `&status=${status}`;
    }

    if (search && search.trim()) {
      apiUrl += `&search=${encodeURIComponent(search.trim())}`;
    }

    console.log('[My Ads API] Requesting:', apiUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    
    // Отправляем запрос к backend
    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    console.log('[My Ads API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[My Ads API] Backend error:', errorText);
      
      // Если ошибка авторизации, возвращаем 401
      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Требуется авторизация' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch user ads', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[My Ads API] Successfully fetched user ads:', {
      count: data.count || 0,
      results: data.results?.length || 0
    });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[My Ads API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
