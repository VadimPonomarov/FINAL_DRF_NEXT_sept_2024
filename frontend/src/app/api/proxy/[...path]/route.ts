import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { getAuthorizationHeaders } from '@/shared/constants/headers';

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
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    // Normalize to origin and strip trailing /api
    const norm = rawBackend.replace(/\/+$/, '').replace(/\/(api)\/?$/i, '');
    let backendOrigin = norm;
    try { const u = new URL(rawBackend); backendOrigin = `${u.protocol}//${u.host}`; } catch {}

    // Build full URL
    const url = `${backendOrigin}/${path}${request.nextUrl.search}`;
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

    // Add timeout to prevent hanging requests
    const FETCH_TIMEOUT_MS = 30000; // 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Make request to backend
    let response: Response;
    try {
      response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If request was aborted due to timeout, return 504
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Proxy API] Request timeout: ${url}`);
        return NextResponse.json(
          { 
            error: 'Gateway Timeout', 
            message: 'Backend request timed out',
            path: `/${path}`
          },
          { status: 504 }
        );
      }
      
      // Re-throw other errors to be handled by outer catch
      throw error;
    }

    console.log(`[Proxy API] Backend response: ${response.status}`);

    // If unauthorized, try to refresh tokens once and retry
    if (response.status === 401 && !url.includes('/api/auth/')) {
      try {
        const refreshController = new AbortController();
        const refreshTimeoutId = setTimeout(() => refreshController.abort(), 5000); // 5 seconds for refresh
        
        try {
          const refreshResp = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            cache: 'no-store',
            signal: refreshController.signal,
          });
          clearTimeout(refreshTimeoutId);
          
          if (refreshResp.ok) {
            const data = await refreshResp.json();
            const access = data?.access;
            if (access) {
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), FETCH_TIMEOUT_MS);
              
              try {
                const retryHeaders = {
                  ...requestOptions.headers,
                  Authorization: `Bearer ${access}`,
                } as Record<string, string>;
                response = await fetch(url, { 
                  ...requestOptions, 
                  headers: retryHeaders,
                  signal: retryController.signal,
                });
                clearTimeout(retryTimeoutId);
              } catch (retryError) {
                clearTimeout(retryTimeoutId);
                // If retry also times out, continue with original 401 response
                if (retryError instanceof Error && retryError.name === 'AbortError') {
                  console.error(`[Proxy API] Retry request timeout: ${url}`);
                }
              }
            }
          }
        } catch (refreshError) {
          clearTimeout(refreshTimeoutId);
          // If refresh times out, continue with original 401 response
          if (refreshError instanceof Error && refreshError.name === 'AbortError') {
            console.error(`[Proxy API] Token refresh timeout`);
          }
        }
      } catch {}
    }

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
export const maxDuration = 60; // 60 seconds to handle slow backend responses

