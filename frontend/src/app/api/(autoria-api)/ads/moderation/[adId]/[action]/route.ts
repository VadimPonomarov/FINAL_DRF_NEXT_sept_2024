import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

interface RouteParams {
  params: {
    adId: string;
    action: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { adId, action } = params;
    
    console.log(`[Moderation ${action.toUpperCase()} API] 📤 Processing ad ${adId}...`);

    // Валидация действия
    const validActions = ['approve', 'reject', 'review', 'block', 'activate'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
        message: 'Недопустимое действие'
      }, { status: 400 });
    }

    // Получаем данные из тела запроса
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';
    const moderatorNotes = body.moderator_notes || '';

    // Валидация для действий, требующих причину
    if ((action === 'reject' || action === 'block') && !reason) {
      const actionMessages = {
        reject: 'отклонения',
        block: 'блокировки'
      };
      return NextResponse.json({
        success: false,
        error: 'Reason required',
        message: `Необходимо указать причину ${actionMessages[action as keyof typeof actionMessages]}`
      }, { status: 400 });
    }

    console.log(`[Moderation ${action.toUpperCase()} API] 🔄 Sending to backend:`, {
      endpoint: `api/ads/cars/moderation/${adId}/${action}`,
      reason,
      moderatorNotes
    });

    // Отправляем запрос на backend
    const result = await fetchData(`api/ads/cars/moderation/${adId}/${action}`, {
      method: 'POST',
      body: {
        reason,
        moderator_notes: moderatorNotes
      },
      redirectOnError: false
    });

    if (!result) {
      console.log(`[Moderation ${action.toUpperCase()} API] ❌ No result from backend`);
      return NextResponse.json({
        success: false,
        error: 'Backend error',
        message: 'Ошибка обработки на сервере'
      }, { status: 500 });
    }

    console.log(`[Moderation ${action.toUpperCase()} API] ✅ Action completed successfully`);

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      message: result.message || `Объявление ${getActionMessage(action)}`,
      data: result.ad || result
    });

  } catch (error: any) {
    console.error(`[Moderation ${params.action.toUpperCase()} API] ❌ Error:`, error);

    // Обрабатываем различные типы ошибок от backend
    if (error.response) {
      const errorData = error.response.data;
      
      if (error.response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          message: 'Необходимо войти в систему'
        }, { status: 401 });
      }
      
      if (error.response.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'Access denied',
          message: 'Нет прав доступа к модерации'
        }, { status: 403 });
      }

      if (error.response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Ad not found',
          message: 'Объявление не найдено'
        }, { status: 404 });
      }
    }

    // Общая ошибка
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Ошибка обработки запроса',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'approve':
      return 'одобрено';
    case 'reject':
      return 'отклонено';
    case 'review':
      return 'отправлено на проверку';
    default:
      return 'обработано';
  }
}
