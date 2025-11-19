import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  console.log('🔥 [DEBUG] Generate debug route called');
  
  try {
    const body = await request.json();
    console.log('🔥 [DEBUG] Request body:', body);
    
    // Test auth manager
    console.log('🔥 [DEBUG] Testing ServerAuthManager...');
    const authManager = new ServerAuthManager();
    const authFetch = await authManager.createAuthFetch();
    console.log('🔥 [DEBUG] AuthFetch created successfully');
    
    // Test backend connection
    console.log('🔥 [DEBUG] Testing backend connection...');
    const healthResponse = await authFetch(`${BACKEND_URL}/health/`);
    console.log('🔥 [DEBUG] Health response status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('🔥 [DEBUG] Health data:', healthData);
    }
    
    // Test models endpoint
    console.log('🔥 [DEBUG] Testing models endpoint...');
    const modelsResponse = await authFetch(`${BACKEND_URL}/api/public/reference/models?page_size=5`);
    console.log('🔥 [DEBUG] Models response status:', modelsResponse.status);
    
    let modelsData = null;
    if (modelsResponse.ok) {
      modelsData = await modelsResponse.json();
      console.log('🔥 [DEBUG] Models data length:', modelsData?.options?.length || 0);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug test completed',
      timestamp: new Date().toISOString(),
      tests: {
        authManager: 'OK',
        backendHealth: healthResponse.status,
        modelsEndpoint: modelsResponse.status,
        modelsCount: modelsData?.options?.length || 0
      }
    });
  } catch (error: any) {
    console.error('🔥 [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
