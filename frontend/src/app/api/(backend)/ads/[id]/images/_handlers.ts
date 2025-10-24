import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * Типы действий с изображениями
 */
export type ImageAction = 'bulk-delete' | 'save-generated';

/**
 * Валидные действия с изображениями
 */
export const VALID_IMAGE_ACTIONS: readonly ImageAction[] = [
  'bulk-delete',
  'save-generated'
] as const;

/**
 * Обработчик массового удаления изображений
 */
export async function handleBulkDelete(
  request: NextRequest,
  adId: string
): Promise<NextResponse> {
  try {
    console.log('[Bulk Delete Images API] 🗑️ Starting bulk delete for ad:', adId);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const deleteResponse = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/bulk-images/${adId}/delete`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_all: true })
      }
    );

    console.log('[Bulk Delete Images API] 📡 Backend response status:', deleteResponse.status);

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('[Bulk Delete Images API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete images', details: errorText },
        { status: deleteResponse.status }
      );
    }

    const result = await deleteResponse.json();
    console.log('[Bulk Delete Images API] ✅ Success:', result);

    return NextResponse.json({
      success: true,
      deleted: result.deleted_count || 0,
      remaining: result.remaining_count || 0,
      message: result.message || 'Images deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Bulk Delete Images API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Обработчик сохранения сгенерированного изображения
 */
export async function handleSaveGenerated(
  request: NextRequest,
  adId: string
): Promise<NextResponse> {
  try {
    console.log('[Save Generated Image API] 💾 Saving generated image for ad:', adId);

    const requestData = await request.json();
    console.log('[Save Generated Image API] 📝 Image data:', {
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

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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
      console.error('[Save Generated Image API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to save generated image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Save Generated Image API] ✅ Success');

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('[Save Generated Image API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to save generated image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Универсальный роутер для действий с изображениями
 */
export async function handleImageAction(
  request: NextRequest,
  adId: string,
  action: ImageAction
): Promise<NextResponse> {
  // Проверка аутентификации
  const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
  if (!isAuthenticated) {
    console.log(`[Image Action API] ❌ User not authenticated for ${action}`);
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Валидация ad ID
  if (!adId) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
  }

  // Роутинг по действию
  switch (action) {
    case 'bulk-delete':
      return handleBulkDelete(request, adId);
    case 'save-generated':
      return handleSaveGenerated(request, adId);
    default:
      return NextResponse.json(
        { error: 'Invalid action', message: `Action must be one of: ${VALID_IMAGE_ACTIONS.join(', ')}` },
        { status: 400 }
      );
  }
}

/**
 * Проверяет, является ли строка валидным действием с изображениями
 */
export function isValidImageAction(action: string): action is ImageAction {
  return VALID_IMAGE_ACTIONS.includes(action as ImageAction);
}

