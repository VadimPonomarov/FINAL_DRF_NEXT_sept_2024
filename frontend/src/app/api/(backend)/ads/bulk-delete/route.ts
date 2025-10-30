import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// POST /api/ads/bulk-delete { ids: number[] }
// Tries backend endpoint /api/ads/bulk-delete; if 404, falls back to per-item delete
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { ids = [] } = await request.json();

    // Try direct backend endpoint first
    const direct = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/bulk-delete`,
      { method: 'POST', body: JSON.stringify({ ids }) }
    );
    if (direct.ok || direct.status !== 404) {
      const text = await direct.text();
      return new NextResponse(text, { status: direct.status, headers: { 'Content-Type': direct.headers.get('Content-Type') || 'application/json' } });
    }

    // Fallback: delete per id
    const deleted: number[] = [];
    const failed: number[] = [];
    for (const id of ids) {
      const resp = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/ads/${id}/`,
        { method: 'DELETE' }
      );
      (resp.ok ? deleted : failed).push(id);
    }
    return NextResponse.json({ deleted_ids: deleted, failed_ids: failed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bulk delete failed' }, { status: 500 });
  }
}


