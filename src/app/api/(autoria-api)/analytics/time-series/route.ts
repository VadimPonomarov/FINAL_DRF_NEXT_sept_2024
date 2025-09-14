import { NextRequest, NextResponse } from 'next/server';
import { subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const metric = searchParams.get('metric') || 'all';

    console.log('[Time Series API] 📊 Getting time series data:', { period, metric });

    // Определяем количество дней на основе периода
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[period] || 30;

    // Генерируем моковые данные временных рядов
    const generateTimeSeriesData = (days: number) => {
      const data = [];
      const baseUsers = 1000;
      const baseAds = 400;
      const baseViews = 8000;

      for (let i = days; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Добавляем некоторую случайность и тренды
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;
        const trendMultiplier = 1 + (days - i) * 0.002; // Небольшой рост со временем
        
        const users = Math.floor(
          (baseUsers + Math.random() * 200 - 100) * weekendMultiplier * trendMultiplier
        );
        const ads = Math.floor(
          (baseAds + Math.random() * 80 - 40) * weekendMultiplier * trendMultiplier
        );
        const views = Math.floor(
          (baseViews + Math.random() * 1600 - 800) * weekendMultiplier * trendMultiplier
        );

        data.push({
          date: dateStr,
          users,
          ads,
          views,
          predicted: false
        });
      }

      // Добавляем прогнозные данные (следующие 7 дней)
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const lastDataPoint = data[data.length - 1];
        const trendFactor = 1.05; // 5% рост в прогнозе
        
        data.push({
          date: dateStr,
          users: Math.floor(lastDataPoint.users * trendFactor + Math.random() * 50 - 25),
          ads: Math.floor(lastDataPoint.ads * trendFactor + Math.random() * 20 - 10),
          views: Math.floor(lastDataPoint.views * trendFactor + Math.random() * 400 - 200),
          predicted: true
        });
      }

      return data;
    };

    const timeSeriesData = generateTimeSeriesData(periodDays);

    // Вычисляем статистику изменений
    const calculateChange = (data: any[], key: string) => {
      if (data.length < 2) return 0;
      const current = data[data.length - 8]; // Последний непрогнозный день
      const previous = data[Math.max(0, data.length - 15)]; // 7 дней назад
      return ((current[key] - previous[key]) / previous[key]) * 100;
    };

    const changes = {
      users: calculateChange(timeSeriesData, 'users'),
      ads: calculateChange(timeSeriesData, 'ads'),
      views: calculateChange(timeSeriesData, 'views')
    };

    // Дополнительные метрики
    const totalUsers = timeSeriesData.reduce((sum, item) => sum + item.users, 0);
    const totalAds = timeSeriesData.reduce((sum, item) => sum + item.ads, 0);
    const totalViews = timeSeriesData.reduce((sum, item) => sum + item.views, 0);

    const response = {
      success: true,
      data: {
        timeSeries: timeSeriesData,
        summary: {
          period,
          totalUsers,
          totalAds,
          totalViews,
          changes,
          avgUsersPerDay: Math.floor(totalUsers / periodDays),
          avgAdsPerDay: Math.floor(totalAds / periodDays),
          avgViewsPerDay: Math.floor(totalViews / periodDays)
        },
        metadata: {
          generated_at: new Date().toISOString(),
          period_days: periodDays,
          has_predictions: true,
          prediction_days: 7
        }
      }
    };

    console.log('[Time Series API] ✅ Generated time series data:', {
      dataPoints: timeSeriesData.length,
      period,
      totalUsers,
      changes
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Time Series API] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Произошла ошибка при получении данных временных рядов'
    }, { status: 500 });
  }
}
