import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

export async function PATCH(request: NextRequest) {
  try {
    console.log('[User Save Avatar API] 💾 Starting avatar save...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    console.log('[User Save Avatar API] 🔐 Authentication check result:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('[User Save Avatar API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from token
    const userId = await ServerAuthManager.getUserId(request);
    console.log('[User Save Avatar API] 👤 User ID from token:', userId);

    if (!userId) {
      console.log('[User Save Avatar API] ❌ Could not get user ID');
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Get request data
      const requestData = await request.json();
      console.log('[User Save Avatar API] 📝 Avatar URL to save:', requestData.avatar_url);

      if (!requestData.avatar_url) {
        return NextResponse.json(
          { error: 'Avatar URL is required' },
          { status: 400 }
        );
      }

      // Store the original external URL directly — no download needed.
      // Railway filesystem is ephemeral (wiped on redeploy), and /api/image-proxy handles external URLs.
      const avatarUrlToStore: string = requestData.avatar_url;
      console.log('[Save Avatar API] ✅ Storing avatar URL:', avatarUrlToStore);

      // Add timeout for profile update request (30 seconds)
      const UPDATE_TIMEOUT_MS = 30000;
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => updateController.abort(), UPDATE_TIMEOUT_MS);

      let response: Response;
      try {
        // Update the profile with the original external URL
        response = await ServerAuthManager.authenticatedFetch(
          request,
          `${backendUrl}/api/users/profile/`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              profile: {
                avatar_url: avatarUrlToStore
              }
            }),
            signal: updateController.signal,
          }
        );
        clearTimeout(updateTimeoutId);
      } catch (updateError) {
        clearTimeout(updateTimeoutId);
        
        if (updateError instanceof Error && updateError.name === 'AbortError') {
          console.error('[User Save Avatar API] ❌ Update request timeout');
          return NextResponse.json(
            { error: 'Profile update request timed out. Please try again.' },
            { status: 504 }
          );
        }
        throw updateError;
      }

      console.log('[User Save Avatar API] 📥 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[User Save Avatar API] ❌ Backend error:', errorText);
        throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[User Save Avatar API] ✅ Avatar URL saved successfully to profile');

      return NextResponse.json({
        success: true,
        message: 'Avatar URL saved to profile',
        profile: result
      });

    } catch (backendError) {
      console.error('[User Save Avatar API] ❌ Backend request failed:', backendError);
      return NextResponse.json(
        { 
          error: backendError instanceof Error ? backendError.message : 'Failed to save avatar URL' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[User Save Avatar API] ❌ General error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save avatar URL' 
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
