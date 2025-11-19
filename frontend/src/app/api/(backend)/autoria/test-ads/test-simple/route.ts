import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔥 [TEST] Simple test route called');
  
  try {
    const body = await request.json();
    console.log('🔥 [TEST] Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test route works!',
      timestamp: new Date().toISOString(),
      body
    });
  } catch (error: any) {
    console.error('🔥 [TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
