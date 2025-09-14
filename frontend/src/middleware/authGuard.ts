import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware для проверки авторизации на защищенных страницах
 */
export function authGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Список защищенных маршрутов
  const protectedRoutes = [
    '/autoria/my-ads',
    '/autoria/create-ad',
    '/autoria/ads/edit',
    '/autoria/profile',
    '/autoria/analytics'
  ];

  // Проверяем, является ли текущий маршрут защищенным
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Проверяем наличие токена авторизации
  const authToken = request.cookies.get('auth_token')?.value;
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!authToken && !sessionToken) {
    // Перенаправляем на страницу входа
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Конфигурация middleware
 */
export const config = {
  matcher: [
    '/autoria/my-ads/:path*',
    '/autoria/create-ad/:path*',
    '/autoria/ads/edit/:path*',
    '/autoria/profile/:path*',
    '/autoria/analytics/:path*'
  ]
};
