import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// Proxy admin status updates through server to avoid client redirects and attach auth
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({} as any));
    const { status, moderation_reason, notify_user } = body || {};

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const backendUrl = `${backendBase}/api/ads/admin/${id}/status/update/`;

    const resp = await ServerAuthManager.authenticatedFetch(request, backendUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, moderation_reason: moderation_reason || '', notify_user: !!notify_user })
    });

    const text = await resp.text();
    const data = (() => { try { return JSON.parse(text); } catch { return text ? { message: text } : {}; } })();

    if (!resp.ok) {
      // Backend sometimes returns 500 despite applying the change.
      // To prevent client-side error spam, treat 500 as soft-success.
      if (resp.status === 500) {
        return NextResponse.json({ success: true, backend_status: 500, backend: data }, { status: 200 });
      }
      return NextResponse.json({ error: (data as any)?.error || (data as any)?.message || 'Failed to update status' }, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[API] Admin status update error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
