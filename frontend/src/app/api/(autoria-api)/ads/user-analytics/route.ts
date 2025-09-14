import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Analytics API] 👤 Getting REAL personal user analytics from Django...');

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'uk';

    console.log('[User Analytics API] 🔍 Locale:', locale);

    // Получаем РЕАЛЬНУЮ персональную аналитику с Django
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/ads/statistics/user/?locale=${locale}`;

    console.log('[User Analytics API] 🔍 Trying Django backend:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication headers when user auth is implemented
        },
        signal: AbortSignal.timeout(30000)
      });

      console.log('[User Analytics API] 🔍 Django response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[User Analytics API] ✅ Got REAL Django user analytics:', result.source);

        return NextResponse.json({
          success: true,
          data: result.data,
          source: result.source,
          locale: locale,
          message: 'Реальные данные пользователя из PostgreSQL'
        });
      } else {
        const errorText = await response.text();
        console.log('[User Analytics API] ❌ Django failed:', response.status, errorText);

        // FALLBACK: Возвращаем базовые данные для устойчивости
        console.log('[User Analytics API] 🔄 Using fallback data for stability');

        return NextResponse.json({
          success: true,
          data: {
            user_id: 1,
            overview: {
              total_ads: 0,
              active_ads: 0,
              sold_ads: 0,
              inactive_ads: 0,
              total_views: 0,
              unique_views: 0,
              conversion_rate: 0.0,
              avg_views_per_ad: 0.0
            },
            recommendations: [
              {
                type: 'info',
                title: 'Добро пожаловать!',
                description: 'Создайте первое объявление, чтобы увидеть аналитику',
                priority: 'info'
              }
            ],
            performance_metrics: {
              ads_with_views: 0,
              view_rate: 0.0,
              engagement_score: 0,
              activity_score: 0
            },
            generated_at: new Date().toISOString(),
            locale: locale
          },
          source: 'fallback_stable',
          locale: locale,
          message: 'Fallback данные для устойчивости системы'
        });
      }
    } catch (error) {
      console.log('[User Analytics API] ❌ Django connection error:', error);

      // FALLBACK: Возвращаем базовые данные для устойчивости
      console.log('[User Analytics API] 🔄 Using fallback data due to connection error');

      return NextResponse.json({
        success: true,
        data: {
          user_id: 1,
          overview: {
            total_ads: 0,
            active_ads: 0,
            sold_ads: 0,
            inactive_ads: 0,
            total_views: 0,
            unique_views: 0,
            conversion_rate: 0.0,
            avg_views_per_ad: 0.0
          },
          recommendations: [
            {
              type: 'info',
              title: 'Система временно недоступна',
              description: 'Попробуйте обновить страницу через несколько секунд',
              priority: 'info'
            }
          ],
          performance_metrics: {
            ads_with_views: 0,
            view_rate: 0.0,
            engagement_score: 0,
            activity_score: 0
          },
          generated_at: new Date().toISOString(),
          locale: locale
        },
        source: 'fallback_error',
        locale: locale,
        message: 'Fallback данные из-за ошибки подключения'
      });
    }


  } catch (error: any) {
    console.error('[User Analytics API] ❌ Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Произошла ошибка при получении персональной аналитики'
    }, { status: 500 });
  }
}
