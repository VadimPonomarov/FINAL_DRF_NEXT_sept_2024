import { NextRequest, NextResponse } from 'next/server';
import { setRefreshTokenCookie, setAuthProviderCookie } from '@/lib/cookie-utils';

/**
 * Dedicated API route for DummyJSON authentication login.
 * Uses the new cookie/session scheme.
 * 
 * Workflow:
 * 1. Receives { username, password } from client
 * 2. Calls DummyJSON /auth/login
 * 3. Saves access token to session
 * 4. Saves refresh token to HTTP-only cookie
 * 5. Returns tokens + user to client
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Dummy Login API] Starting DummyJSON authentication...');

    // Parse request body
    let username = '';
    let password = '';
    try {
      const body = await request.json();
      username = body?.username || '';
      password = body?.password || '';
    } catch (e) {
      console.error('[Dummy Login API] Body parse error:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!username || !password) {
      console.error('[Dummy Login API] Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get DummyJSON URL
    const dummyUrl = process.env.NEXT_PUBLIC_DUMMY_BACKEND_URL || 'https://dummyjson.com';
    const loginEndpoint = `${dummyUrl}/auth/login`;

    console.log(`[Dummy Login API] Calling DummyJSON: ${loginEndpoint}`);

    // Call DummyJSON API
    const dummyResponse = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });

    if (!dummyResponse.ok) {
      let errorBody = '';
      try {
        errorBody = await dummyResponse.text();
      } catch {}
      console.error(`[Dummy Login API] DummyJSON login failed: ${dummyResponse.status}`, errorBody);
      
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          details: errorBody,
          status: dummyResponse.status 
        },
        { status: dummyResponse.status }
      );
    }

    const data = await dummyResponse.json();
    console.log('[Dummy Login API] DummyJSON login successful');

    // Validate response contains required fields
    if (!data.accessToken || !data.refreshToken) {
      console.error('[Dummy Login API] Invalid response from DummyJSON - missing tokens');
      return NextResponse.json(
        { error: 'Invalid response from DummyJSON' },
        { status: 500 }
      );
    }

    // Save access token to session (short-lived)
    const tokenKey = 'dummy_auth';
    const sessionData = {
      access: data.accessToken,
      userId: data.id,
      username: username,
      loginAt: Date.now(),
      expiresAt: Date.now() + (3600 * 1000), // 1 час
      refreshAttempts: 0,
      lastRefreshTime: Date.now()
    };

    console.log(`[Dummy Login API] Saving access token to session with key: ${tokenKey}`);

    // Save to session via API
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: tokenKey, 
        value: JSON.stringify(sessionData),
        ttl: 3600
      }),
      cache: 'no-store'
    });

    const sessionSuccess = sessionResponse.ok;
    if (!sessionSuccess) {
      console.error('[Dummy Login API] Failed to save access token to session');
    }

    // Save refresh token in HTTP-only cookie (more secure)
    const response = NextResponse.json({
      access: data.accessToken,
      user: {
        id: data.id,
        username: username,
        email: data.email || `${username}@dummy.com`
      },
      sessionSaveSuccess: sessionSuccess,
      message: 'DummyJSON login successful'
    });

    setRefreshTokenCookie(response, data.refreshToken);
    setAuthProviderCookie(response, 'dummy');

    return response;

  } catch (error) {
    console.error('[Dummy Login API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'DummyJSON login failed' },
      { status: 500 }
    );
  }
}
