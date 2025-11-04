import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

// GET /api/ads/my-ads → {backend}/api/ads/my-ads
export async function GET(request: NextRequest) {
  try {
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const normalizedBackend = rawBackend.replace(/\/+$/, '').replace(/\/api$/i, '');
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';

    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${normalizedBackend}/api/ads/cars/my${qs}`,
      { method: 'GET' }
    );

    const text = await resp.text();
    return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
  } catch (e: any) {
    console.error('[MyAds API] Error:', e?.message);
    // Return 401 if authentication failed, 500 for other errors
    const status = e?.message?.includes('authentication') || e?.message?.includes('tokens') ? 401 : 500;
    return NextResponse.json({ error: e?.message || 'Failed to load my ads' }, { status });
  }
}

