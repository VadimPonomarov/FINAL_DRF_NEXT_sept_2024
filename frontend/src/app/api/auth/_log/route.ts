import { NextRequest, NextResponse } from 'next/server';

// Internal logging endpoint (possibly used by NextAuth or other internal systems)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the request for debugging
    console.log('[Auth Log] Internal log request:', {
      timestamp: new Date().toISOString(),
      body: body
    });
    
    // Return success response
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Auth Log] Error processing log request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests as well
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Auth log endpoint is active' 
  });
}
