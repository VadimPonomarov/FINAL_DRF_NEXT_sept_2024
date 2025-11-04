import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * GET /api/ads/moderation/queue
 * Proxy to backend: /api/ads/cars/moderation/queue
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Moderation Queue API] Fetching moderation queue...');

    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // На сервере используем BACKEND_URL для прямого подключения
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/queue${queryString ? `?${queryString}` : ''}`;

    console.log('[Moderation Queue API] Requesting:', apiUrl);

    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    console.log('[Moderation Queue API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Moderation Queue API] Backend error:', errorText);

      if (backendResponse.status === 401 || backendResponse.status === 403) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Требуется авторизация' },
          { status: backendResponse.status }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch moderation queue', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Moderation Queue API] Success:', {
      count: data.count || 0,
      results: data.results?.length || 0
    });

    // Преобразуем формат DRF в ожидаемый frontend формат
    const responseData = {
      success: true,
      data: data.results || [],
      count: data.count || 0,
      next: data.next,
      previous: data.previous
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[Moderation Queue API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

