import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

// Proxy for backend ads item operations
// PATCH /api/ads/[id]/ → PATCH {backend}/api/ads/{id}/
// DELETE /api/ads/[id]/ → DELETE {backend}/api/ads/{id}/

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const body = await request.json().catch(() => ({}));

    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/cars/${params.id}/update`,
      { method: 'PATCH', body: JSON.stringify(body) }
    );

    const text = await resp.text();
    return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update ad' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/cars/${params.id}/delete`,
      { method: 'DELETE' }
    );
    return new NextResponse(null, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete ad' }, { status: 500 });
  }
}


