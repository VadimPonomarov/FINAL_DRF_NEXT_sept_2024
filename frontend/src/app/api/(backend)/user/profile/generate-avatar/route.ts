import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

export async function POST(request: NextRequest) {
  try {
    console.log('[User Generate Avatar API] 🎨 Starting avatar generation...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Generate Avatar API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from token
    const userId = await ServerAuthManager.getUserId(request);
    if (!userId) {
      console.log('[User Generate Avatar API] ❌ Could not get user ID');
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
      console.log('[User Generate Avatar API] 📝 Avatar generation data:', requestData);

      console.log('[User Generate Avatar API] 🔄 Sending authenticated request to backend...');

      // Use ServerAuthManager to make authenticated request
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/users/profile/generate-avatar/`,
        {
          method: 'POST',
          body: JSON.stringify(requestData)
        }
      );

      console.log('[User Generate Avatar API] 📥 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[User Generate Avatar API] ❌ Backend error:', errorText);
        throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[User Generate Avatar API] ✅ Avatar generated successfully');
      console.log('[User Generate Avatar API] 🖼️ Avatar URL:', result.avatar_url);

      return NextResponse.json(result);

    } catch (backendError) {
      console.error('[User Generate Avatar API] ❌ Backend request failed:', backendError);
      return NextResponse.json(
        { 
          success: false,
          error: backendError instanceof Error ? backendError.message : 'Failed to generate avatar' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[User Generate Avatar API] ❌ General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate avatar' 
      },
      { status: 500 }
    );
  }
}
