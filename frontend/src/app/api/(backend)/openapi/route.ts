import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy OpenAPI schema from Django backend
 * This solves CORS issues when Swagger UI tries to load the schema
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[OpenAPI Proxy] Starting OpenAPI schema fetch...');

    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Try multiple possible endpoints
    const possibleEndpoints = [
      `${backendUrl}/api/doc/?format=openapi`,
      `${backendUrl}/api/doc/?format=json`,
      `${backendUrl}/api/schema/`,
      `${backendUrl}/api/doc.json`
    ];

    console.log('[OpenAPI Proxy] Environment variables:');
    console.log('  BACKEND_URL:', process.env.BACKEND_URL);
    console.log('  NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log('[OpenAPI Proxy] Trying endpoints:', possibleEndpoints);

    let lastError: Error | null = null;

    for (const openApiUrl of possibleEndpoints) {
      try {
        console.log('[OpenAPI Proxy] Trying:', openApiUrl);

        const response = await fetch(openApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.oai.openapi+json, application/json, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js OpenAPI Proxy',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

        if (!response.ok) {
          console.log('[OpenAPI Proxy] Endpoint failed:', openApiUrl, response.status);
          lastError = new Error(`${response.status} ${response.statusText}`);
          continue; // Try next endpoint
        }

        const data = await response.json();

        console.log('[OpenAPI Proxy] Successfully fetched schema from:', openApiUrl);
        console.log('[OpenAPI Proxy] Schema size:', JSON.stringify(data).length, 'bytes');

        // Return the OpenAPI schema with proper CORS headers
        return NextResponse.json(data, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Content-Type': 'application/json',
          },
        });

      } catch (endpointError: any) {
        console.log('[OpenAPI Proxy] Error with endpoint:', openApiUrl, endpointError.message);
        lastError = endpointError;
        continue; // Try next endpoint
      }
    }

    // If we get here, all endpoints failed
    console.error('[OpenAPI Proxy] All endpoints failed, last error:', lastError);
    return NextResponse.json(
      {
        error: 'Failed to fetch OpenAPI schema from any backend endpoint',
        message: lastError?.message || 'All endpoints unreachable',
        triedEndpoints: possibleEndpoints,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('[OpenAPI Proxy] Error fetching OpenAPI schema:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching OpenAPI schema',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
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
