import { NextRequest, NextResponse } from 'next/server';

// Compatibility shim: /api/public/reference/* -> backend /api/ads/reference/*
export async function GET(request: NextRequest, { params }: { params: { rest: string[] } }) {
  const rest = params.rest?.join('/') || '';
  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  // Normalize base to origin without trailing /api
  let base = raw.replace(/\/+$/, '').replace(/\/(api)\/?$/i, '');
  try {
    const u = new URL(raw);
    base = `${u.protocol}//${u.host}`; // ensure origin only
  } catch {}
  let target = `${base}/api/ads/reference/${rest}${request.nextUrl.search}`;
  // Collapse any accidental double /api/api
  target = target.replace('/api/api/', '/api/');
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Reference Shim] Proxying to:', target);
  }
  let resp = await fetch(target, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  let text = await resp.text();
  // Fallback: some setups add '/api' prefix server-side; retry without '/api' once
  if (resp.status === 404 && (text.includes('/api/api/') || true)) {
    let fallback = `${base}/ads/reference/${rest}${request.nextUrl.search}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Reference Shim] Fallback proxy to:', fallback);
    }
    const resp2 = await fetch(fallback, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    const text2 = await resp2.text();
    return new NextResponse(text2, { status: resp2.status, headers: { 'Content-Type': resp2.headers.get('Content-Type') || 'application/json' } });
  }
  return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
}
