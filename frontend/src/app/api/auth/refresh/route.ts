import { NextRequest, NextResponse } from 'next/server';
import { getRefreshTokenFromRequest, getAuthProviderFromRequest, setRefreshTokenCookie, clearAuthCookies } from '@/lib/cookie-utils';

/**
 * API route для обновления токенов аутентификации
 * Поддерживает оба провайдера: Backend и Dummy
 * 
 * Новая схема:
 * - Refresh token хранится в HTTP-only cookies (безопасно)
 * - Access token возвращается клиенту (без Redis)
 * 
 * Workflow:
 * 1. Получает refresh token из cookies
 * 2. Вызывает backend endpoint для refresh
 * 3. Возвращает новый access token клиенту
 * 4. Обновляет refresh token cookie если нужно
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Refresh API] Starting token refresh...');

    // Получаем refresh token из HTTP-only cookies
    const refreshToken = getRefreshTokenFromRequest(request);
    const authProvider = getAuthProviderFromRequest(request) || 'backend';

    if (!refreshToken) {
      console.error('[Refresh API] No refresh token found in cookies');
      return NextResponse.json(
        { error: 'No refresh token available', provider: authProvider },
        { status: 401 }
      );
    }

    // Для dummy provider используем специальный endpoint
    if (authProvider === 'dummy') {
      console.log('[Refresh API] Redirecting to dummy refresh endpoint');
      const dummyResponse = await fetch(`${request.nextUrl.origin}/api/auth/refresh/dummy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      // Копируем ответ от dummy endpoint
      const dummyData = await dummyResponse.json();
      return NextResponse.json(dummyData, { status: dummyResponse.status });
    }

    // Определяем backend URL
    let backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    if (authProvider === 'dummy') {
      backendUrl = process.env.NEXT_PUBLIC_DUMMY_BACKEND_URL || 'http://localhost:8001';
      console.log('[Refresh API] Using Dummy provider');
    } else {
      console.log('[Refresh API] Using Backend provider');
    }

    // Очищаем URL от дублирования /api
    backendUrl = backendUrl.replace(/\/+$/,'').replace(/\/api$/i,'');

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
      
      // Clear cookies on refresh failure
      const errorResponse = NextResponse.json(
        { 
          error: 'Token refresh failed', 
          provider: authProvider,
          details: errorText 
        },
        { status: backendResponse.status }
      );
      clearAuthCookies(errorResponse);

      return errorResponse;
    }

    const data = await backendResponse.json();

    if (!data.access) {
      console.error('[Refresh API] No access token in backend response');
      return NextResponse.json(
        { error: 'No access token in response', provider: authProvider },
        { status: 500 }
      );
    }

    console.log(`[Refresh API] ✅ Token refresh successful for ${authProvider}`);

    const isProduction = process.env.NODE_ENV === 'production';

    // Возвращаем новый access token
    const response = NextResponse.json({
      success: true,
      access: data.access,
      provider: authProvider,
      message: 'Token refreshed successfully'
    });

    // Обновляем access_token cookie — обязательно, иначе ServerAuthManager продолжит читать старый
    response.cookies.set('access_token', data.access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    // Обновляем refresh token cookie если пришел новый
    if (data.refresh) {
      setRefreshTokenCookie(response, data.refresh);
    }

    return response;

  } catch (error) {
    console.error('[Refresh API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

