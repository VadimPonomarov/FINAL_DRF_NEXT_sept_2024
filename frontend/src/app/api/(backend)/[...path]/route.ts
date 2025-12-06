import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

// Generic backend proxy for ANY /api/* path that doesn't have a more specific route.
// Keeps the same path after /api and forwards method, headers and body.
// Specific routes (e.g., /api/auth/*, /api/redis, etc.) take precedence by filesystem routing.

async function proxy(request: NextRequest) {
  // Use server-side BACKEND_URL when available. Avoid using NEXT_PUBLIC_* here.
  const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  // Normalize base: remove trailing slashes and trailing /api
  const baseNoSlash = rawBase.replace(/\/+$/, '');
  const base = baseNoSlash.replace(/\/(api)\/?$/i, '');

  const url = new URL(request.url);
  // Get the path after the leading /api to avoid double /api when calling backend
  const pathAfterApi = url.pathname.replace(/^\/api/, '');
  const backendUrl = `${base}/api${pathAfterApi}${url.search}`;

  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : (isFormData ? await request.formData() : await request.text());

  // Build plain headers object to satisfy ServerAuthManager typing
  // Drop hop-by-hop and problematic headers; let fetch set correct values
  const headers: Record<string, string> = Object.fromEntries(
    Array.from(request.headers.entries()).filter(([k]) => {
      const key = k.toLowerCase();
      return !key.startsWith('x-next-') &&
             key !== 'host' &&
             key !== 'content-length' &&
             key !== 'connection' &&
             key !== 'transfer-encoding' &&
             key !== 'accept-encoding';
    })
  );

  const fetchOptions = {
    method: request.method,
    headers,
    ...(body !== undefined && body !== '' ? { body: body as any } : {}),
  } as any;

  const resp = await ServerAuthManager.authenticatedFetch(request, backendUrl, fetchOptions);
  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;


