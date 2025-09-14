import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test Django API] 🧪 Testing Django connection...');
    
    // Используем переменные окружения из env-config
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    console.log('[Test Django API] 🔍 Backend URL:', backendUrl);
    console.log('[Test Django API] 🔍 NODE_ENV:', process.env.NODE_ENV);
    
    // Простой тест соединения
    const url = `${backendUrl}/api/ads/statistics/quick/`;
    console.log('[Test Django API] 🔍 Testing URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('[Test Django API] 🔍 Response status:', response.status);
    console.log('[Test Django API] 🔍 Response ok:', response.ok);
    console.log('[Test Django API] 🔍 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Test Django API] ❌ Django error response:', errorText);
      
      return NextResponse.json({
        success: false,
        django_available: false,
        status: response.status,
        error: errorText,
        backend_url: backendUrl,
        test_url: url
      });
    }
    
    const data = await response.json();
    console.log('[Test Django API] ✅ Django response:', data);
    
    return NextResponse.json({
      success: true,
      django_available: true,
      status: response.status,
      data: data,
      backend_url: backendUrl,
      test_url: url,
      message: 'Django connection successful'
    });
    
  } catch (error: any) {
    console.error('[Test Django API] ❌ Connection error:', error);
    console.error('[Test Django API] ❌ Error name:', error.name);
    console.error('[Test Django API] ❌ Error message:', error.message);
    
    let errorType = 'unknown';
    let errorMessage = error.message;
    
    if (error.name === 'AbortError') {
      errorType = 'timeout';
      errorMessage = 'Request timeout (10 seconds)';
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'connection_refused';
      errorMessage = 'Connection refused - Django not available';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'dns_error';
      errorMessage = 'DNS resolution failed';
    }
    
    return NextResponse.json({
      success: false,
      django_available: false,
      error_type: errorType,
      error_message: errorMessage,
      backend_url: process.env.NODE_ENV === 'production' ? 'http://app:8000' : 'http://localhost:8000',
      node_env: process.env.NODE_ENV
    }, { status: 500 });
  }
}
