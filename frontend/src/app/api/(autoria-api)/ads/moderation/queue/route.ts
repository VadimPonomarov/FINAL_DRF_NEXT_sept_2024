import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Moderation Queue API] 📤 Getting moderation queue...');

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    const status = searchParams.get('status') || 'pending';
    const search = searchParams.get('search') || '';

    // Подготавливаем параметры для backend API
    const params: Record<string, string> = {
      page,
      page_size: pageSize,
    };

    if (status && status !== 'all') {
      params.status = status;
    }

    if (search) {
      params.search = search;
    }

    console.log('[Moderation Queue API] 🔄 Fetching from backend:', {
      endpoint: 'api/ads/cars/moderation/queue',
      params
    });

    // Отправляем запрос на backend через общий хелпер
    const result = await fetchData('api/ads/cars/moderation/queue', {
      params,
      redirectOnError: false
    });

    if (!result) {
      console.log('[Moderation Queue API] ❌ No result from backend');
      return NextResponse.json({
        success: false,
        data: [],
        total: 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    }

    console.log('[Moderation Queue API] ✅ Queue fetched successfully:', {
      total: result.total || result.results?.length || 0,
      page: parseInt(page)
    });

    // Возвращаем результат в стандартном формате
    return NextResponse.json({
      success: true,
      data: result.results || result,
      total: result.total || result.length || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: !!result.next
    });

  } catch (error: any) {
    console.error('[Moderation Queue API] ❌ Error fetching queue:', error);

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
    }

    // Общая ошибка
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
