import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/configs/auth';
import { Redis } from '@upstash/redis';

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
    
    // УРОВЕНЬ 2: Проверка backend токенов в Redis
    let backendTokenData: any = null;
    
    try {
      const redis = Redis.fromEnv();
      const backendAuth = await redis.get('backend_auth');
      
      if (backendAuth) {
        backendTokenData = typeof backendAuth === 'string' ? JSON.parse(backendAuth) : backendAuth;
        console.log('[API /auth/me] Backend tokens found in Redis:', {
          hasAccess: !!backendTokenData.access,
          hasRefresh: !!backendTokenData.refresh
        });
      } else {
        console.log('[API /auth/me] No backend tokens in Redis');
      }
    } catch (redisError) {
      console.error('[API /auth/me] Redis check failed:', redisError);
    }

    // Если нет backend токенов - возвращаем 401
    if (!backendTokenData?.access) {
      console.log('[API /auth/me] ❌ No backend tokens found');
      return NextResponse.json({
        authenticated: false,
        error: 'Backend tokens required',
        needsBackendAuth: true,
      }, {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // УРОВЕНЬ 3: Валидация access token через backend API
    console.log('[API /auth/me] Validating access token with backend...');
    const validationResult = await validateAccessTokenWithBackend(backendTokenData.access);
    
    if (!validationResult.valid) {
      console.log('[API /auth/me] ❌ Access token invalid according to backend');
      return NextResponse.json({
        authenticated: false,
        error: 'Access token invalid',
        needsRefresh: true,
      }, {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Все проверки пройдены
    console.log('[API /auth/me] ✅ Authentication valid');
    
    return NextResponse.json({
      authenticated: true,
      user: validationResult.user || session?.user || {
        email: backendTokenData.email || 'unknown',
      },
      hasNextAuthSession,
      hasBackendTokens: true,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
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
