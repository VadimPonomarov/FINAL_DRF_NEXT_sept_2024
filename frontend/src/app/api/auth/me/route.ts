import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/configs/auth';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    // ВАЖНО: Сначала проверяем backend токены в Redis
    // NextAuth сессия опциональна - она может быть не готова сразу после логина
    console.log('[API /auth/me] Checking backend tokens in Redis...');
    
    let backendTokensValid = false;
    let backendTokenData: any = null;
    
    try {
      const redis = Redis.fromEnv();
      const backendAuth = await redis.get('backend_auth');
      backendTokensValid = !!backendAuth;
      
      if (backendAuth) {
        backendTokenData = typeof backendAuth === 'string' ? JSON.parse(backendAuth) : backendAuth;
        console.log('[API /auth/me] Backend tokens found:', {
          hasAccess: !!backendTokenData.access,
          hasRefresh: !!backendTokenData.refresh
        });
      } else {
        console.log('[API /auth/me] No backend tokens in Redis');
      }
    } catch (redisError) {
      console.error('[API /auth/me] Redis check failed:', redisError);
      backendTokensValid = false;
    }

    // Если нет backend токенов - возвращаем 401
    if (!backendTokensValid || !backendTokenData?.access) {
      console.log('[API /auth/me] No valid backend tokens found');
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

    // Токены есть - проверяем NextAuth сессию (опционально)
    const session = await getServerSession(authConfig);
    console.log('[API /auth/me] NextAuth session:', session ? 'present' : 'not yet ready');

    // Возвращаем успех даже если NextAuth сессия не готова
    // Главное - наличие валидных backend токенов
    console.log('[API /auth/me] ✅ Backend tokens valid');

    return NextResponse.json({
      authenticated: true,
      user: session?.user || {
        email: backendTokenData.email || 'unknown',
        // Дополнительные поля из токена если есть
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return new NextResponse(
      JSON.stringify({ 
        authenticated: false,
        error: 'Internal server error' 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
