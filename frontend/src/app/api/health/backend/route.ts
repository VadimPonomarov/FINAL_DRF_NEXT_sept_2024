import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    console.log('[Backend Health] Checking backend health:', backendUrl);
    
    // Проверяем доступность backend
    const healthResponse = await fetch(`${backendUrl}/api/health/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Backend Health] Backend response status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('[Backend Health] Backend is healthy:', healthData);
      
      return NextResponse.json({
        success: true,
        backend_url: backendUrl,
        backend_status: 'healthy',
        backend_response: healthData
      });
    } else {
      console.log('[Backend Health] Backend is unhealthy:', healthResponse.status);
      
      return NextResponse.json({
        success: false,
        backend_url: backendUrl,
        backend_status: 'unhealthy',
        error: `Backend returned ${healthResponse.status}`
      }, { status: 503 });
    }
    
  } catch (error: any) {
    console.error('[Backend Health] Backend check failed:', error);
    
    return NextResponse.json({
      success: false,
      backend_url: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
      backend_status: 'unavailable',
      error: error.message || 'Backend unavailable'
    }, { status: 503 });
  }
}
