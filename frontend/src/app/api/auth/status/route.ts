import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/configs/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Status API] Checking authentication status...');

    // 1. Проверяем NextAuth сессию
    const session = await getServerSession(authOptions);
    const hasNextAuthSession = !!session;

    console.log('[Auth Status API] NextAuth session:', hasNextAuthSession ? 'exists' : 'missing');

    // 2. Проверяем backend токены в Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=backend_auth`);
    const redisData = await redisResponse.json();
    const hasBackendTokens = redisData.exists && redisData.value;

    console.log('[Auth Status API] Backend tokens in Redis:', hasBackendTokens ? 'exists' : 'missing');

    let backendTokensValid = false;
    let backendError = null;

    if (hasBackendTokens) {
      // 3. Проверяем валидность backend токенов
      try {
        const authData = JSON.parse(redisData.value);
        
        // Проверяем структуру токенов
        if (authData.access && authData.refresh) {
          // Тестируем токены на простом API endpoint
          const testResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ads/statistics/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authData.access}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000) // 5 секунд таймаут
          });

          backendTokensValid = testResponse.ok;
          
          if (!testResponse.ok) {
            backendError = `Backend API returned ${testResponse.status}`;
            console.log('[Auth Status API] Backend tokens invalid:', backendError);
          } else {
            console.log('[Auth Status API] Backend tokens valid');
          }
        } else {
          backendError = 'Incomplete token structure';
          console.log('[Auth Status API] Incomplete backend tokens');
        }
      } catch (error: any) {
        backendError = error.message || 'Token validation failed';
        console.log('[Auth Status API] Error validating backend tokens:', backendError);
      }
    }

    // 4. Определяем общий статус аутентификации
    const isFullyAuthenticated = hasNextAuthSession && hasBackendTokens && backendTokensValid;
    const needsLogin = !hasNextAuthSession;
    const needsBackendAuth = hasNextAuthSession && (!hasBackendTokens || !backendTokensValid);

    const status = {
      isFullyAuthenticated,
      needsLogin,
      needsBackendAuth,
      hasNextAuthSession,
      hasBackendTokens,
      backendTokensValid,
      backendError,
      user: session?.user || null,
      timestamp: new Date().toISOString()
    };

    console.log('[Auth Status API] Final status:', {
      isFullyAuthenticated,
      needsLogin,
      needsBackendAuth,
      hasNextAuthSession,
      hasBackendTokens,
      backendTokensValid
    });

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error: any) {
    console.error('[Auth Status API] Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check auth status',
      data: {
        isFullyAuthenticated: false,
        needsLogin: true,
        needsBackendAuth: false,
        hasNextAuthSession: false,
        hasBackendTokens: false,
        backendTokensValid: false,
        backendError: error.message,
        user: null,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
