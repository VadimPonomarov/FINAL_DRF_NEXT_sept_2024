import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * GET /api/ads/moderation/statistics
 * Proxy to backend: /api/ads/cars/moderation/statistics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Moderation Statistics API] Fetching statistics...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/statistics`;

    console.log('[Moderation Statistics API] Requesting:', apiUrl);

    const authHeaders = await getAuthorizationHeaders();

    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    console.log('[Moderation Statistics API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Moderation Statistics API] Backend error:', errorText);

      if (backendResponse.status === 401 || backendResponse.status === 403) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Требуется авторизация' },
          { status: backendResponse.status }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch statistics', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Moderation Statistics API] Success:', data);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Moderation Statistics API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

