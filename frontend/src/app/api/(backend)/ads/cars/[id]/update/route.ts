import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const backendBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendBase}/api/ads/cars/${id}/update`;

    // Read JSON body explicitly
    let body: any = undefined;
    try {
      body = await request.json();
    } catch {
      body = undefined; // allow PATCH with no body
    }

    // Get auth headers (reads token from Redis if available)
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const resp = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });

    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text();

    return NextResponse.json(data as any, { status: resp.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
