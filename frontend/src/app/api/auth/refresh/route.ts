import { NextRequest, NextResponse } from 'next/server';

/**
 * API route для обновления токенов аутентификации
 * Поддерживает оба провайдера: Backend и Dummy
 * 
 * Workflow:
 * 1. Определяет текущий провайдер (backend/dummy)
 * 2. Получает refresh token из Redis
 * 3. Вызывает соответствующий backend endpoint для refresh
 * 4. Сохраняет новые токены в Redis
 * 5. Возвращает новые токены клиенту
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Refresh API] Starting token refresh...');

    // Определяем текущий провайдер
    const providerResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=auth_provider`);
    let authKey = 'backend_auth'; // default
    let provider = 'backend';
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      if (providerData.exists && providerData.value === 'dummy') {
        authKey = 'dummy_auth';
        provider = 'dummy';
        backendUrl = process.env.NEXT_PUBLIC_DUMMY_BACKEND_URL || 'http://localhost:8001';
        console.log('[Refresh API] Using Dummy provider');
      } else {
        console.log('[Refresh API] Using Backend provider');
      }
    }

    // Получаем текущие токены из Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=${authKey}`);
    
    if (!redisResponse.ok) {
      console.error(`[Refresh API] Failed to get tokens from Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'No tokens found in Redis', provider },
        { status: 404 }
      );
    }

    const redisData = await redisResponse.json();
    
    if (!redisData.exists || !redisData.value) {
      console.error(`[Refresh API] No tokens found in Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'No tokens found in Redis', provider },
        { status: 404 }
      );
    }

    // Парсим токены
    const tokenData = typeof redisData.value === 'string' 
      ? JSON.parse(redisData.value) 
      : redisData.value;

    const { refresh: refreshToken, refreshAttempts = 0 } = tokenData;

    if (!refreshToken) {
      console.error(`[Refresh API] No refresh token found in Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'No refresh token found', provider },
        { status: 404 }
      );
    }

    // Проверяем количество попыток refresh
    const maxAttempts = 3;
    if (refreshAttempts >= maxAttempts) {
      console.error(`[Refresh API] Max refresh attempts (${maxAttempts}) reached for ${authKey}`);
      return NextResponse.json(
        { error: 'Max refresh attempts reached', provider, refreshAttempts },
        { status: 429 }
      );
    }

    // Увеличиваем счетчик попыток
    const newAttempts = refreshAttempts + 1;
    console.log(`[Refresh API] Token refresh attempt ${newAttempts}/${maxAttempts} for ${authKey}`);

    // Сохраняем увеличенный счетчик попыток
    await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: authKey,
        value: JSON.stringify({
          ...tokenData,
          refreshAttempts: newAttempts,
          lastRefreshTime: Date.now()
        })
      })
    });

    // Вызываем backend endpoint для refresh
    console.log(`[Refresh API] Calling ${backendUrl}/api/auth/refresh`);
    const backendResponse = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`[Refresh API] Backend refresh failed: ${backendResponse.status}`, errorText);
      
      // Сохраняем информацию о неудачной попытке
      await fetch(`${request.nextUrl.origin}/api/redis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: authKey,
          value: JSON.stringify({
            ...tokenData,
            refreshAttempts: newAttempts,
            lastRefreshFailed: true,
            lastRefreshTime: Date.now()
          })
        })
      });

      return NextResponse.json(
        { 
          error: 'Token refresh failed', 
          provider, 
          refreshAttempts: newAttempts,
          details: errorText 
        },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();

    if (!data.access) {
      console.error('[Refresh API] No access token in backend response');
      return NextResponse.json(
        { error: 'No access token in response', provider },
        { status: 500 }
      );
    }

    // Сохраняем новые токены в Redis с сброшенным счетчиком попыток
    const newTokenData = {
      access: data.access,
      refresh: data.refresh || refreshToken, // Используем новый refresh или старый, если не ротируется
      refreshAttempts: 0, // Сбрасываем счетчик при успехе
      lastRefreshFailed: false,
      lastRefreshTime: Date.now()
    };

    const saveResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: authKey,
        value: JSON.stringify(newTokenData)
      })
    });

    if (!saveResponse.ok) {
      console.error(`[Refresh API] Failed to save refreshed tokens to Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'Failed to save tokens to Redis', provider },
        { status: 500 }
      );
    }

    console.log(`[Refresh API] ✅ Token refresh successful for ${authKey}, attempts reset to 0`);

    return NextResponse.json({
      success: true,
      access: data.access,
      refresh: data.refresh || refreshToken,
      provider,
      tokensVerified: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('[Refresh API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

