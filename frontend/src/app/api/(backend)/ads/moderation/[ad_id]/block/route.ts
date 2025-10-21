import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * POST /api/ads/moderation/[ad_id]/block
 * Proxy to backend: /api/ads/cars/moderation/[ad_id]/block
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ad_id: string } }
) {
  try {
    const { ad_id } = params;
    const body = await request.json();
    console.log('[Block Ad API] Blocking ad:', ad_id, 'with reason:', body);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/${ad_id}/block`;

    const authHeaders = await getAuthorizationHeaders();

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Block Ad API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Block Ad API] Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to block ad', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Block Ad API] Success');

    // Преобразуем формат в ожидаемый frontend формат
    const responseData = {
      success: true,
      message: data.message || 'Advertisement blocked successfully',
      ad: data.ad
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[Block Ad API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

