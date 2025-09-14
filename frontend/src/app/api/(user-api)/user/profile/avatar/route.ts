import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function PATCH(request: NextRequest) {
  try {
    console.log('[User Avatar API] 📤 Uploading avatar...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Avatar API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from token
    const userId = await ServerAuthManager.getUserId(request);
    if (!userId) {
      console.log('[User Avatar API] ❌ Could not get user ID');
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Get form data from request
      const formData = await request.formData();

      console.log('[User Avatar API] 🔄 Uploading avatar to backend...');

      // Use ServerAuthManager to make authenticated request with file upload
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/users/profile/${userId}/avatar/`,
        {
          method: 'PATCH',
          body: formData // FormData for file upload
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[User Avatar API] ✅ Avatar uploaded successfully to backend');

      // Return the avatar URL from backend
      return NextResponse.json({
        avatar_url: result.avatar_url,
        message: 'Avatar uploaded successfully'
      });

    } catch (backendError) {
      console.error('[User Avatar API] ❌ Backend request failed:', backendError);
      return NextResponse.json(
        { error: backendError instanceof Error ? backendError.message : 'Failed to upload avatar to backend' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[User Avatar API] ❌ General error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
