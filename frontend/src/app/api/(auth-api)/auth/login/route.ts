import { NextRequest, NextResponse } from "next/server";
import { fetchAuth } from "@/app/api/helpers";

export async function POST(request: NextRequest) {
  try {
    console.log('[API Login] Starting login request');
    
    const body = await request.json();
    console.log('[API Login] Request body:', {
      email: body.email,
      username: body.username,
      password: body.password ? '***' : 'missing',
      hasEmail: !!body.email,
      hasUsername: !!body.username,
      hasPassword: !!body.password,
      authType: body.email ? 'backend' : 'dummy'
    });
    
    // Validate required fields - support both backend (email/password) and dummy (username/password)
    const isBackendAuth = !!body.email;
    const isDummyAuth = !!body.username;

    if (!isDummyAuth && !isBackendAuth) {
      console.error('[API Login] Missing required fields');
      return NextResponse.json(
        {
          error: {
            message: 'Either email/password or username/password are required'
          }
        },
        { status: 400 }
      );
    }

    if (isBackendAuth && !body.password) {
      console.error('[API Login] Missing password for backend auth');
      return NextResponse.json(
        {
          error: {
            message: 'Password is required for backend authentication'
          }
        },
        { status: 400 }
      );
    }

    if (isDummyAuth && !body.password) {
      console.error('[API Login] Missing password for dummy auth');
      return NextResponse.json(
        {
          error: {
            message: 'Password is required for dummy authentication'
          }
        },
        { status: 400 }
      );
    }
    
    // Call fetchAuth function
    console.log('[API Login] Calling fetchAuth...');
    const authResult = await fetchAuth(body);
    
    console.log('[API Login] fetchAuth result:', {
      hasError: !!authResult.error,
      hasAccess: !!authResult.access,
      hasRefresh: !!authResult.refresh,
      redisSaveSuccess: authResult.redisSaveSuccess
    });
    
    // Return the result
    if (authResult.error) {
      console.error('[API Login] Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    console.log('[API Login] ✅ Authentication successful');
    return NextResponse.json(authResult, { status: 200 });
    
  } catch (error) {
    console.error('[API Login] Unexpected error:', error);
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
