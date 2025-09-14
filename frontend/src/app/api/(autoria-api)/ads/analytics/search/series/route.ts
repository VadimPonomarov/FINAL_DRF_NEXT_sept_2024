import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => { params[k] = v; });

    // Proxy to backend internal domain
    const data = await fetchData('api/ads/analytics/search/series/', {
      method: 'GET',
      params,
      redirectOnError: false,
      domain: 'external',
    });

    if (!data) {
      return NextResponse.json({ success: false, error: 'No data' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

