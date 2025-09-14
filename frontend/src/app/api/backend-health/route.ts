import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to check Django backend health
 * Used by documentation page to verify backend availability
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Backend Health] Starting health check...');
    
    // Try multiple backend URLs
    const possibleBackendUrls = [
      'http://127.0.0.1:8000',
      'http://localhost:8000',
      process.env.BACKEND_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL
    ].filter(Boolean);

    console.log('[Backend Health] Environment variables:');
    console.log('  BACKEND_URL:', process.env.BACKEND_URL);
    console.log('  NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log('[Backend Health] Trying URLs:', possibleBackendUrls);

    let lastError: Error | null = null;

    for (const backendUrl of possibleBackendUrls) {
      const healthUrl = `${backendUrl}/health/`;

      try {
        console.log('[Backend Health] Checking:', healthUrl);

        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Next.js Health Check',
          },
          // Short timeout for health checks
          signal: AbortSignal.timeout(3000), // 3 seconds timeout
        });

        if (!response.ok) {
          console.log('[Backend Health] URL failed:', healthUrl, response.status);
          lastError = new Error(`${response.status} ${response.statusText}`);
          continue; // Try next URL
        }

        let healthData;
        try {
          healthData = await response.json();
        } catch (parseError) {
          // If response is not JSON, treat as simple OK
          healthData = { status: 'ok', message: 'Backend is running' };
        }

        console.log('[Backend Health] Backend is healthy at:', healthUrl, healthData);

        return NextResponse.json({
          success: true,
          backend: {
            status: 'healthy',
            url: backendUrl,
            healthUrl: healthUrl,
            response: healthData
          },
          frontend: {
            status: 'healthy',
            timestamp: new Date().toISOString()
          },
          message: 'All services are operational'
        });

      } catch (urlError: any) {
        console.log('[Backend Health] Error with URL:', healthUrl, urlError.message);
        lastError = urlError;
        continue; // Try next URL
      }
    }

    // If we get here, all URLs failed
    console.error('[Backend Health] All backend URLs failed, last error:', lastError);
    return NextResponse.json(
      {
        success: false,
        error: 'Backend health check failed',
        message: lastError?.message || 'All backend URLs unreachable',
        triedUrls: possibleBackendUrls.map(url => `${url}/health/`),
        timestamp: new Date().toISOString()
      },
      { status: 503 } // Service Unavailable
    );

  } catch (error: any) {
    console.error('[Backend Health] Error during health check:', error);
    
    // Determine error type
    let errorType = 'unknown';
    let errorMessage = error.message || 'Unknown error';
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      errorType = 'timeout';
      errorMessage = 'Backend health check timed out';
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      errorType = 'connection_refused';
      errorMessage = 'Cannot connect to backend server';
    } else if (error.message?.includes('ENOTFOUND')) {
      errorType = 'dns_error';
      errorMessage = 'Backend server hostname not found';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Backend health check failed',
        errorType,
        message: errorMessage,
        details: {
          name: error.name,
          message: error.message,
          cause: error.cause
        },
        backend: {
          url: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
          status: 'unreachable'
        },
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check if Django backend is running',
          'Verify BACKEND_URL environment variable',
          'Check Docker containers status',
          'Verify network connectivity'
        ]
      },
      { status: 503 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}
