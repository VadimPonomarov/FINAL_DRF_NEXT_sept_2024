import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /logout
 * Безопасный LOGOUT: очищает backend-токены (Redis) и сохраняет NextAuth сессию.
 * После — редиректит на /login (для повторного получения backend токенов).
 */
export async function GET(req: NextRequest) {
  try {
    // 1) Очистка только backend-токенов (без удаления NextAuth сессии)
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

    // 2) Редирект на /login (для получения backend токенов заново)
    const url = new URL(req.url);
    const callbackUrl = url.searchParams.get('callbackUrl') || '/';
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[GET /logout] Error:', error);
    // Фолбэк — всё равно отправим на /login
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
