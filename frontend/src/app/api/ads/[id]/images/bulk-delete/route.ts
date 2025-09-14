import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * API route для массового удаления всех изображений объявления
 * DELETE /api/ads/[id]/images/bulk-delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Bulk Delete Images API] 🗑️ Starting bulk delete...');

    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const adId = resolvedParams.id;

    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    console.log('[Bulk Delete Images API] 📋 Deleting all images for ad:', adId);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Используем Django bulk delete endpoint
    const deleteResponse = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/bulk-images/${adId}/delete`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delete_all: true
        })
      }
    );

    console.log('[Bulk Delete Images API] 📡 Django response status:', deleteResponse.status);

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('[Bulk Delete Images API] ❌ Django error:', deleteResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to delete images', 
        details: errorText 
      }, { status: deleteResponse.status });
    }

    const result = await deleteResponse.json();
    console.log('[Bulk Delete Images API] ✅ Bulk delete successful:', result);

    return NextResponse.json({
      success: true,
      deleted: result.deleted_count || 0,
      remaining: result.remaining_count || 0,
      message: result.message || 'Images deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Bulk Delete Images API] ❌ Error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete images', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
