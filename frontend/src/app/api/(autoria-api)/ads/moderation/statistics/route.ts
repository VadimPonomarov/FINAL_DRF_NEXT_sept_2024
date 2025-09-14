import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Moderation Statistics API] 📊 Getting moderation statistics...');

    // Отправляем запрос на backend для получения статистики модерации
    const result = await fetchData('api/ads/cars/moderation/statistics', {
      redirectOnError: false
    });

    if (!result) {
      console.log('[Moderation Statistics API] ❌ No statistics from backend');
      return NextResponse.json({
        success: false,
        error: 'No statistics available',
        message: 'Статистика модерации недоступна'
      }, { status: 404 });
    }

    console.log('[Moderation Statistics API] ✅ Statistics fetched successfully:', result);

    // Возвращаем статистику в стандартном формате
    return NextResponse.json({
      success: true,
      data: {
        total_ads: result.total_ads || 0,
        pending_moderation: result.pending_moderation || 0,
        needs_review: result.needs_review || 0,
        rejected: result.rejected || 0,
        active: result.active || 0,
        today_moderated: result.today_moderated || 0
      }
    });

  } catch (error: any) {
    console.error('[Moderation Statistics API] ❌ Error fetching statistics:', error);

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
          message: 'Нет прав доступа к статистике модерации'
        }, { status: 403 });
      }
    }

    // Общая ошибка
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Ошибка загрузки статистики',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
