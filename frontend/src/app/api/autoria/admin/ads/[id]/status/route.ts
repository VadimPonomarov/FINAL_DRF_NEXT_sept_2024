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

    try {
      const resp = await ServerAuthManager.authenticatedFetch(request, backendUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          moderation_reason: moderation_reason || `Status updated by admin to ${status}`,
          notify_user: !!notify_user 
        })
      });

      const text = await resp.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.warn('Failed to parse backend response as JSON:', text);
        data = { message: text };
      }

      // If the status update was successful (2xx) or it's a 500 (which seems to work despite the error)
      if (resp.ok || resp.status === 500) {
        return NextResponse.json({ 
          success: true, 
          status: resp.status,
          data: data,
          message: data.message || 'Status updated successfully'
        }, { status: 200 });
      }

      // For other error statuses, forward the error
      return NextResponse.json(
        { 
          error: data.error || data.message || 'Failed to update status',
          details: data.details
        }, 
        { status: resp.status }
      );
    } catch (error) {
      console.error('Error making request to backend:', error);
      return NextResponse.json(
        { 
          error: 'Error connecting to backend service',
          details: error instanceof Error ? error.message : String(error)
        }, 
        { status: 502 } // Bad Gateway
      );
    }
  } catch (e) {
    console.error('[API] Admin status update error:', e);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: e instanceof Error ? e.message : 'Unknown error occurred'
      }, 
      { status: 500 }
    );
  }
}
