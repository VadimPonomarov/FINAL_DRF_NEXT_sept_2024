import { NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from "next/server";
import { withAuth } from 'next-auth/middleware';

// Supported locales
const locales = ['en', 'ru', 'uk'];
const defaultLocale = 'en';

// Create internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // Изменяем с 'always' на 'as-needed'
});

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth',     // NextAuth internal authentication (includes /api/auth/signin)
  '/api/redis',
  '/api/backend-health',
  '/api/health',
  '/api/reference',
  '/api/public',
  '/api/user',
  '/register',     // User registration
  '/auth'          // Auth redirect page
  // NOTE: /login removed - it should require internal session to get external API tokens
];

// Paths that require internal NextAuth session (but not backend tokens)
const INTERNAL_AUTH_PATHS = [
  '/login'      // Login page for getting external API tokens - requires internal session
];

// Autoria paths that require backend_auth tokens in Redis
// (No token validation - just presence check)
const AUTORIA_PATHS = [
  '/autoria'
];

// Additional paths for Next.js static files
const STATIC_PATHS = [
  '_next/static',
  '_next/image',
  'favicon.ico'
];

// Function to check internal NextAuth session using withAuth
async function checkInternalAuth(req: NextRequest): Promise<NextResponse> {
  try {
    console.log(`[Middleware] Checking NextAuth session with withAuth`);

    // Use NextAuth's withAuth to check session
    const response = await withAuth(req, {
      pages: {
        signIn: '/api/auth/signin'
      }
    });

    // If withAuth returns a response, it means there's no valid session
    if (response) {
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
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const redisResponse = await fetch(`${req.nextUrl.origin}/api/redis?key=backend_auth`);

    if (!redisResponse.ok) {
      console.log(`[Middleware] Failed to check Redis for backend_auth tokens`);
      // Create login URL with callbackUrl parameter
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const redisData = await redisResponse.json();
    if (!redisData.exists || !redisData.value) {
      console.log(`[Middleware] No backend_auth tokens found in Redis - redirecting to login with callback`);
      // Create login URL with callbackUrl parameter
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);

      console.log(`[Middleware] Redirecting to login:`, {
        originalUrl: req.url,
        loginUrl: loginUrl.href,
        callbackUrl: req.url
      });

      return NextResponse.redirect(loginUrl);
    }

    const authData = JSON.parse(redisData.value);
    if (!authData.access || !authData.refresh) {
      console.log(`[Middleware] Incomplete backend_auth tokens in Redis - redirecting to login with callback`);
      // Create login URL with callbackUrl parameter
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);

      console.log(`[Middleware] Redirecting to login (incomplete tokens):`, {
        originalUrl: req.url,
        loginUrl: loginUrl.href,
        callbackUrl: req.url
      });

      return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] backend_auth tokens found in Redis - allowing Autoria access`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking backend_auth tokens:`, error);
    // Create login URL with callbackUrl parameter
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Main middleware function
export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  console.log(`[Middleware] Processing: ${pathname}`);

  // Check if this is a static file path
  const isStaticPath = STATIC_PATHS.some(path => pathname.includes(path));
  if (isStaticPath) {
    console.log(`[Middleware] Static path, allowing access`);
    return NextResponse.next();
  }

  // Check if this is the root path (home page) - always allow access
  if (pathname === '/') {
    console.log(`[Middleware] Root path (home page), allowing access without authentication`);
    return NextResponse.next();
  }

  // Check if this is a public path - allow access without authentication
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    console.log(`[Middleware] Public path, allowing access without authentication`);
    return NextResponse.next();
  }

  // Check if this is a path that requires internal NextAuth session
  const isInternalAuthPath = INTERNAL_AUTH_PATHS.some(path => pathname.startsWith(path));
  if (isInternalAuthPath) {
    console.log(`[Middleware] Internal auth path, checking NextAuth session`);
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
  const isAutoriaPath = AUTORIA_PATHS.some(path => pathname.startsWith(path));
  if (isAutoriaPath) {
    console.log(`[Middleware] Autoria path, checking backend_auth tokens in Redis`);

    // Check for backend_auth tokens in Redis (no validation, just presence)
    return await checkBackendAuth(req);
  }

  // Handle internationalization only for specific paths that need it
  const i18nPaths = ['/help', '/about']; // Только для статических страниц (убираем /docs)
  const excludeFromI18n = ['/autoria', '/api', '/login', '/register', '/docs']; // Исключаем из i18n

  const needsI18n = i18nPaths.some(path => pathname.startsWith(path));
  const shouldExcludeFromI18n = excludeFromI18n.some(path => pathname.startsWith(path));

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Apply i18n only to specific paths that need localization and are not excluded
  if (needsI18n && !shouldExcludeFromI18n && pathnameIsMissingLocale) {
    console.log(`[Middleware] Path needs i18n, handling with intl middleware`);
    return intlMiddleware(req);
  }

  // For all other paths, require authentication (NextAuth session)
  console.log(`[Middleware] Protected path, checking NextAuth session`);
  return await checkInternalAuth(req);
}

export const config = {
  matcher: [
    // Include all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
