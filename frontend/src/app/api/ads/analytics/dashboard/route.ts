import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

// GET /api/ads/analytics/dashboard
export async function GET(request: NextRequest) {
  try {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const qs = request.nextUrl.searchParams.toString();
    const url = `${backendBase}/api/ads/analytics/dashboard/${qs ? `?${qs}` : ''}`;

    const origin = request.nextUrl.origin;
    const authHeaders = await getAuthorizationHeaders(origin);

    const resp = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', ...authHeaders }, cache: 'no-store' });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Proxy error' }, { status: 500 });
  }
}

