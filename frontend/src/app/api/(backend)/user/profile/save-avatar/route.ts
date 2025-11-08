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

      console.log('[User Save Avatar API] 🔄 Saving avatar URL to profile...');
      console.log('[User Save Avatar API] 🌐 Backend URL:', backendUrl);
      console.log('[User Save Avatar API] 🖼️ Avatar URL to download:', requestData.avatar_url);

      // Add timeout for download request (60 seconds for image download)
      const DOWNLOAD_TIMEOUT_MS = 60000;
      const downloadController = new AbortController();
      const downloadTimeoutId = setTimeout(() => downloadController.abort(), DOWNLOAD_TIMEOUT_MS);

      let downloadResponse: Response;
      try {
        // First, download and save the image locally on the backend
        downloadResponse = await ServerAuthManager.authenticatedFetch(
          request,
          `${backendUrl}/api/users/profile/download-avatar/`,
          {
            method: 'POST',
            body: JSON.stringify({
              image_url: requestData.avatar_url
            }),
            signal: downloadController.signal,
          }
        );
        clearTimeout(downloadTimeoutId);
      } catch (downloadError) {
        clearTimeout(downloadTimeoutId);
        
        if (downloadError instanceof Error && downloadError.name === 'AbortError') {
          console.error('[Save Avatar API] ❌ Download request timeout');
          return NextResponse.json(
            { error: 'Download request timed out. The image may be too large or the server is slow.' },
            { status: 504 }
          );
        }
        throw downloadError;
      }

      console.log('[Save Avatar API] 📥 Download response status:', downloadResponse.status);

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        console.error('[Save Avatar API] ❌ Failed to download avatar:', downloadResponse.status, errorText);
        return NextResponse.json(
          { error: `Failed to download avatar: ${errorText}` },
          { status: downloadResponse.status }
        );
      }

      const downloadResult = await downloadResponse.json();
      console.log('[Save Avatar API] 📦 Download result:', downloadResult);
      const localAvatarUrl = downloadResult.local_url;

      console.log('[Save Avatar API] ✅ Avatar downloaded and saved locally:', localAvatarUrl);

      // Add timeout for profile update request (30 seconds)
      const UPDATE_TIMEOUT_MS = 30000;
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => updateController.abort(), UPDATE_TIMEOUT_MS);

      let response: Response;
      try {
        // Now update the profile with the local URL
        response = await ServerAuthManager.authenticatedFetch(
          request,
          `${backendUrl}/api/users/profile/`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              profile: {
                avatar_url: localAvatarUrl
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

// Increase max duration for this route to handle image downloads
export const maxDuration = 90; // 90 seconds to handle image download + profile update
