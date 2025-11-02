import { NextRequest, NextResponse } from 'next/server';

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

    // Parse request body robustly (always read raw text once)
    let email = '' as string;
    let password = '' as string;
    try {
      const contentType = request.headers.get('content-type') || '';
      const raw = await request.text();
      console.log('[Login API] Incoming body length:', raw?.length || 0, 'content-type:', contentType);
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(raw || '{}');
          email = parsed?.email || '';
          password = parsed?.password || '';
        } catch (e) {
          console.error('[Login API] JSON parse failed, will try URLSearchParams. Raw:', raw);
          const params = new URLSearchParams(raw || '');
          email = params.get('email') || '';
          password = params.get('password') || '';
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(raw || '');
        email = params.get('email') || '';
        password = params.get('password') || '';
      } else {
        // Try JSON first, then URLSearchParams
        try {
          const parsed = JSON.parse(raw || '{}');
          email = parsed?.email || '';
          password = parsed?.password || '';
        } catch {
          const params = new URLSearchParams(raw || '');
          email = params.get('email') || '';
          password = params.get('password') || '';
        }
      }
      console.log('[Login API] Parsed fields present:', { hasEmail: !!email, hasPassword: !!password });
    } catch (e) {
      console.error('[Login API] Body parse error:', e);
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

    // Save tokens to Redis
    const tokenData = {
      access: data.access,
      refresh: data.refresh,
      refreshAttempts: 0,
      lastRefreshTime: Date.now()
    };

    console.log('[Login API] Saving tokens to Redis...');

    const redisSaveResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'backend_auth',
        value: JSON.stringify(tokenData)
      })
    });

    if (!redisSaveResponse.ok) {
      console.error('[Login API] Failed to save tokens to Redis');
      return NextResponse.json(
        { 
          error: 'Failed to save tokens',
          // Still return tokens so client can proceed, but flag the issue
          access: data.access,
          refresh: data.refresh,
          user: data.user,
          redisSaveSuccess: false
        },
        { status: 200 } // Return 200 since auth succeeded, just Redis save failed
      );
    }

    // Save provider to Redis
    await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'auth_provider',
        value: 'backend'
      })
    });

    console.log('[Login API] ✅ Login successful, tokens saved');

    // Return success with tokens and user data
    return NextResponse.json({
      access: data.access,
      refresh: data.refresh,
      user: data.user,
      redisSaveSuccess: true
    });

  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
