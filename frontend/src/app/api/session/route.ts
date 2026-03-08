import { NextRequest, NextResponse } from 'next/server';

// Session-based token storage for web apps
// Works on Vercel without Redis dependency

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    console.log(`[Session Storage] POST for key: ${key}`);

    // For session tokens, store in HTTP-only cookies
    if (key === 'backend_auth' || key === 'dummy_auth') {
      const tokenData = JSON.parse(value);
      
      const response = NextResponse.json({
        success: true,
        message: 'Tokens stored in session',
        key,
        saved: true,
        storage: 'session'
      });

      // Store access token in HTTP-only cookie (server-side only)
      if (tokenData.access) {
        response.cookies.set('access_token', tokenData.access, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: ttl || 3600, // 1 hour
          path: '/'
        });
      }

      // Store refresh token in regular cookie (client-side accessible)
      // for mobile apps and client-side refresh logic
      if (tokenData.refresh) {
        response.cookies.set('refresh_token', tokenData.refresh, {
          httpOnly: false, // Allow client access for mobile apps
          secure: true,
          sameSite: 'lax',
          maxAge: (ttl || 3600) * 24 * 7, // 7 days for refresh
          path: '/'
        });
      }

      // Store user info in session cookie
      if (tokenData.user) {
        response.cookies.set('user_session', JSON.stringify({
          id: tokenData.user.id,
          email: tokenData.user.email,
          role: tokenData.user.role,
          is_superuser: tokenData.user.is_superuser
        }), {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: ttl || 3600,
          path: '/'
        });
      }

      return response;
    }

    // For other keys (like auth_provider), use regular cookies
    const response = NextResponse.json({
      success: true,
      message: 'Data stored in cookies',
      key,
      saved: true,
      storage: 'cookies'
    });

    response.cookies.set(key, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: ttl || 3600
    });

    return response;

  } catch (error) {
    console.error('[Session Storage] Error:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Session Storage] GET for key: ${key}`);

    // For session tokens, reconstruct from cookies
    if (key === 'backend_auth' || key === 'dummy_auth') {
      const accessToken = request.cookies.get('access_token')?.value;
      const refreshToken = request.cookies.get('refresh_token')?.value;
      const userSession = request.cookies.get('user_session')?.value;

      if (accessToken && refreshToken) {
        const tokenData = {
          access: accessToken,
          refresh: refreshToken,
          user: userSession ? JSON.parse(userSession) : null,
          refreshAttempts: 0
        };

        return NextResponse.json({
          success: true,
          exists: true,
          value: JSON.stringify(tokenData),
          storage: 'session'
        });
      } else {
        return NextResponse.json({
          success: true,
          exists: false,
          storage: 'session'
        });
      }
    }

    // For other keys, read from cookies
    const cookieValue = request.cookies.get(key)?.value;
    
    return NextResponse.json({
      success: true,
      exists: !!cookieValue,
      value: cookieValue || null,
      storage: 'cookies'
    });

  } catch (error) {
    console.error('[Session Storage] Error:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Session Storage] DELETE for key: ${key}`);

    const response = NextResponse.json({
      success: true,
      message: 'Data deleted from session',
      key,
      deleted: true,
      storage: 'session'
    });

    // Delete session-related cookies
    if (key === 'backend_auth' || key === 'dummy_auth') {
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      response.cookies.delete('user_session');
    } else {
      response.cookies.delete(key);
    }

    return response;

  } catch (error) {
    console.error('[Session Storage] Error:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
