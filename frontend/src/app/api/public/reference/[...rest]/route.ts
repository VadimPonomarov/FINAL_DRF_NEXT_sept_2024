import { NextRequest, NextResponse } from 'next/server';

// Compatibility shim: /api/public/reference/* -> internal proxy /api/proxy/ads/reference/*
// This avoids direct backend calls (which can 504 in Docker) and reuses the unified proxy logic.
export async function GET(request: NextRequest, { params }: { params: { rest: string[] } }) {
  const rest = params.rest?.join('/') || '';
  const origin = request.nextUrl.origin;
  const target = `${origin}/api/proxy/api/ads/reference/${rest}${request.nextUrl.search}`.replace('/api/api/', '/api/');

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Reference Shim] Routing via internal proxy:', target);
  }

  const resp = await fetch(target, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
  });
}
