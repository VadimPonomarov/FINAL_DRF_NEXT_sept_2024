import { NextRequest, NextResponse } from 'next/server';

// Simple per-process in-memory cache with TTL
const CACHE_TTL_MS = 300_000; // 5 minutes
type CacheEntry = { body: string; contentType: string; status: number; expiresAt: number };
const globalCache = (globalThis as any).__referenceCache__ as Map<string, CacheEntry> | undefined;
const referenceCache: Map<string, CacheEntry> = globalCache || new Map<string, CacheEntry>();
if (!(globalThis as any).__referenceCache__) {
  (globalThis as any).__referenceCache__ = referenceCache;
}

// Compatibility shim: /api/public/reference/* -> internal proxy /api/proxy/ads/reference/*
// Adds in-memory caching to reduce network and improve initial render latency.
export async function GET(request: NextRequest, { params }: { params: { rest: string[] } }) {
  const rest = params.rest?.join('/') || '';
  const origin = request.nextUrl.origin;
  const target = `${origin}/api/proxy/api/ads/reference/${rest}${request.nextUrl.search}`.replace('/api/api/', '/api/');

  // Serve from cache when valid
  const now = Date.now();
  const cached = referenceCache.get(target);
  if (cached && cached.expiresAt > now) {
    return new NextResponse(cached.body, {
      status: cached.status,
      headers: {
        'Content-Type': cached.contentType || 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
      },
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Reference Shim] Routing via internal proxy:', target);
  }

  const resp = await fetch(target, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const text = await resp.text();
  const contentType = resp.headers.get('Content-Type') || 'application/json';

  // Cache only successful responses
  if (resp.ok) {
    referenceCache.set(target, {
      body: text,
      contentType,
      status: resp.status,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  return new NextResponse(text, {
    status: resp.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': resp.ok
        ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
        : 'no-store',
    },
  });
}
