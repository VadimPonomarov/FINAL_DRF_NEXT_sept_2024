import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * POST /api/ads/moderation/[ad_id]/activate
 * Proxy to backend: /api/ads/cars/moderation/[ad_id]/activate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ad_id: string } }
) {
  try {
    const { ad_id } = params;
    const body = await request.json();
    console.log('[Activate Ad API] Activating ad:', ad_id, 'with data:', body);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/${ad_id}/activate`;

    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Activate Ad API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Activate Ad API] Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to activate ad', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Activate Ad API] Success');

    // Преобразуем формат в ожидаемый frontend формат
    const responseData = {
      success: true,
      message: data.message || 'Advertisement activated successfully',
      ad: data.ad
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[Activate Ad API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

