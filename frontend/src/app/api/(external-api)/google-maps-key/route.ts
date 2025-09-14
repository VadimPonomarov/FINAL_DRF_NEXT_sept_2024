import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Google Maps Key API] 📤 Fetching Google Maps API key...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[Google Maps Key API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Use ServerAuthManager to make authenticated request to get Google Maps API key
      console.log('[Google Maps Key API] 🔄 Fetching Google Maps API key from backend...');
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/config/google-maps-key/`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }

      const keyData = await response.json();
      console.log('[Google Maps Key API] ✅ Google Maps API key fetched successfully');
      return NextResponse.json(keyData);

    } catch (error) {
      console.error('[Google Maps Key API] ❌ Backend request failed:', error);
      
      // If backend fails, return empty key
      console.log('[Google Maps Key API] 🔄 Returning empty key...');
      return NextResponse.json({ 
        api_key: null,
        available: false,
        message: 'Google Maps API key not configured'
      });
    }

  } catch (error) {
    console.error('[Google Maps Key API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Maps API key' },
      { status: 500 }
    );
  }
}
