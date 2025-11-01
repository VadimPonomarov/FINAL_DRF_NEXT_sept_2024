import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * Universal proxy API route for all backend requests
 * This route proxies requests to the Django backend with proper authentication
 * 
 * Usage: /api/proxy/api/user/profile/ -> http://backend:8000/api/user/profile/
 * 
 * This ensures:
 * - No CORS issues (all requests go through Next.js)
 * - Proper authentication (uses getAuthorizationHeaders)
 * - Consistent error handling
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PATCH');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Get the path segments
    const pathSegments = params.path || [];
    const path = pathSegments.join('/');
    
    console.log(`[Proxy API] ${method} /${path}`);

    // Get backend URL
    // IMPORTANT: Frontend runs locally (not in Docker), so always use localhost
    // Backend runs in Docker but exposes port 8000 to localhost
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Build full URL
    const url = `${backendUrl}/${path}${request.nextUrl.search}`;
    console.log(`[Proxy API] Proxying to: ${url}`);

    // Get authorization headers
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      // НЕ используем credentials: 'include', так как мы используем Bearer токены в заголовках
      // credentials: 'include' вызывает CORS ошибку с Access-Control-Allow-Origin: *
      cache: 'no-store'
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const body = await request.json();
        requestOptions.body = JSON.stringify(body);
      } catch (e) {
        // No body or invalid JSON
      }
    }

    // Make request to backend
    const response = await fetch(url, requestOptions);

    console.log(`[Proxy API] Backend response: ${response.status}`);

    // Get response data
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status code
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Proxy API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Proxy error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

