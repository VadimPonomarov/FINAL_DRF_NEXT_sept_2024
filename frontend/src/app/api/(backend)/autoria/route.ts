import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * API Proxy для создания объявлений автомобилей
 * Проксирует запросы к Django backend
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('🚗 AUTORIA API PROXY: POST request received!');
    console.log('🚗 AUTORIA API: Creating car ad...');

    // Получаем данные из запроса
    const body = await request.json();
    console.log('📋 AUTORIA API: Request body:', JSON.stringify(body, null, 2));

    // Проксируем запрос к Django backend
    const backendUrl = `${BACKEND_URL}/api/ads/cars/create`;
    console.log('🔗 AUTORIA API: Proxying to:', backendUrl);

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('🔐 AUTORIA API: Auth headers:', Object.keys(authHeaders));

    // Добавляем account_id к данным (временно используем фиксированный ID)
    // TODO: Получать account_id из аутентификации пользователя
    const bodyWithAccount = {
      ...body,
      account: 1 // Временно используем ID 1
    };

    console.log('📋 AUTORIA API: Final request body:', JSON.stringify(bodyWithAccount, null, 2));

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(bodyWithAccount)
    });

    console.log('📊 AUTORIA API: Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AUTORIA API: Backend error:', errorText);

      return NextResponse.json(
        {
          error: 'Failed to create car ad',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ AUTORIA API: Success!', result);

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ AUTORIA API: Error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Autoria API Proxy',
    endpoints: {
      'POST /api/autoria/': 'Create car ad',
      'POST /api/autoria/test-ads/generate': 'Generate test ads',
      'POST /api/autoria/test-ads/debug': 'Debug endpoint'
    }
  });
}
