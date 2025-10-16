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
  '/api/user',
  '/api/openapi',  // OpenAPI schema proxy - should be public for docs
  '/register',     // User registration
  '/auth'          // Auth redirect page
  // NOTE: /login removed - it should require internal session to get external API tokens
];

// Paths that require internal NextAuth session (but not backend tokens)
const INTERNAL_AUTH_PATHS = [
  '/login'      // Login page for getting external API tokens - requires internal session
];

// Autoria paths that require backend_auth tokens in Redis
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
    // First, check NextAuth session using withAuth
    console.log(`[Middleware] Checking NextAuth session for Autoria access`);
    const authResponse = await withAuth(req, {
      pages: {
        signIn: '/api/auth/signin'
      }
    });

    // If withAuth returns a response, it means there's no valid NextAuth session
    if (authResponse) {
      console.log(`[Middleware] No valid NextAuth session - redirecting to signin`);
      const signinUrl = new URL('/api/auth/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signinUrl);
    }

    // NextAuth session exists, now check backend tokens
    console.log(`[Middleware] NextAuth session valid, checking backend tokens`);

    // Check which provider is used
    const providerResponse = await fetch(`${req.nextUrl.origin}/api/redis?key=auth_provider`);
    let authKey = 'backend_auth'; // default

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      if (providerData.exists && providerData.value === 'dummy') {
        authKey = 'dummy_auth';
        console.log(`[Middleware] Using dummy provider, checking key: ${authKey}`);
      } else {
        console.log(`[Middleware] Using backend provider, checking key: ${authKey}`);
      }
    }

    const redisResponse = await fetch(`${req.nextUrl.origin}/api/redis?key=${authKey}`);

    if (!redisResponse.ok) {
      console.log(`[Middleware] Failed to check Redis for ${authKey} tokens`);
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const redisData = await redisResponse.json();
    if (!redisData.exists || !redisData.value) {
      console.log(`[Middleware] No ${authKey} tokens found in Redis - redirecting to login with callback`);
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const authData = JSON.parse(redisData.value);
    if (!authData.access || !authData.refresh) {
      console.log(`[Middleware] Incomplete ${authKey} tokens in Redis - redirecting to login with callback`);
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] ${authKey} tokens found in Redis - allowing Autoria access`);
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error checking backend_auth tokens:', error);
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

