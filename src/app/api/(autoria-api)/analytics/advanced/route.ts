import { NextRequest, NextResponse } from 'next/server';
import { analyticsCache, CacheUtils } from '@/lib/analytics/cache';
import { forecast, analyzePriceTrends } from '@/lib/analytics/forecasting';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsQuery {
  period: '7d' | '30d' | '90d' | '1y';
  metrics: string[];
  region?: string;
  brand?: string;
  category?: string;
  include_forecast?: boolean;
  include_comparison?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query: AnalyticsQuery = {
      period: (searchParams.get('period') as any) || '30d',
      metrics: searchParams.get('metrics')?.split(',') || ['users', 'ads', 'views'],
      region: searchParams.get('region') || undefined,
      brand: searchParams.get('brand') || undefined,
      category: searchParams.get('category') || undefined,
      include_forecast: searchParams.get('include_forecast') === 'true',
      include_comparison: searchParams.get('include_comparison') === 'true'
    };

    console.log('[Advanced Analytics API] 📊 Processing request:', query);

    // Генерируем ключ кеша
    const cacheKey = CacheUtils.generateKey('advanced_analytics', query);

    // Пытаемся получить из кеша
    const cachedResult = await analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log('[Advanced Analytics API] ⚡ Returning cached data');
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true,
        generated_at: new Date().toISOString()
      });
    }

    // Определяем период
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[query.period];

    // Генерируем данные (в реальном приложении здесь были бы запросы к БД)
    const analyticsData = await generateAdvancedAnalytics(query, periodDays);

    // Сохраняем в кеш
    await analyticsCache.set(cacheKey, analyticsData, 300); // 5 минут

    console.log('[Advanced Analytics API] ✅ Generated and cached analytics data');

    return NextResponse.json({
      success: true,
      data: analyticsData,
      cached: false,
      generated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Advanced Analytics API] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Произошла ошибка при получении расширенной аналитики'
    }, { status: 500 });
  }
}

async function generateAdvancedAnalytics(query: AnalyticsQuery, periodDays: number) {
  const endDate = new Date();
  const startDate = subDays(endDate, periodDays);

  // Генерируем временные ряды
  const timeSeries = generateTimeSeriesData(startDate, endDate, query);

  // KPI метрики
  const kpiMetrics = calculateKPIMetrics(timeSeries, query);

  // Сравнительная аналитика
  let comparison = null;
  if (query.include_comparison) {
    const prevStartDate = subDays(startDate, periodDays);
    const prevEndDate = subDays(endDate, periodDays);
    const prevTimeSeries = generateTimeSeriesData(prevStartDate, prevEndDate, query);
    comparison = calculateComparison(timeSeries, prevTimeSeries);
  }

  // Прогнозы
  let forecasts = null;
  if (query.include_forecast) {
    forecasts = generateForecasts(timeSeries, query);
  }

  // Распределение по категориям
  const distributions = generateDistributions(query);

  // Региональная аналитика
  const regionalData = generateRegionalData(query);

  // Анализ трендов
  const trends = analyzeTrends(timeSeries);

  // Топ-метрики
  const topMetrics = generateTopMetrics(query);

  return {
    period: query.period,
    date_range: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    },
    filters: {
      region: query.region,
      brand: query.brand,
      category: query.category
    },
    kpi: kpiMetrics,
    time_series: timeSeries,
    comparison,
    forecasts,
    distributions,
    regional: regionalData,
    trends,
    top_metrics: topMetrics,
    metadata: {
      total_data_points: timeSeries.length,
      metrics_included: query.metrics,
      has_forecasts: !!forecasts,
      has_comparison: !!comparison,
      cache_ttl: 300
    }
  };
}

function generateTimeSeriesData(startDate: Date, endDate: Date, query: AnalyticsQuery) {
  const data = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 0.7 : 1;
    
    // Базовые значения с учетом фильтров
    let baseUsers = 1000;
    let baseAds = 400;
    let baseViews = 8000;
    let baseRevenue = 50000;

    // Применяем фильтры
    if (query.region) {
      const regionMultipliers: Record<string, number> = {
        'kyiv': 1.5,
        'kharkiv': 1.2,
        'odesa': 1.1,
        'dnipro': 1.0,
        'lviv': 0.9
      };
      const multiplier = regionMultipliers[query.region.toLowerCase()] || 1;
      baseUsers *= multiplier;
      baseAds *= multiplier;
      baseViews *= multiplier;
      baseRevenue *= multiplier;
    }

    if (query.brand) {
      const brandMultipliers: Record<string, number> = {
        'toyota': 1.3,
        'bmw': 1.4,
        'mercedes': 1.2,
        'audi': 1.1,
        'volkswagen': 1.0
      };
      const multiplier = brandMultipliers[query.brand.toLowerCase()] || 1;
      baseAds *= multiplier;
      baseViews *= multiplier;
      baseRevenue *= multiplier;
    }

    // Добавляем случайность и тренды
    const trendMultiplier = 1 + Math.random() * 0.1;
    const seasonalMultiplier = 1 + Math.sin(currentDate.getTime() / (1000 * 60 * 60 * 24 * 7)) * 0.1;

    data.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      users: Math.floor(baseUsers * weekendMultiplier * trendMultiplier * seasonalMultiplier + Math.random() * 200 - 100),
      ads: Math.floor(baseAds * weekendMultiplier * trendMultiplier * seasonalMultiplier + Math.random() * 80 - 40),
      views: Math.floor(baseViews * weekendMultiplier * trendMultiplier * seasonalMultiplier + Math.random() * 1600 - 800),
      revenue: Math.floor(baseRevenue * weekendMultiplier * trendMultiplier * seasonalMultiplier + Math.random() * 10000 - 5000),
      conversions: Math.floor(baseAds * 0.03 * weekendMultiplier * trendMultiplier + Math.random() * 5 - 2.5),
      avg_price: Math.floor(280000 + Math.random() * 40000 - 20000),
      new_users: Math.floor(baseUsers * 0.15 * weekendMultiplier * trendMultiplier + Math.random() * 30 - 15),
      active_users: Math.floor(baseUsers * 0.6 * weekendMultiplier * trendMultiplier + Math.random() * 100 - 50)
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

function calculateKPIMetrics(timeSeries: any[], query: AnalyticsQuery) {
  const totals = timeSeries.reduce((acc, day) => {
    acc.users += day.users;
    acc.ads += day.ads;
    acc.views += day.views;
    acc.revenue += day.revenue;
    acc.conversions += day.conversions;
    acc.new_users += day.new_users;
    acc.active_users += day.active_users;
    return acc;
  }, {
    users: 0, ads: 0, views: 0, revenue: 0, 
    conversions: 0, new_users: 0, active_users: 0
  });

  const avgPrice = timeSeries.reduce((sum, day) => sum + day.avg_price, 0) / timeSeries.length;
  const conversionRate = totals.ads > 0 ? (totals.conversions / totals.ads) * 100 : 0;
  const revenuePerUser = totals.users > 0 ? totals.revenue / totals.users : 0;
  const viewsPerAd = totals.ads > 0 ? totals.views / totals.ads : 0;

  return {
    total_users: totals.users,
    total_ads: totals.ads,
    total_views: totals.views,
    total_revenue: totals.revenue,
    total_conversions: totals.conversions,
    new_users: totals.new_users,
    active_users: Math.floor(totals.active_users / timeSeries.length), // Среднее за период
    avg_price: Math.floor(avgPrice),
    conversion_rate: Math.round(conversionRate * 100) / 100,
    revenue_per_user: Math.floor(revenuePerUser),
    views_per_ad: Math.round(viewsPerAd * 100) / 100,
    daily_averages: {
      users: Math.floor(totals.users / timeSeries.length),
      ads: Math.floor(totals.ads / timeSeries.length),
      views: Math.floor(totals.views / timeSeries.length),
      revenue: Math.floor(totals.revenue / timeSeries.length)
    }
  };
}

function calculateComparison(current: any[], previous: any[]) {
  const currentTotals = current.reduce((acc, day) => {
    acc.users += day.users;
    acc.ads += day.ads;
    acc.views += day.views;
    acc.revenue += day.revenue;
    return acc;
  }, { users: 0, ads: 0, views: 0, revenue: 0 });

  const previousTotals = previous.reduce((acc, day) => {
    acc.users += day.users;
    acc.ads += day.ads;
    acc.views += day.views;
    acc.revenue += day.revenue;
    return acc;
  }, { users: 0, ads: 0, views: 0, revenue: 0 });

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    users: {
      current: currentTotals.users,
      previous: previousTotals.users,
      change: Math.round(calculateChange(currentTotals.users, previousTotals.users) * 100) / 100,
      trend: currentTotals.users > previousTotals.users ? 'up' : 'down'
    },
    ads: {
      current: currentTotals.ads,
      previous: previousTotals.ads,
      change: Math.round(calculateChange(currentTotals.ads, previousTotals.ads) * 100) / 100,
      trend: currentTotals.ads > previousTotals.ads ? 'up' : 'down'
    },
    views: {
      current: currentTotals.views,
      previous: previousTotals.views,
      change: Math.round(calculateChange(currentTotals.views, previousTotals.views) * 100) / 100,
      trend: currentTotals.views > previousTotals.views ? 'up' : 'down'
    },
    revenue: {
      current: currentTotals.revenue,
      previous: previousTotals.revenue,
      change: Math.round(calculateChange(currentTotals.revenue, previousTotals.revenue) * 100) / 100,
      trend: currentTotals.revenue > previousTotals.revenue ? 'up' : 'down'
    }
  };
}

function generateForecasts(timeSeries: any[], query: AnalyticsQuery) {
  const forecastPeriods = 7; // 7 дней прогноза

  const usersForecast = forecast(
    timeSeries.map(d => ({ date: d.date, value: d.users })),
    { periods: forecastPeriods, method: 'linear' }
  );

  const adsForecast = forecast(
    timeSeries.map(d => ({ date: d.date, value: d.ads })),
    { periods: forecastPeriods, method: 'exponential' }
  );

  const viewsForecast = forecast(
    timeSeries.map(d => ({ date: d.date, value: d.views })),
    { periods: forecastPeriods, method: 'seasonal', seasonality: 7 }
  );

  return {
    users: usersForecast,
    ads: adsForecast,
    views: viewsForecast,
    forecast_period: forecastPeriods,
    confidence_level: 0.95
  };
}

function generateDistributions(query: AnalyticsQuery) {
  // Распределение по брендам
  const brands = [
    { name: 'Toyota', value: 2340, percentage: 23.4, color: '#3b82f6' },
    { name: 'BMW', value: 1890, percentage: 18.9, color: '#ef4444' },
    { name: 'Mercedes', value: 1650, percentage: 16.5, color: '#10b981' },
    { name: 'Audi', value: 1420, percentage: 14.2, color: '#f59e0b' },
    { name: 'Volkswagen', value: 1280, percentage: 12.8, color: '#8b5cf6' },
    { name: 'Другие', value: 1420, percentage: 14.2, color: '#6b7280' }
  ];

  // Распределение по ценовым категориям
  const priceRanges = [
    { name: 'До 100к', value: 1200, percentage: 15.0 },
    { name: '100к-300к', value: 3200, percentage: 40.0 },
    { name: '300к-500к', value: 2400, percentage: 30.0 },
    { name: '500к-1М', value: 800, percentage: 10.0 },
    { name: 'Свыше 1М', value: 400, percentage: 5.0 }
  ];

  // Распределение по годам выпуска
  const years = [
    { name: '2020-2024', value: 1800, percentage: 22.5 },
    { name: '2015-2019', value: 2800, percentage: 35.0 },
    { name: '2010-2014', value: 2000, percentage: 25.0 },
    { name: '2005-2009', value: 1000, percentage: 12.5 },
    { name: 'До 2005', value: 400, percentage: 5.0 }
  ];

  return {
    brands,
    price_ranges: priceRanges,
    years,
    total_ads: brands.reduce((sum, b) => sum + b.value, 0)
  };
}

function generateRegionalData(query: AnalyticsQuery) {
  return [
    { region: 'Киев', ads: 3450, users: 5200, avg_price: 320000, growth: 12.5 },
    { region: 'Харьков', ads: 2340, users: 3800, avg_price: 280000, growth: 8.3 },
    { region: 'Одесса', ads: 1890, users: 3200, avg_price: 290000, growth: 15.2 },
    { region: 'Днепр', ads: 1650, users: 2900, avg_price: 275000, growth: 6.7 },
    { region: 'Львов', ads: 1420, users: 2600, avg_price: 285000, growth: 9.8 }
  ];
}

function analyzeTrends(timeSeries: any[]) {
  const recentData = timeSeries.slice(-7); // Последние 7 дней
  const previousData = timeSeries.slice(-14, -7); // Предыдущие 7 дней

  const calculateTrend = (recent: number[], previous: number[]) => {
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
      change: Math.round(change * 100) / 100,
      strength: Math.abs(change) > 10 ? 'strong' : Math.abs(change) > 5 ? 'moderate' : 'weak'
    };
  };

  return {
    users: calculateTrend(
      recentData.map(d => d.users),
      previousData.map(d => d.users)
    ),
    ads: calculateTrend(
      recentData.map(d => d.ads),
      previousData.map(d => d.ads)
    ),
    views: calculateTrend(
      recentData.map(d => d.views),
      previousData.map(d => d.views)
    ),
    revenue: calculateTrend(
      recentData.map(d => d.revenue),
      previousData.map(d => d.revenue)
    )
  };
}

function generateTopMetrics(query: AnalyticsQuery) {
  return {
    top_brands: [
      { name: 'Toyota Camry', ads: 234, views: 12450, avg_price: 450000 },
      { name: 'BMW X5', ads: 189, views: 15600, avg_price: 850000 },
      { name: 'Mercedes C-Class', ads: 167, views: 11200, avg_price: 720000 },
      { name: 'Audi A4', ads: 145, views: 9800, avg_price: 680000 },
      { name: 'VW Passat', ads: 134, views: 8900, avg_price: 380000 }
    ],
    top_regions: [
      { name: 'Киев', ads: 3450, growth: 12.5 },
      { name: 'Харьков', ads: 2340, growth: 8.3 },
      { name: 'Одесса', ads: 1890, growth: 15.2 },
      { name: 'Днепр', ads: 1650, growth: 6.7 },
      { name: 'Львов', ads: 1420, growth: 9.8 }
    ],
    fastest_growing: [
      { category: 'Электромобили', growth: 45.2, ads: 234 },
      { category: 'Гибриды', growth: 32.1, ads: 456 },
      { category: 'Кроссоверы', growth: 18.7, ads: 1234 },
      { category: 'Седаны', growth: 12.3, ads: 2345 },
      { category: 'Хэтчбеки', growth: 8.9, ads: 1567 }
    ]
  };
}
