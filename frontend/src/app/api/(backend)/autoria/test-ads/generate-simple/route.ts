import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  console.log('🔥 [SIMPLE] Generate simple route called');
  
  try {
    const body = await request.json();
    console.log('🔥 [SIMPLE] Request body:', body);
    
    // Test backend connection without auth
    console.log('🔥 [SIMPLE] Testing backend connection...');
    const healthResponse = await fetch(`${BACKEND_URL}/health/`);
    console.log('🔥 [SIMPLE] Health response status:', healthResponse.status);
    
    let healthData = null;
    if (healthResponse.ok) {
      healthData = await healthResponse.json();
      console.log('🔥 [SIMPLE] Health data:', healthData);
    }
    
    // Test public models endpoint
    console.log('🔥 [SIMPLE] Testing public models endpoint...');
    const modelsResponse = await fetch(`${BACKEND_URL}/api/public/reference/models?page_size=5`);
    console.log('🔥 [SIMPLE] Models response status:', modelsResponse.status);
    
    let modelsData = null;
    if (modelsResponse.ok) {
      modelsData = await modelsResponse.json();
      console.log('🔥 [SIMPLE] Models data:', modelsData);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simple test completed',
      timestamp: new Date().toISOString(),
      backendUrl: BACKEND_URL,
      tests: {
        backendHealth: healthResponse.status,
        healthData,
        modelsEndpoint: modelsResponse.status,
        modelsCount: modelsData?.options?.length || 0
      }
    });
  } catch (error: any) {
    console.error('🔥 [SIMPLE] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
