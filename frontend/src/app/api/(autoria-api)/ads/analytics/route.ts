import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Analytics API] 📊 Getting ad analytics...');

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('ad_id');

    if (!adId) {
      return NextResponse.json({
        success: false,
        error: 'Ad ID is required'
      }, { status: 400 });
    }

    console.log('[Analytics API] 🔄 Fetching analytics for ad:', adId);

    // Отправляем запрос на backend для получения аналитики
    const result = await fetchData(`api/ads/cars/${adId}/analytics`, {
      redirectOnError: false
    });

    if (!result) {
      console.log('[Analytics API] ❌ No analytics data from backend');
      return NextResponse.json({
        success: false,
        error: 'No analytics available',
        message: 'Аналитика недоступна для этого объявления'
      }, { status: 404 });
    }

    console.log('[Analytics API] ✅ Analytics fetched successfully:', {
      adId,
      hasViews: !!result.views,
      hasPricing: !!result.pricing,
      isPremium: result.is_premium
    });

    // Возвращаем аналитику в стандартном формате
    return NextResponse.json({
      success: true,
      data: {
        ad_id: parseInt(adId),
        title: result.title || 'Объявление',
        is_premium: result.is_premium || false,
        views: result.views || null,
        pricing: result.pricing || null,
        recommendations: result.recommendations || [],
        message: result.message || null,
        last_updated: result.last_updated || new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Analytics API] ❌ Error fetching analytics:', error);

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
          message: 'Обновитесь до премиум аккаунта для просмотра аналитики'
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
      message: 'Ошибка загрузки аналитики',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
