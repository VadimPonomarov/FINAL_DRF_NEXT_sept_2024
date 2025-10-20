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

// Function to check backend_auth tokens presence in Redis (for Autoria access)
// UPDATED: Now only checks NextAuth session, allows client-side token refresh
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    // First, check NextAuth session using getToken
    console.log(`[Middleware] Checking NextAuth session for Autoria access`);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    console.log(`[Middleware] getToken result:`, token ? 'Token exists' : 'No token', token ? `email: ${token.email}` : '');

    // If no NextAuth session, redirect to signin (not /login, because /login requires session)
    if (!token || !token.email) {
      console.log(`[Middleware] No valid NextAuth session - redirecting to signin`);
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    // NextAuth session exists - allow access
    // Client-side code (fetchWithAuth) will handle token refresh if needed
    console.log(`[Middleware] ✅ NextAuth session valid (email: ${token.email}) - allowing Autoria access`);
    console.log(`[Middleware] 💡 Client-side code will handle backend token refresh if needed`);

    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error checking NextAuth session:', error);
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

