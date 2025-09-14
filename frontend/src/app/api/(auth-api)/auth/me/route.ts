import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API route для получения информации о текущем пользователе
 * GET /api/auth/me
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Me API] Getting current user info...');

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    
    if (!authHeaders.Authorization) {
      return NextResponse.json(
        { error: 'No authorization token found' },
        { status: 401 }
      );
    }

    // Формируем URL к backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/users/profile/`;

    console.log('[Me API] Requesting user profile from:', apiUrl);

    // Отправляем запрос к backend
    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    console.log('[Me API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Me API] Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to get user profile', details: errorText },
        { status: backendResponse.status }
      );
    }

    const userData = await backendResponse.json();
    console.log('[Me API] Successfully retrieved user profile:', {
      id: userData.id,
      email: userData.email,
      is_staff: userData.is_staff,
      is_superuser: userData.is_superuser
    });

    // Сохраняем информацию о пользователе в Redis под ключом "me"
    try {
      const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'me',
          value: JSON.stringify(userData),
          expiration: 3600 * 24 // 24 часа
        }),
      });

      if (redisResponse.ok) {
        console.log('[Me API] User info saved to Redis under key "me"');
      } else {
        console.warn('[Me API] Failed to save user info to Redis');
      }
    } catch (redisError) {
      console.error('[Me API] Redis save error:', redisError);
    }

    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('[Me API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
