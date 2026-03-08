import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify JSON parsing works
 * If this works, then the main login API should work too
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      received: body,
      timestamp: new Date().toISOString(),
      message: 'JSON parsing works correctly'
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'JSON parsing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test login endpoint is working',
    timestamp: new Date().toISOString()
  });
}
