import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * API route для создания объявления
 * POST /api/autoria/cars/create
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Create Car API] 🔄 Creating new car ad');

    // Получаем данные из запроса
    const formData = await request.json();
    console.log('[Create Car API] 📝 Form data received:', {
      title: formData.title,
      price: formData.price,
      hasData: Object.keys(formData).length
    });

    // Формируем URL к Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/`;
    
    console.log('[Create Car API] 📤 Proxying to:', apiUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('[Create Car API] 🔐 Using auth headers');

    // Делаем запрос к Django backend
    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    console.log('[Create Car API] 📡 Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Create Car API] ❌ Backend error:', backendResponse.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to create car ad', 
          details: errorText,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    console.log('[Create Car API] ✅ Successfully created car ad:', result.id);

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('[Create Car API] ❌ Error:', error);
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
