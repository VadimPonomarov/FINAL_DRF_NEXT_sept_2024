import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function PATCH(request: NextRequest) {
  try {
    console.log('[User Save Avatar API] 💾 Starting avatar save...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Save Avatar API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from token
    const userId = await ServerAuthManager.getUserId(request);
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

      // First, download and save the image locally on the backend
      const downloadResponse = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/users/profile/download-avatar/`,
        {
          method: 'POST',
          body: JSON.stringify({
            image_url: requestData.avatar_url
          })
        }
      );

      if (!downloadResponse.ok) {
        console.error('[Save Avatar API] ❌ Failed to download avatar:', downloadResponse.status);
        return NextResponse.json(
          { error: 'Failed to download avatar' },
          { status: downloadResponse.status }
        );
      }

      const downloadResult = await downloadResponse.json();
      const localAvatarUrl = downloadResult.local_url;

      console.log('[Save Avatar API] ✅ Avatar downloaded and saved locally:', localAvatarUrl);

      // Now update the profile with the local URL
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/users/profile/`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            profile: {
              avatar_url: localAvatarUrl
            }
          })
        }
      );

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
