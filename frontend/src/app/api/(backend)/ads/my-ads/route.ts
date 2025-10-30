import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// GET /api/ads/my-ads → {backend}/api/ads/my-ads
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';

    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/cars/my${qs}`,
      { method: 'GET' }
    );

    const text = await resp.text();
    return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load my ads' }, { status: 500 });
  }
}

