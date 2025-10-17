import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// DELETE - удаление изображения
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    console.log('[Ad Image CRUD] 🗑️ DELETE image...');

    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: adId, imageId } = resolvedParams;

    if (!adId || !imageId) {
      return NextResponse.json({ error: 'Ad ID and Image ID are required' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/${adId}/images/${imageId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Ad Image CRUD] ❌ DELETE error:', response.status, errorText);
      return NextResponse.json({ error: errorText || 'Failed to delete image' }, { status: response.status });
    }

    console.log('[Ad Image CRUD] ✅ Image deleted successfully');
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[Ad Image CRUD] ❌ DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

// PATCH - обновление изображения (например, установка главного)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    console.log('[Ad Image CRUD] ✏️ PATCH image...');

    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: adId, imageId } = resolvedParams;

    if (!adId || !imageId) {
      return NextResponse.json({ error: 'Ad ID and Image ID are required' }, { status: 400 });
    }

    const requestData = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/${adId}/images/${imageId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Ad Image CRUD] ❌ PATCH error:', response.status, errorText);
      return NextResponse.json({ error: errorText || 'Failed to update image' }, { status: response.status });
    }

    const data = await response.json();
    console.log('[Ad Image CRUD] ✅ Image updated successfully');
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('[Ad Image CRUD] ❌ PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}
