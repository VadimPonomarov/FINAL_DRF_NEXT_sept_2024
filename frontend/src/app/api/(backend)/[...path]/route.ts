import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// Generic backend proxy for ANY /api/* path that doesn't have a more specific route.
// Keeps the same path after /api and forwards method, headers and body.
// Specific routes (e.g., /api/auth/*, /api/redis, etc.) take precedence by filesystem routing.

async function proxy(request: NextRequest) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const url = new URL(request.url);
  const backendUrl = `${backendBase}${url.pathname}${url.search}`; // preserve full /api/... path

  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : (isFormData ? await request.formData() : await request.text());

  const init: RequestInit = {
    method: request.method,
    // Do not forward Next headers like x-middleware-prefetch; construct clean headers
    headers: Object.fromEntries(
      Array.from(request.headers.entries()).filter(([k]) => !k.startsWith('x-next-') && k !== 'host')
    ),
  };
  if (body !== undefined && body !== '') (init as any).body = body as any;

  const resp = await ServerAuthManager.authenticatedFetch(request, backendUrl, init);
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


