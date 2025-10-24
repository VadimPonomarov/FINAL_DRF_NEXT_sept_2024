import { NextRequest, NextResponse } from 'next/server';
import { 
  handleModerationAction, 
  isValidModerationAction,
  VALID_MODERATION_ACTIONS 
} from '../../_handlers';

/**
 * POST /api/ads/moderation/[ad_id]/[action]
 * 
 * Универсальный роутер для всех модерационных действий
 * Поддерживаемые actions: approve, reject, review, block, activate
 * 
 * Проксирует запрос к backend: /api/ads/cars/moderation/[ad_id]/[action]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ad_id: string; action: string } }
) {
  const { ad_id, action } = params;

  // Валидация action
  if (!isValidModerationAction(action)) {
    console.error('[Moderation API] Invalid action:', action);
    return NextResponse.json(
      { 
        error: 'Invalid moderation action',
        message: `Action must be one of: ${VALID_MODERATION_ACTIONS.join(', ')}`,
        received: action
      },
      { status: 400 }
    );
  }

  // Делегируем обработку универсальному хендлеру
  return handleModerationAction(request, ad_id, action);
}

