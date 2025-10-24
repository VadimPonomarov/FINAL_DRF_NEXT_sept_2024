import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * Типы модерационных действий
 */
export type ModerationAction = 'approve' | 'reject' | 'review' | 'block' | 'activate';

/**
 * Валидные модерационные действия
 */
export const VALID_MODERATION_ACTIONS: readonly ModerationAction[] = [
  'approve',
  'reject',
  'review',
  'block',
  'activate'
] as const;

/**
 * Сообщения успеха для каждого действия
 */
const ACTION_SUCCESS_MESSAGES: Record<ModerationAction, string> = {
  approve: 'Advertisement approved successfully',
  reject: 'Advertisement rejected successfully',
  review: 'Advertisement marked for review',
  block: 'Advertisement blocked successfully',
  activate: 'Advertisement activated successfully'
};

/**
 * Названия действий для логов
 */
const ACTION_LOG_NAMES: Record<ModerationAction, string> = {
  approve: 'Approve Ad',
  reject: 'Reject Ad',
  review: 'Request Review',
  block: 'Block Ad',
  activate: 'Activate Ad'
};

/**
 * Универсальный обработчик для всех модерационных действий
 * 
 * @param request - NextRequest объект
 * @param ad_id - ID объявления
 * @param action - Модерационное действие
 * @returns NextResponse
 */
export async function handleModerationAction(
  request: NextRequest,
  ad_id: string,
  action: ModerationAction
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const logName = ACTION_LOG_NAMES[action];
    
    console.log(`[${logName} API] Processing ad:`, ad_id, 'with data:', body);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/cars/moderation/${ad_id}/${action}`;

    const authHeaders = await getAuthorizationHeaders();

    const backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    console.log(`[${logName} API] Backend response status:`, backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`[${logName} API] Backend error:`, errorText);

      return NextResponse.json(
        { error: `Failed to ${action} ad`, details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log(`[${logName} API] Success`);

    // Преобразуем формат в ожидаемый frontend формат
    const responseData = {
      success: true,
      message: data.message || ACTION_SUCCESS_MESSAGES[action],
      ad: data.ad
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    const logName = ACTION_LOG_NAMES[action];
    console.error(`[${logName} API] Error:`, error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Проверяет, является ли строка валидным модерационным действием
 */
export function isValidModerationAction(action: string): action is ModerationAction {
  return VALID_MODERATION_ACTIONS.includes(action as ModerationAction);
}

