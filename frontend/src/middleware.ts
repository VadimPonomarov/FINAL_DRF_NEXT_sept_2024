import { NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from "next/server";
import { getToken } from 'next-auth/jwt';

// Supported locales
const locales = ['en', 'ru', 'uk'];
const defaultLocale = 'en';

// Create internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

// Protected paths that require NextAuth session
const PROTECTED_PATHS = [
  '/autoria',   // All AutoRia pages (Level 1: NextAuth, Level 2: Backend tokens in Layout)
  '/login',     // Login page
  '/profile',   // Profile page
];

// Function to check internal NextAuth session using getToken
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

// УРОВЕНЬ 1 (из 2): Middleware - универсальный гард сессии
// ════════════════════════════════════════════════════════════════════════
// Двухуровневая система валидации для AutoRia:
// 1. [ЭТОТ УРОВЕНЬ] Middleware: NextAuth сессия → /api/auth/signin если нет
// 2. BackendTokenPresenceGate (HOC в Layout): Backend токены → использует redirectToAuth
// ════════════════════════════════════════════════════════════════════════
//
// ВАЖНО: Middleware проверяет ТОЛЬКО NextAuth сессию на КАЖДОМ запросе!
// Это универсальный гард сессии для всех страниц AutoRia.
// Backend токены НЕ проверяются здесь - это делает HOC в Layout (уровень 2)
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware L1] Checking NextAuth session for Autoria access`);
    
    // КРИТИЧНО: Используем NEXTAUTH_SECRET из AUTH_CONFIG (с дешифрованием)
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

    // Если нет NextAuth сессии - редирект на signin
    if (!token || !token.email) {
      console.log(`[Middleware L1] ❌ No NextAuth session - redirecting to signin`);
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    // NextAuth сессия существует - разрешаем доступ
    // BackendTokenPresenceGate в Layout (уровень 2) проверит наличие backend токенов
    // и использует redirectToAuth для правильного редиректа при необходимости
    console.log(`[Middleware L1] ✅ NextAuth session valid (email: ${token.email}) - passing to L2 (Layout HOC)`);

    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware L1] ❌ Error checking NextAuth session:', error);
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signinUrl);
  }
}

// Main middleware function
export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  console.log(`[Middleware] Processing: ${pathname}`);

  // Skip static files
  const isStatic = (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|ico|css|js)$/.test(pathname)
  );
  if (isStatic) return NextResponse.next();

  // ВАЖНО: Пропускаем ВСЕ API routes без проверок (включая /api/autoria/*)
  if (pathname.startsWith('/api/')) {
    console.log('[Middleware] API route, allowing without auth checks');
    return NextResponse.next();
  }

  // Remove language prefix from protected paths
  const localeMatch = locales.find(locale => pathname.startsWith(`/${locale}/`));
  if (localeMatch) {
    const cleanPath = pathname.replace(`/${localeMatch}`, '');
    const protectedPaths = ['/autoria', '/docs', '/api', '/login', '/register'];
    if (protectedPaths.some(path => cleanPath.startsWith(path))) {
      return NextResponse.redirect(new URL(cleanPath, req.url));
    }
  }

  // Protect AutoRia pages (Level 1: NextAuth session)
  const accept = req.headers.get('accept') || '';
  const isHtmlPage = accept.includes('text/html');
  
  if (pathname.startsWith('/autoria') && isHtmlPage) {
    return await checkBackendAuth(req);
  }

  // Protect other NextAuth-required pages
  const requiresAuth = ['/login', '/profile', '/settings'].some(path => pathname.startsWith(path));
  if (requiresAuth) {
    return await checkInternalAuth(req);
  }

  // Handle i18n for specific paths
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
    // Include all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

