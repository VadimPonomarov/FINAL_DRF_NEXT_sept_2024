import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * POST /api/ads/moderation/[ad_id]/review
 * Proxy to backend: /api/ads/cars/moderation/[ad_id]/review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ad_id: string } }
) {
  try {
    const { ad_id } = params;
    console.log('[Request Review API] Requesting review for ad:', ad_id);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/${ad_id}/review`;

    const authHeaders = await getAuthorizationHeaders();

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    console.log('[Request Review API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Request Review API] Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to request review', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Request Review API] Success');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Request Review API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

