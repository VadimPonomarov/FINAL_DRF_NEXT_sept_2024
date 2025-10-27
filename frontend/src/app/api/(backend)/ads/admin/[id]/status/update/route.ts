import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * PATCH /api/ads/admin/[id]/status/update
 * Proxy to backend: /api/ads/admin/[id]/status/update/
 * Updates the status of an advertisement (superuser only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log('[Update Ad Status API] Updating status for ad:', id, 'with data:', body);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/admin/${id}/status/update/`;

    const authHeaders = await getAuthorizationHeaders();

    const backendResponse = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Update Ad Status API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Update Ad Status API] Backend error:', errorText);

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
    console.log('[Update Ad Status API] Success:', data);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Update Ad Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

