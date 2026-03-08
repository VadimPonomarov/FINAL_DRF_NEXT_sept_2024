import { NextRequest, NextResponse } from 'next/server';
import { getRefreshTokenFromRequest, setRefreshTokenCookie } from '@/lib/cookie-utils';

/**
 * Refresh endpoint for DummyJSON provider
 * Uses refresh token from HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Dummy Refresh API] Starting DummyJSON token refresh...');

    // Get refresh token from HTTP-only cookie
    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      console.error('[Dummy Refresh API] No refresh token found in cookies');
      return NextResponse.json(
        { error: 'No refresh token available', provider: 'dummy' },
        { status: 401 }
      );
    }

    // Get DummyJSON URL
    const dummyUrl = process.env.NEXT_PUBLIC_DUMMY_BACKEND_URL || 'https://dummyjson.com';
    const refreshEndpoint = `${dummyUrl}/auth/refresh`;

    console.log(`[Dummy Refresh API] Calling DummyJSON refresh endpoint: ${refreshEndpoint}`);

    // Call DummyJSON refresh endpoint
    const dummyResponse = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (!dummyResponse.ok) {
      const errorText = await dummyResponse.text();
      console.error(`[Dummy Refresh API] DummyJSON refresh failed: ${dummyResponse.status}`, errorText);
      
      return NextResponse.json(
        { 
          error: 'Token refresh failed', 
          provider: 'dummy',
          details: errorText 
        },
        { status: dummyResponse.status }
      );
    }

    const data = await dummyResponse.json();
    console.log('[Dummy Refresh API] DummyJSON refresh successful');

    // Validate response contains access token
    if (!data.accessToken) {
      console.error('[Dummy Refresh API] No access token in DummyJSON response');
      return NextResponse.json(
        { error: 'No access token in response', provider: 'dummy' },
        { status: 500 }
      );
    }

    // Update session with new access token
    const tokenKey = 'dummy_auth';
    const sessionData = {
      access: data.accessToken,
      refreshAttempts: 0,
      lastRefreshTime: Date.now(),
      expiresAt: Date.now() + (3600 * 1000) // 1 час
    };

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

    if (!sessionResponse.ok) {
      console.error(`[Dummy Refresh API] Failed to save refreshed tokens to session`);
      return NextResponse.json(
        { error: 'Failed to save tokens to session', provider: 'dummy' },
        { status: 500 }
      );
    }

    console.log(`[Dummy Refresh API] ✅ Token refresh successful for dummy provider`);

    // Update refresh token cookie if new one provided
    const response = NextResponse.json({
      success: true,
      access: data.accessToken,
      provider: 'dummy',
      tokensVerified: true,
      message: 'DummyJSON token refreshed successfully'
    });

    if (data.refreshToken) {
      setRefreshTokenCookie(response, data.refreshToken);
    }

    return response;

  } catch (error) {
    console.error('[Dummy Refresh API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'DummyJSON token refresh failed' },
      { status: 500 }
    );
  }
}
