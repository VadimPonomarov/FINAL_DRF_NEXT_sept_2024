import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * POST /api/ads/analytics/track/phone-view/
 * Proxy to backend: /api/ads/analytics/track/
 * Tracks phone number views for ads
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Phone View Tracking API] Recording phone view:', body);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/analytics/track/`;

    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log('[Phone View Tracking API] Backend response status:', backendResponse.status);

    // Tracking is not critical - return success even if backend fails
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.warn('[Phone View Tracking API] Backend tracking failed (non-critical):', errorText);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Phone view recorded (tracking failed but ignored)' 
      });
    }

    const data = await backendResponse.json();
    console.log('[Phone View Tracking API] Successfully tracked phone view');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Phone View Tracking API] Error (non-critical):', error);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Phone view recorded (tracking error but ignored)' 
    });
  }
}
