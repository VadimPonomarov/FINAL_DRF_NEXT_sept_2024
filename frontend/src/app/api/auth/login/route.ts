import { NextRequest, NextResponse } from 'next/server';
import { setAccessTokenCookie, setRefreshTokenCookie, setAuthProviderCookie, COOKIE_NAMES } from '@/lib/cookie-utils';
import '@/lib/env-loader';

// Generate unique session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Dedicated API route for backend authentication login.
 * This takes precedence over NextAuth's [...nextauth] catch-all.
 * 
 * Workflow:
 * 1. Receives { email, password } from client
 * 2. Forwards to backend /api/auth/login
 * 3. Saves tokens to Redis
 * 4. Returns tokens + user to client
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Login API] Starting backend authentication...');

    // Simple and reliable JSON parsing
    let email = '';
    let password = '';
    
    try {
      const body = await request.json();
      email = body?.email || '';
      password = body?.password || '';
      console.log('[Login API] Parsed credentials:', { hasEmail: !!email, hasPassword: !!password });
    } catch (error) {
      console.error('[Login API] JSON parse error:', error);
    }

    if (!email || !password) {
      // Fallback: try to read from query params to support ad-hoc test calls
      try {
        const url = new URL(request.url);
        email = email || url.searchParams.get('email') || '';
        password = password || url.searchParams.get('password') || '';
        console.log('[Login API] Fallback query params used:', { hasEmail: !!email, hasPassword: !!password });
      } catch {}
    }

    if (!email || !password) {
      console.error('[Login API] Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get backend URL from server env
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const loginEndpoint = `${backendUrl.replace(/\/+$/, '').replace(/\/(api)\/?$/i, '')}/api/auth/login`;

    console.log(`[Login API] Calling backend: ${loginEndpoint}`);

    // Forward to backend
    const backendResponse = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      let errorBody = '';
      try {
        errorBody = await backendResponse.text();
      } catch {}
      console.error(`[Login API] Backend login failed: ${backendResponse.status}`, errorBody);
      
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          details: errorBody,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Login API] Backend login successful');

    // Validate response contains required fields
    if (!data.access || !data.refresh) {
      console.error('[Login API] Invalid response from backend - missing tokens');
      return NextResponse.json(
        { error: 'Invalid response from backend' },
        { status: 500 }
      );
    }

    // Save tokens using NextAuth session instead of Redis
    console.log(`[Login API] Login successful, tokens will be managed by NextAuth session`);

    // Save both access and refresh tokens in HTTP-only cookies (more secure)
    const response = NextResponse.json({
      access: data.access,
      refresh: data.refresh,
      user: data.user,
      message: 'Login successful'
    });

    // Save tokens in httpOnly cookies
    setAccessTokenCookie(response, data.access);
    setRefreshTokenCookie(response, data.refresh);
    setAuthProviderCookie(response, 'backend');
    
    console.log('[Login API] Tokens saved in httpOnly cookies successfully');

    return response;

  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
