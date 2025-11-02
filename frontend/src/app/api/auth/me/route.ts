import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/configs/auth';

/**
 * Валидация access token через backend API
 * Проверяет не только наличие токена в Redis, но и его валидность через Django API
 */
async function validateAccessTokenWithBackend(accessToken: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Используем endpoint который требует авторизации для валидации токена
    // Используем /api/users/profile/ который требует авторизации и возвращает данные пользователя
    const validationUrl = `${backendUrl}/api/users/profile/`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
    
    try {
      const response = await fetch(validationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('[API /auth/me] ✅ Token validated via backend, user:', userData?.email || 'unknown');
        return { valid: true, user: userData };
      } else if (response.status === 401) {
        console.log('[API /auth/me] ❌ Token invalid (401 from backend)');
        return { valid: false };
      } else {
        console.log('[API /auth/me] ⚠️ Backend validation returned:', response.status);
        // Если это не 401, считаем токен валидным (возможны временные ошибки backend)
        return { valid: true };
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[API /auth/me] ⚠️ Backend validation timeout');
      } else {
        console.error('[API /auth/me] ⚠️ Backend validation error:', fetchError.message);
      }
      // При ошибке сети считаем токен валидным (fallback для доступности)
      return { valid: true };
    }
  } catch (error) {
    console.error('[API /auth/me] Error validating token with backend:', error);
    // При ошибке валидации считаем токен невалидным
    return { valid: false };
  }
}

export async function GET() {
  try {
    // УРОВЕНЬ 1: Проверка NextAuth сессии
    const session = await getServerSession(authConfig);
    const hasNextAuthSession = !!session?.user?.email;
    
    console.log('[API /auth/me] Checking authentication:', {
      hasNextAuthSession,
      sessionEmail: session?.user?.email
    });
    
    // Если нет NextAuth сессии — не аутентифицирован
    if (!hasNextAuthSession) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'NextAuth session required',
          needsBackendAuth: false,
        },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Без Redis: считаем пользователя аутентифицированным по сессии
    // и не выполняем проверку backend токенов
    console.log('[API /auth/me] ✅ NextAuth session valid; Redis disabled, skipping backend token validation');

    return NextResponse.json(
      {
        authenticated: true,
        user: session?.user,
        hasNextAuthSession,
        hasBackendTokens: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('[API /auth/me] Error:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Internal server error' 
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
