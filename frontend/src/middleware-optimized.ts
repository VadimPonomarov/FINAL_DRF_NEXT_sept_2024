import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * ОПТИМІЗОВАНИЙ middleware з кешуванням та швидкими перевірками
 * Виправляє проблеми з повільними редиректами
 */

// Кеш для результатів авторизації (в межах одного запиту)
const authCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 секунд

// Захищені шляхи
const PROTECTED_PATHS = [
  '/autoria/analytics',
  '/autoria/my-ads', 
  '/autoria/create',
  '/autoria/moderation',
  '/profile'
];

// Публічні шляхи (не потребують авторизації)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/api/auth',
  '/autoria/search',
  '/autoria'
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname.startsWith(path));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
}

async function quickAuthCheck(request: NextRequest): Promise<boolean> {
  const cacheKey = `auth_${request.ip || 'unknown'}`;
  const cached = authCache.get(cacheKey);
  
  // Повертаємо з кешу якщо свіжий
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  try {
    // Швидка перевірка NextAuth JWT токена
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
    
    const isAuthenticated = !!token?.email;
    
    // Кешуємо результат
    authCache.set(cacheKey, { 
      result: isAuthenticated, 
      timestamp: Date.now() 
    });
    
    return isAuthenticated;
  } catch (error) {
    console.warn('[Middleware] Auth check error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Пропускаємо API роути та статичні файли
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Пропускаємо публічні сторінки
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Перевіряємо авторизацію тільки для захищених сторінок
  if (isProtectedPath(pathname)) {
    const isAuthenticated = await quickAuthCheck(request);
    
    if (!isAuthenticated) {
      console.log(`[Middleware] Redirecting ${pathname} to /login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
