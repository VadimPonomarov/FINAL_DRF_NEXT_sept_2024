import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/pre-signin
 * Полная очистка перед началом авторизации:
 * - чистим Redis и сессию (через /api/auth/signout-full)
 * - редиректим на /api/auth/signin с callbackUrl=/login
 */
export async function GET(req: NextRequest) {
  try {
    // 1) Полная очистка (Redis + cookies) через signout endpoint
    try {
      await fetch(`${new URL('/api/auth/signout-full', req.url).toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'include',
      });
    } catch (e) {
      // Игнорируем ошибку очистки: всё равно продолжаем на signin
      console.warn('[pre-signin] Signout cleanup failed (ignored):', e);
    }

    // 2) Редирект на стандартную страницу входа NextAuth
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', '/login');
    return NextResponse.redirect(signinUrl);
  } catch (error) {
    console.error('[pre-signin] Error:', error);
    return NextResponse.json({ ok: false, error: 'pre-signin failed' }, { status: 500 });
  }
}
