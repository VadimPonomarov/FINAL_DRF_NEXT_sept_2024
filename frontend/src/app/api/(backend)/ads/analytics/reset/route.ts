import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * POST /api/ads/analytics/reset?ad_id=123
 * Сброс счетчиков просмотров и показов телефона для объявления
 * Доступно только владельцу объявления или суперпользователю
 */
export async function POST(request: NextRequest) {
  console.log('[Reset Counters API] 🧹 Reset counters called');
  
  try {
    const adId = request.nextUrl.searchParams.get('ad_id');
    if (!adId) {
      console.log('[Reset Counters API] ❌ Missing ad_id parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'ad_id parameter is required' 
      }, { status: 400 });
    }

    console.log('[Reset Counters API] 🎯 Resetting counters for ad:', adId);

    // Отправляем запрос в Django backend с аутентификацией
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/ads/counters/ad/${adId}/reset/`;
    
    console.log('[Reset Counters API] 🔗 Forwarding to Django:', url);

    // Выполняем аутентифицированный запрос (требуется для проверки владельца)
    const response = await ServerAuthManager.authenticatedFetch(request, url, { 
      method: 'POST' 
    });

    console.log('[Reset Counters API] 📡 Django response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reset Counters API] ❌ Django error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Backend error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('[Reset Counters API] ✅ Counters reset successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Counters reset successfully',
      data: result
    });

  } catch (error: any) {
    console.error('[Reset Counters API] ❌ Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reset counters',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
