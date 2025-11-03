import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * POST /api/ads/moderation/[ad_id]/reject
 * Proxy to backend: /api/ads/cars/moderation/[ad_id]/reject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ad_id: string } }
) {
  try {
    const { ad_id } = params;
    const body = await request.json();
    console.log('[Reject Ad API] Rejecting ad:', ad_id, 'with reason:', body);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/${ad_id}/reject`;

    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Reject Ad API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Reject Ad API] Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to reject ad', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Reject Ad API] Success');

    // Преобразуем формат в ожидаемый frontend формат
    const responseData = {
      success: true,
      message: data.message || 'Advertisement rejected successfully',
      ad: data.ad
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[Reject Ad API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

