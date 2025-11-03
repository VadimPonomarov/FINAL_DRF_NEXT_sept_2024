import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * PATCH /api/ads/moderation/[ad_id]/status
 * Proxy to backend: /api/ads/admin/[ad_id]/status/update/
 * Updates the status of an advertisement (superuser only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ad_id: string } }
) {
  try {
    const { ad_id } = params;
    const body = await request.json();
    console.log('[Moderation Status API] Updating status for ad:', ad_id, 'with data:', body);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/admin/${ad_id}/status/update/`;

    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const backendResponse = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Moderation Status API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Moderation Status API] Backend error:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return NextResponse.json(
        { 
          error: 'Failed to update ad status', 
          message: errorData.message || errorData.detail || 'Failed to update status',
          details: errorData 
        },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Moderation Status API] Success:', data);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Moderation Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
