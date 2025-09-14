import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Statistics API] 📊 Getting ad statistics...');

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('ad_id');

    if (!adId) {
      return NextResponse.json({
        success: false,
        error: 'Ad ID is required'
      }, { status: 400 });
    }

    console.log('[Statistics API] 🔄 Fetching statistics for ad:', adId);

    // Отправляем запрос на backend для получения статистики
    const result = await fetchData(`api/ads/cars/${adId}/statistics`, {
      redirectOnError: false
    });

    if (!result) {
      console.log('[Statistics API] ❌ No statistics data from backend');
      return NextResponse.json({
        success: false,
        error: 'No statistics available',
        message: 'Статистика недоступна для этого объявления'
      }, { status: 404 });
    }

    console.log('[Statistics API] ✅ Statistics fetched successfully:', {
      adId,
      hasViews: !!result.views,
      hasPricing: !!result.pricing
    });

    // Возвращаем статистику в стандартном формате
    return NextResponse.json({
      success: true,
      data: {
        ad_id: parseInt(adId),
        title: result.title || 'Объявление',
        is_premium: result.is_premium || false,
        views: result.views || null,
        pricing: result.pricing || null,
        recommendations: result.recommendations || [],
        last_updated: result.last_updated || new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Statistics API] ❌ Error fetching statistics:', error);

    // Обрабатываем различные типы ошибок от backend
    if (error.response) {
      const errorData = error.response.data;
      
      // Нет доступа к статистике (базовый аккаунт)
      if (error.response.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'Access denied',
          message: 'Статистика доступна только для Премиум аккаунтов',
          upgrade_required: true
        }, { status: 403 });
      }
      
      // Объявление не найдено
      if (error.response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Ad not found',
          message: 'Объявление не найдено'
        }, { status: 404 });
      }
      
      // Аутентификация
      if (error.response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          message: 'Необходимо войти в систему'
        }, { status: 401 });
      }
    }

    // Общая ошибка
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
