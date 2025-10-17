import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * API route для обновления объявления
 * PUT /api/autoria/cars/[id]/update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const carId = resolvedParams.id;
    console.log('[Update Car API] 🔄 Updating car ad:', carId);

    // Получаем данные из запроса
    const formData = await request.json();

    // Жесткая нормализация exchange_status на серверном роуте
    const normalizeExchange = (val: any): 'no_exchange' | 'possible' | 'only_exchange' => {
      if (!val) return 'no_exchange';
      if (val === 'no') return 'no_exchange';
      if (val === 'possible_exchange') return 'possible';
      if (val === 'no_exchange' || val === 'possible' || val === 'only_exchange') return val;
      return 'no_exchange';
    };

    formData.exchange_status = normalizeExchange(formData?.exchange_status);
    if (formData?.dynamic_fields) {
      formData.dynamic_fields.exchange_status = normalizeExchange(formData.dynamic_fields.exchange_status);
    }

    console.log('[Update Car API] 📝 Form data received:', {
      title: formData.title,
      price: formData.price,
      exchange_status: formData.exchange_status,
      exchange_status_df: formData?.dynamic_fields?.exchange_status,
      hasChanges: Object.keys(formData).length
    });

    // Формируем URL к Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/${carId}/update`;
    
    console.log('[Update Car API] 📤 Proxying to:', apiUrl);

    // Выполняем аутентифицированный запрос с автообновлением токена
    const backendResponse = await ServerAuthManager.authenticatedFetch(
      request,
      apiUrl,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }
    );

    console.log('[Update Car API] 📡 Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Update Car API] ❌ Backend error:', backendResponse.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to update car ad', 
          details: errorText,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    console.log('[Update Car API] ✅ Successfully updated car ad:', result.id);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[Update Car API] ❌ Error:', error);
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
