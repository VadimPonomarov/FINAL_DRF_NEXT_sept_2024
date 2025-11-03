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

// Захищені шляхи, які потребують сесії NextAuth
const PROTECTED_PATHS = [
  '/autoria',   // Усі сторінки AutoRia (рівень 1: NextAuth, рівень 2: backend-токени в Layout)
  '/login',     // Сторінка входу
  '/profile',   // Сторінка профілю
];

// Функція для перевірки внутрішньої сесії NextAuth за допомогою getToken
async function checkInternalAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware] Checking NextAuth session with getToken`);
    // КРИТИЧНО: Используем NEXTAUTH_SECRET из AUTH_CONFIG (с дешифрованием)
    const { AUTH_CONFIG } = await import('@/common/constants/constants');
    const nextAuthSecret = AUTH_CONFIG.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!nextAuthSecret) {
      console.error('[Middleware] ❌ NEXTAUTH_SECRET not found! Check environment variables.');
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      signinUrl.searchParams.set('error', 'configuration_error');
      return NextResponse.redirect(signinUrl);
    }

    // Use NextAuth's getToken to check session
    const token = await getToken({ req, secret: nextAuthSecret });

    // If no token, redirect to signin
    if (!token) {
      console.log(`[Middleware] No valid NextAuth session - redirecting to signin with callback`);
      // Create signin URL with callbackUrl parameter
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    console.log(`[Middleware] Valid NextAuth session found - allowing access`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking NextAuth session:`, error);
    // Create signin URL with callbackUrl parameter
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signinUrl);
  }
}

// РІВЕНЬ 1 (з 2): Middleware — універсальний гард сесії
// ════════════════════════════════════════════════════════════════════════
// Дворівнева система валідації для AutoRia:
// 1. [ЦЕЙ РІВЕНЬ] Middleware: сесія NextAuth → /api/auth/signin, якщо немає
// 2. BackendTokenPresenceGate (HOC у Layout): backend-токени → використовує redirectToAuth
// ════════════════════════════════════════════════════════════════════════
//
// ВАЖЛИВО: Middleware перевіряє ЛИШЕ сесію NextAuth на КОЖНОМУ запиті!
// Це універсальний гард сесії для всіх сторінок AutoRia.
// Backend-токени НЕ перевіряються тут — це робить HOC у Layout (рівень 2)
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware L1] Checking NextAuth session for Autoria access`);
    
    // КРИТИЧНО: використовуємо NEXTAUTH_SECRET з AUTH_CONFIG (з розшифруванням)
    const { AUTH_CONFIG } = await import('@/common/constants/constants');
    const nextAuthSecret = AUTH_CONFIG.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!nextAuthSecret) {
      console.error('[Middleware L1] ❌ NEXTAUTH_SECRET not found! Check environment variables.');
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      signinUrl.searchParams.set('error', 'configuration_error');
      return NextResponse.redirect(signinUrl);
    }
    
    const token = await getToken({ req, secret: nextAuthSecret });

    console.log(`[Middleware L1] getToken result:`, token ? 'Token exists' : 'No token', token ? `email: ${token.email}` : '');

    // Якщо немає сесії NextAuth — редирект на signin
    if (!token || !token.email) {
      console.log(`[Middleware L1] ❌ No NextAuth session - redirecting to signin`);
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    // Сесія NextAuth існує — надаємо доступ
    // BackendTokenPresenceGate у Layout (рівень 2) перевірить наявність backend-токенів
    // та використає redirectToAuth для коректного редиректу за потреби
    console.log(`[Middleware L1] ✅ NextAuth session valid (email: ${token.email}) - passing to L2 (Layout HOC)`);

    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware L1] ❌ Error checking NextAuth session:', error);
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signinUrl);
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
  if (pathname.startsWith('/api/')) {
    console.log('[Middleware] API route, allowing without auth checks');
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

  // Захищаємо сторінки AutoRia (рівень 1: перевірка сесії NextAuth)
  const accept = req.headers.get('accept') || '';
  const isHtmlPage = accept.includes('text/html');
  
  if (pathname.startsWith('/autoria') && isHtmlPage) {
    return await checkBackendAuth(req);
  }

  // Захищаємо інші сторінки, що потребують NextAuth (НЕ захищаємо /login, щоб уникнути циклів)
  const requiresAuth = ['/profile', '/settings'].some(path => pathname.startsWith(path));
  if (requiresAuth) {
    return await checkInternalAuth(req);
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
