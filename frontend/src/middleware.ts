import { NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from "next/server";
import { getToken } from 'next-auth/jwt';

// Підтримувані локалі
const locales = ['en', 'ru', 'uk'];
const defaultLocale = 'en';

// Створюємо middleware для інтернаціоналізації
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

// Захищені шляхи, які потребують повної двухетапної авторизації
// Уровень 1: NextAuth session
// Уровень 2: Backend tokens (access + refresh в Redis)
const PROTECTED_PATHS = [
  '/',          // Home page - требует авторизации
  '/autoria',   // Все страницы AutoRia
  '/profile',   // Страница профиля
  '/settings',  // Настройки
];

// Публичные страницы (доступны без авторизации)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/signin',
  '/api/auth/callback',
  '/api/auth/error',
];

// РІВЕНЬ 1 (з 2): Middleware — перевірка NextAuth сесії
// ════════════════════════════════════════════════════════════════════════
// Дворівнева система валідації для AutoRia:
// 1. [ЦЕЙ РІВЕНЬ] Middleware: NextAuth session → /api/auth/signin, якщо немає
// 2. [Рівень 2] BackendTokenPresenceGate (HOC у Layout): backend-токени → /login, якщо немає
// ════════════════════════════════════════════════════════════════════════
//
// ВАЖЛИВО: 
// - signOut = удаляет сессию + токены → middleware блокирует → /api/auth/signin
// - logout = удаляет только токены → middleware пропускает → BackendTokenPresenceGate блокирует → /login
//
// РІВЕНЬ 1: Перевіряємо тільки наявність NextAuth сесії
// Токени (access_token, refresh_token) — для зовнішніх API, не для middleware
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const { AUTH_CONFIG } = await import('@/shared/constants/constants');
    const nextAuthSecret = AUTH_CONFIG.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;

    if (!nextAuthSecret) {
      console.error('[Middleware] NEXTAUTH_SECRET not found');
      const loginUrl = new URL('/api/auth/signin', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const token = await getToken({ req, secret: nextAuthSecret });

    if (!token) {
      console.log('[Middleware] No NextAuth session - redirecting to /api/auth/signin');
      const loginUrl = new URL('/api/auth/signin', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] NextAuth session valid: ${token.email}`);
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error checking NextAuth session:', error);
    const loginUrl = new URL('/api/auth/signin', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Основна функція middleware
export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  console.log(`[Middleware] Processing: ${pathname}`);

  // Пропускаємо статичні файли
  const isStatic = (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|ico|css|js)$/.test(pathname)
  );
  if (isStatic) return NextResponse.next();

  // ВАЖЛИВО: Пропускаємо ВСІ API-маршрути без перевірок (включно з /api/autoria/*)
  // API routes защищаются на уровне API handlers
  if (pathname.startsWith('/api/')) {
    console.log('[Middleware] API route, allowing without auth checks');
    return NextResponse.next();
  }

  // Проверяем публичные страницы - пропускаем без проверок
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    console.log('[Middleware] Public path, allowing access');
    return NextResponse.next();
  }

  // Прибираємо мовний префікс із захищених шляхів
  const localeMatch = locales.find(locale => pathname.startsWith(`/${locale}/`));
  if (localeMatch) {
    const cleanPath = pathname.replace(`/${localeMatch}`, '');
    const protectedPaths = ['/autoria', '/docs', '/api', '/login', '/register'];
    if (protectedPaths.some(path => cleanPath.startsWith(path))) {
      // Preserve original search params to keep callbackUrl and avoid auth loops
      const url = new URL(req.url);
      const redirectUrl = new URL(cleanPath + url.search, url.origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Проверяем, требует ли страница защиты
  const accept = req.headers.get('accept') || '';
  const isHtmlPage = accept.includes('text/html');
  
  // Защищаем HOME страницу - требует полной авторизации
  if (pathname === '/' && isHtmlPage) {
    console.log('[Middleware] Home page access, checking auth...');
    return await checkBackendAuth(req);
  }

  // КРИТИЧНО: Защищаем все страницы AutoRia (рівень 1: перевірка сесії NextAuth)
  // БЕЗ сессии NextAuth доступ к AutoRia ЗАПРЕЩЕН
  if (pathname.startsWith('/autoria') && isHtmlPage) {
    console.log(`[Middleware] 🔒 AutoRia page access attempt: ${pathname}`);
    const authResponse = await checkBackendAuth(req);
    // Если редирект - возвращаем его немедленно
    if (authResponse.status === 307 || authResponse.status === 308) {
      console.log(`[Middleware] 🚫 Blocking AutoRia access - redirecting to signin`);
      return authResponse;
    }
    // Если доступ разрешен - пропускаем дальше
    console.log(`[Middleware] ✅ AutoRia access allowed (NextAuth session valid)`);
    return authResponse;
  }

  // Защищаем другие защищенные страницы
  const requiresAuth = ['/profile', '/settings'].some(path => pathname.startsWith(path));
  if (requiresAuth && isHtmlPage) {
    return await checkBackendAuth(req);
  }

  // Обробляємо i18n для окремих шляхів
  const i18nPaths = ['/help', '/about'];
  const excludeFromI18n = ['/autoria', '/api', '/login', '/register', '/docs'];
  
  const needsI18n = i18nPaths.some(path => pathname.startsWith(path));
  const shouldExclude = excludeFromI18n.some(path => pathname.startsWith(path));
  const missingLocale = locales.every(locale => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`);
  
  if (needsI18n && !shouldExclude && missingLocale) {
    return intlMiddleware(req);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Перевіряємо всі шляхи, окрім статичних файлів
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
