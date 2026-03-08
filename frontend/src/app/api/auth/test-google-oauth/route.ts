import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test Google OAuth] Starting test...');
    
    const body = await request.json();
    const { email, name, image, google_id } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    console.log('[Test Google OAuth] Testing with data:', { email, name, google_id });
    
    // Call Django backend OAuth endpoint
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/oauth/google/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        image,
        google_id,
      }),
    });
    
    console.log('[Test Google OAuth] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Test Google OAuth] Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status}`, details: errorText },
        { status: backendResponse.status }
      );
    }
    
    const authData = await backendResponse.json();
    console.log('[Test Google OAuth] Backend auth successful');
    
    // Tokens are saved via httpOnly cookies by /api/auth/login route
    
    console.log('[Test Google OAuth] Test completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Google OAuth integration test successful',
      user: authData.user,
      created: authData.created
    });
    
  } catch (error) {
    console.error('[Test Google OAuth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
