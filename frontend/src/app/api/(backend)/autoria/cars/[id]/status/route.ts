import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * API route для обновления статуса объявления владельцем
 * PATCH /api/autoria/cars/[id]/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const carId = resolvedParams.id;
    
    const body = await request.json();
    const { status } = body;
    
    console.log('[Car Status API] Updating car status:', { carId, status });

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Валидация допустимых статусов для владельца
    const allowedStatuses = ['active', 'draft', 'sold', 'archived'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Формируем URL к backend
    const backendUrl = process.env.IS_DOCKER === 'true' 
      ? 'http://app:8000' 
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
    
    // Используем специальный endpoint для обновления статуса владельцем
    const apiUrl = `${backendUrl}/api/ads/cars/${carId}/status`;

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin, request);

    // Делаем PATCH запрос к backend
    const backendResponse = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });

    console.log('[Car Status API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Car Status API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update car status', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Car Status API] Successfully updated car status:', {
      id: data.id,
      status: data.status
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Car Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
