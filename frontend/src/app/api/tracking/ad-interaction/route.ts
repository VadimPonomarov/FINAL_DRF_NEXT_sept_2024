import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * POST /api/tracking/ad-interaction/
 * Proxy to backend: /api/ads/analytics/track/
 * Tracks user interactions with ads (favorite_add, favorite_remove, phone_view, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Tracking API] Recording ad interaction:', body);

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

    console.log('[Tracking API] Backend response status:', backendResponse.status);

    // Tracking is not critical - return success even if backend fails
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.warn('[Tracking API] Backend tracking failed (non-critical):', errorText);
      
      // Return success anyway - tracking failures shouldn't block user actions
      return NextResponse.json({ 
        success: true, 
        message: 'Interaction recorded (tracking failed but ignored)' 
      });
    }

    const data = await backendResponse.json();
    console.log('[Tracking API] Successfully tracked interaction');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Tracking API] Error (non-critical):', error);
    
    // Return success anyway - tracking failures shouldn't block user actions
    return NextResponse.json({ 
      success: true, 
      message: 'Interaction recorded (tracking error but ignored)' 
    });
  }
}
