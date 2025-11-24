import { NextRequest, NextResponse } from 'next/server';

async function safeBackendLogout(req: NextRequest): Promise<void> {
  try {
    await fetch(new URL('/api/auth/logout', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
  } catch (e) {
    // Даже если не удалось — продолжаем, чтобы пользователь мог восстановиться через /login
    console.warn('[GET /logout] Logout failed (ignored):', e);
  }
}

function buildLoginRedirectResponse(req: NextRequest): NextResponse {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/';
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', callbackUrl);
  return NextResponse.redirect(loginUrl);
}

function buildLoginFallbackResponse(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/login', req.url));
}

export async function handleLogout(req: NextRequest): Promise<NextResponse> {
  try {
    await safeBackendLogout(req);
    return buildLoginRedirectResponse(req);
  } catch (error) {
    console.error('[GET /logout] Error:', error);
    return buildLoginFallbackResponse(req);
  }
}
