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
    console.log('[Car Detail API] Fetching car ad:', carId);

    // Формируем URL к backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/${carId}`;

    // Получаем заголовки авторизации — используем origin, чтобы корректно достучаться до /api/redis
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    // Делаем запрос к backend
    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: authHeaders
    });

    console.log('[Car Detail API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Car Detail API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch car ad', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Car Detail API] Successfully fetched car ad:', {
      id: data.id,
      title: data.title?.substring(0, 50) + '...',
      mark: data.mark,
      markId: data.mark?.id,
      markName: data.mark?.name,
      model: data.model,
      hasImages: !!data.images,
      imagesCount: data.images?.length || 0,
      hasDynamicFields: !!data.dynamic_fields,
      dynamicFieldsKeys: data.dynamic_fields ? Object.keys(data.dynamic_fields) : [],
      hasContacts: !!data.contacts,
      contactsCount: data.contacts?.length || 0,
      mark: typeof data.mark === 'object' ? data.mark?.name : data.mark,
      model: typeof data.model === 'object' ? data.model?.name : data.model,
      region: typeof data.region === 'object' ? data.region?.name : data.region,
      city: typeof data.city === 'object' ? data.city?.name : data.city,
      // ВАЖНО: Добавляем отладку для vehicle_type
      vehicle_type: data.vehicle_type,
      vehicle_type_name: data.vehicle_type_name,
      vehicle_type_type: typeof data.vehicle_type
    });

    // Дополнительная отладка для изображений
    if (data.images && data.images.length > 0) {
      console.log('[Car Detail API] Images details:', {
        firstImage: data.images[0],
        imageUrls: data.images.map((img: any) => img.image_display_url || img.url || img.image)
      });
    }

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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/${id}/delete`;
    const authHeaders = await getAuthorizationHeaders();

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
