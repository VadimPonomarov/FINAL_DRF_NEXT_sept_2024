import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Ad Images Save Generated API] 💾 Saving generated image...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[Ad Images Save Generated API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const adId = resolvedParams.id;

    if (!adId) {
      return NextResponse.json(
        { error: 'Ad ID is required' },
        { status: 400 }
      );
    }

    // Get request data
    const requestData = await request.json();
    console.log('[Ad Images Save Generated API] 📝 Generated image data:', {
      hasImageUrl: !!requestData.image_url,
      caption: requestData.caption,
      isPrimary: requestData.is_primary
    });

    if (!requestData.image_url) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      console.log(`[Ad Images Save Generated API] 🔄 Saving generated image for ad ${adId} to backend...`);

      // Use ServerAuthManager to make authenticated request
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/ads/${adId}/images/save-generated/`,
        {
          method: 'POST',
          body: JSON.stringify({
            image_url: requestData.image_url,
            caption: requestData.caption || '',
            is_primary: requestData.is_primary || false,
            order: requestData.order || 0
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Ad Images Save Generated API] ❌ Backend error:', response.status, errorText);
        throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Ad Images Save Generated API] ✅ Generated image saved successfully');

      return NextResponse.json(data, { status: 201 });

    } catch (backendError) {
      console.error('[Ad Images Save Generated API] ❌ Backend request failed:', backendError);
      return NextResponse.json(
        { error: 'Failed to save generated image to backend' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Ad Images Save Generated API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
