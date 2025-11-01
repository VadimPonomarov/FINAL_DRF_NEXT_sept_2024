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

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth',     // NextAuth internal authentication (includes /api/auth/signin)
  '/api/redis',
  '/api/backend-health',
  '/api/health',
  '/api/reference',
  '/api/public',
  // ВАЖНО: /api/user НЕ должен быть public - это backend endpoint, который должен идти через proxy!
  // Убрали '/api/user' из списка - теперь эти запросы будут проксироваться через /api/proxy
  '/api/openapi',  // OpenAPI schema proxy - should be public for docs
  '/register',     // User registration
  '/auth'          // Auth redirect page
  // NOTE: /login removed - it should require internal session to get external API tokens
];

// Paths that require internal NextAuth session (but not backend tokens)
const INTERNAL_AUTH_PATHS = [
    '/login',     // Login page requires internal auth
  '/profile',   // Profile page requires NextAuth session
  '/settings'   // Settings page requires NextAuth session
];

// Autoria paths that require backend_auth tokens in Redis
const AUTORIA_PATHS = [
  '/autoria/search',    // Search page requires backend auth
  '/autoria/ad',        // Ad detail page requires backend auth
  '/autoria/my-ads',    // My ads page requires backend auth
  '/autoria/favorites', // Favorites page requires backend auth
  '/autoria/create',    // Create ad page requires backend auth
  '/autoria'            // All other autoria paths require backend auth
];

// Additional paths for Next.js static files
const STATIC_PATHS = [
  '_next/static',
  '_next/image',
  'favicon.ico'
];

// Function to check internal NextAuth session using getToken
async function checkInternalAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware] Checking NextAuth session with getToken`);

    // Use NextAuth's getToken to check session
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

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

// УРОВЕНЬ 1 и 2: Middleware - универсальный гард сессии И backend токенов
// ════════════════════════════════════════════════════════════════════════
// Двухуровневая система валидации для AutoRia:
// 1. [УРОВЕНЬ 1] Middleware: NextAuth сессия → /api/auth/signin если нет
// 2. [УРОВЕНЬ 2] Middleware: Backend токены в Redis → /login если нет (если есть сессия) или /api/auth/signin если нет сессии
// 3. BackendTokenPresenceGate (HOC в Layout): Дополнительная проверка на клиенте
// ════════════════════════════════════════════════════════════════════════
//
// ВАЖНО: Middleware проверяет ОБА уровня на сервере, чтобы нельзя было обойти защиту отключив JavaScript!
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware L1] Checking NextAuth session for Autoria access`);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    console.log(`[Middleware L1] getToken result:`, token ? 'Token exists' : 'No token', token ? `email: ${token.email}` : '');

    // УРОВЕНЬ 1: Если нет NextAuth сессии - редирект на signin
    if (!token || !token.email) {
      console.log(`[Middleware L1] ❌ No NextAuth session - redirecting to signin`);
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    console.log(`[Middleware L1] ✅ NextAuth session valid (email: ${token.email}) - checking backend tokens (L2)`);

    // УРОВЕНЬ 2: Проверяем backend токены в Redis через прямой вызов API
    try {
      // Получаем базовый URL для внутреннего запроса
      const protocol = req.headers.get('x-forwarded-proto') || req.url.split('://')[0];
      const host = req.headers.get('host') || req.url.split('://')[1].split('/')[0];
      const baseUrl = `${protocol}://${host}`;
      
      // Проверяем backend токены через /api/redis?key=backend_auth
      const redisCheckUrl = `${baseUrl}/api/redis?key=backend_auth`;
      console.log(`[Middleware L2] Checking backend tokens in Redis via: ${redisCheckUrl}`);
      
      // Создаем новый запрос с cookies из оригинального запроса
      const cookies = req.headers.get('cookie') || '';
      const checkResponse = await fetch(redisCheckUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'User-Agent': req.headers.get('user-agent') || 'middleware'
        },
        cache: 'no-store'
      });

      if (!checkResponse.ok) {
        // Ошибка доступа к Redis API
        console.log(`[Middleware L2] ❌ Redis API check failed: ${checkResponse.status}`);
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.url);
        loginUrl.searchParams.set('error', 'backend_auth_check_failed');
        return NextResponse.redirect(loginUrl);
      }

      const redisData = await checkResponse.json();
      const hasBackendTokens = redisData.exists && redisData.value;

      if (!hasBackendTokens) {
        // Backend токены не найдены в Redis
        console.log(`[Middleware L2] ❌ Backend tokens not found in Redis`);
        
        // Если есть NextAuth сессия, но нет backend токенов → редирект на /login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.url);
        loginUrl.searchParams.set('error', 'backend_auth_required');
        loginUrl.searchParams.set('message', 'Потрібна авторизація для доступу до AutoRia');
        return NextResponse.redirect(loginUrl);
      }

      console.log(`[Middleware L2] ✅ Backend tokens found in Redis - access granted`);
      return NextResponse.next();
    } catch (error) {
      console.error('[Middleware L2] ❌ Error checking backend tokens:', error);
      // При ошибке проверки токенов - редирект на /login (сессия есть, но токены не проверены)
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      loginUrl.searchParams.set('error', 'backend_auth_check_failed');
      return NextResponse.redirect(loginUrl);
    }
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

  // Check if this is a static file path
  if (STATIC_PATHS.some(path => pathname.includes(path))) {
    console.log('[Middleware] Static path, allowing access');
    return NextResponse.next();
  }

  // Check if this is a public path - allow access without authentication
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    console.log('[Middleware] Public path, allowing access without authentication');
    return NextResponse.next();
  }

  // Check if this is a path that requires internal NextAuth session
  if (INTERNAL_AUTH_PATHS.some(path => pathname.startsWith(path))) {
    console.log('[Middleware] Internal auth path, checking NextAuth session');
    return await checkInternalAuth(req);
  }

  // Check if this is a path with language prefix that should be redirected to clean URL
  const hasLanguagePrefix = locales.some(locale => pathname.startsWith(`/${locale}/`));
  if (hasLanguagePrefix) {
    const localeMatch = locales.find(locale => pathname.startsWith(`/${locale}/`));
    if (localeMatch) {
      const cleanPath = pathname.replace(`/${localeMatch}`, '');
      const shouldRedirectToClean = ['/autoria', '/docs', '/api', '/login', '/register'].some(path => cleanPath.startsWith(path));

      if (shouldRedirectToClean) {
        console.log(`[Middleware] Redirecting from ${pathname} to ${cleanPath} (removing language prefix)`);
        return NextResponse.redirect(new URL(cleanPath, req.url));
      }
    }
  }

  // Check if this is an Autoria path that requires backend_auth tokens
  if (AUTORIA_PATHS.some(path => pathname.startsWith(path))) {
    console.log('[Middleware] Autoria path, checking backend_auth tokens in Redis');
    return await checkBackendAuth(req);
  }

  // Handle internationalization only for specific paths that need it
  const i18nPaths = ['/help', '/about'];
  const excludeFromI18n = ['/autoria', '/api', '/login', '/register', '/docs'];

  const needsI18n = i18nPaths.some(path => pathname.startsWith(path));
  const shouldExcludeFromI18n = excludeFromI18n.some(path => pathname.startsWith(path));

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Apply i18n only to specific paths that need localization and are not excluded
  if (needsI18n && !shouldExcludeFromI18n && pathnameIsMissingLocale) {
    console.log('[Middleware] Path needs i18n, handling with intl middleware');
    return intlMiddleware(req);
  }

  // For all other paths, allow access without i18n processing
  console.log('[Middleware] Regular path, allowing access without i18n');
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Include all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

