import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * API route для получения конкретного объявления
 * GET /api/autoria/cars/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const carId = resolvedParams.id;
    // Формируем URL к backend
    // В Docker используем имя сервиса 'app', в разработке - localhost
    const backendUrl = process.env.IS_DOCKER === 'true' ? 'http://app:8000' : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
    const apiUrl = `${backendUrl}/api/ads/cars/${carId}`;

    // Получаем заголовки авторизации — используем origin, чтобы корректно достучаться до /api/redis
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin, request);

    // Делаем запрос к backend
    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: authHeaders
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Car Detail API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch car ad', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Car Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/autoria/cars/[id] — proxy to Django delete endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const backendUrl = process.env.IS_DOCKER === 'true' ? 'http://app:8000' : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
    const apiUrl = `${backendUrl}/api/ads/cars/${id}/delete`;
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin, request);

    const backendResponse = await fetch(apiUrl, { method: 'DELETE', headers: authHeaders });
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json({ error: errorText }, { status: backendResponse.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
