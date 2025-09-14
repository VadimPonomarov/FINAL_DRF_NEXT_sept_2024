import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('[Mock Login] Starting mock login request');
    
    const body = await request.json();
    console.log('[Mock Login] Request body:', {
      email: body.email,
      username: body.username,
      password: body.password ? '***' : 'missing',
      hasEmail: !!body.email,
      hasUsername: !!body.username,
      hasPassword: !!body.password
    });
    
    // Validate required fields
    if (!body.password) {
      console.error('[Mock Login] Missing password');
      return NextResponse.json(
        { 
          error: { 
            message: 'Password is required' 
          } 
        },
        { status: 400 }
      );
    }
    
    // Mock authentication - always succeed for testing
    const isBackendAuth = !!body.email;
    const isDummyAuth = !!body.username;
    
    if (!isBackendAuth && !isDummyAuth) {
      console.error('[Mock Login] Missing email or username');
      return NextResponse.json(
        { 
          error: { 
            message: 'Either email or username is required' 
          } 
        },
        { status: 400 }
      );
    }
    
    // Generate mock tokens
    const timestamp = Date.now();
    const mockTokens = {
      access: `mock_access_token_${timestamp}`,
      refresh: `mock_refresh_token_${timestamp}`,
      user: isBackendAuth 
        ? { id: 1, email: body.email }
        : { id: 1, username: body.username }
    };
    
    console.log('[Mock Login] Generated mock tokens:', {
      hasAccess: !!mockTokens.access,
      hasRefresh: !!mockTokens.refresh,
      accessLength: mockTokens.access.length,
      refreshLength: mockTokens.refresh.length
    });
    
    // Save tokens to Redis
    const redisKey = isBackendAuth ? "backend_auth" : "dummy_auth";
    console.log(`[Mock Login] Saving tokens to Redis with key: ${redisKey}`);
    
    try {
      const redisPayload = {
        key: redisKey,
        value: JSON.stringify({
          access: mockTokens.access,
          refresh: mockTokens.refresh,
          refreshAttempts: 0
        })
      };
      
      const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redisPayload),
      });
      
      console.log(`[Mock Login] Redis save response status: ${redisResponse.status}`);
      let redisSaveSuccess = false;
      
      if (!redisResponse.ok) {
        console.error(`[Mock Login] Failed to save tokens to Redis: ${redisResponse.status} ${redisResponse.statusText}`);
      } else {
        console.log(`[Mock Login] ✅ Redis API returned success`);
        
        // Verify tokens were actually saved by reading them back
        console.log(`[Mock Login] Verifying tokens were actually saved...`);
        try {
          const verifyResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=${encodeURIComponent(redisKey)}`);
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            if (verifyData.exists && verifyData.value) {
              const savedTokenData = JSON.parse(verifyData.value);
              redisSaveSuccess = !!(savedTokenData.access && savedTokenData.refresh);
              console.log(`[Mock Login] Token verification result: ${redisSaveSuccess}`);
            } else {
              console.error(`[Mock Login] Verification failed: tokens not found in Redis`);
            }
          } else {
            console.error(`[Mock Login] Verification failed: Redis API error ${verifyResponse.status}`);
          }
        } catch (verifyError) {
          console.error(`[Mock Login] Verification failed with error:`, verifyError);
        }
      }
      
      // Return success response
      console.log('[Mock Login] ✅ Mock authentication successful');
      return NextResponse.json({
        ...mockTokens,
        redisSaveSuccess: redisSaveSuccess
      }, { status: 200 });
      
    } catch (redisError) {
      console.error('[Mock Login] Redis error:', redisError);
      
      // Return tokens even if Redis fails
      return NextResponse.json({
        ...mockTokens,
        redisSaveSuccess: false,
        warning: 'Tokens generated but Redis save failed'
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error('[Mock Login] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Internal server error' 
        } 
      },
      { status: 500 }
    );
  }
}
