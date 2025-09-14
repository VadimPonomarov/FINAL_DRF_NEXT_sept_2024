import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API route для удаления объявления
 * DELETE /api/autoria/cars/[id]/delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[Delete Car API] 🚀 DELETE request received');
  try {
    const resolvedParams = await params;
    const carId = resolvedParams.id;
    console.log('[Delete Car API] 🗑️ Deleting car ad:', carId);

    // Формируем URL к Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/${carId}/delete`;
    
    console.log('[Delete Car API] 📤 Proxying to:', apiUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('[Delete Car API] 🔐 Auth headers keys:', Object.keys(authHeaders));

    // Делаем запрос к Django backend
    const backendResponse = await fetch(apiUrl, {
      method: 'DELETE',
      headers: authHeaders
    });

    console.log('[Delete Car API] 📡 Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Delete Car API] ❌ Backend error:', backendResponse.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to delete car ad', 
          details: errorText,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    console.log('[Delete Car API] ✅ Successfully deleted car ad:', carId);

    // Django DELETE обычно возвращает 204 No Content
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('[Delete Car API] ❌ Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Конфигурация маршрута
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
