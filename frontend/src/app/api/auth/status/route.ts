import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Status API] Checking authentication status...');

    // 1. Проверяем NextAuth сессию
    const session = await getServerSession(authConfig);
    const hasNextAuthSession = !!session;

    console.log('[Auth Status API] NextAuth session:', hasNextAuthSession ? 'exists' : 'missing');

    // 2. Check backend tokens from cookies
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const hasBackendTokens = !!(accessToken && accessToken.length > 0);

    console.log('[Auth Status API] Backend tokens in cookies:', hasBackendTokens ? 'exists' : 'missing');

    let backendTokensValid = false;
    let backendError = null;

    // Helper to normalize base URL (strip trailing / and trailing /api)
    const normalizeBackendBase = (url: string) => {
      try {
        if (!url) return 'http://localhost:8000';
        let u = url.trim().replace(/\/+$/, '');
        u = u.replace(/\/(api)\/?$/i, '');
        return u;
      } catch {
        return 'http://localhost:8000';
      }
    };

    if (hasBackendTokens && accessToken) {
      // 3. Validate token against backend
      try {
        const backendBase = normalizeBackendBase(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        const testResponse = await fetch(`${backendBase}/api/ads/statistics/`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        backendTokensValid = testResponse.ok;
        if (!testResponse.ok) {
          backendError = `Backend API returned ${testResponse.status}`;
        }
      } catch (error: any) {
        backendError = error.message || 'Token validation failed';
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
