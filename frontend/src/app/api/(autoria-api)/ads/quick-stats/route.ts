import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Quick Stats API] ⚡ Getting quick statistics from backend...');

    // Пытаемся получить данные с нескольких backend эндпоинтов
    try {
      console.log('[Quick Stats API] 📊 Fetching data from multiple endpoints...');

      // Запрос 1: Основная статистика платформы
      const platformStatsPromise = fetchData('api/ads/statistics/', {
        redirectOnError: false
      });

      // Запрос 2: Статистика аккаунтов (теперь публичная)
      const accountStatsPromise = fetchData('api/accounts/admin/stats/', {
        redirectOnError: false
      });

      // Запрос 3: Быстрая статистика (если есть)
      const quickStatsPromise = fetchData('api/ads/statistics/quick/', {
        redirectOnError: false
      });

      // Выполняем все запросы параллельно
      const [platformResult, accountResult, quickResult] = await Promise.allSettled([
        platformStatsPromise,
        accountStatsPromise,
        quickStatsPromise
      ]);

      console.log('[Quick Stats API] 📊 Platform result:', platformResult.status);
      console.log('[Quick Stats API] 👥 Account result:', accountResult.status);
      console.log('[Quick Stats API] ⚡ Quick result:', quickResult.status);

      // Инициализируем данные
      let formattedData = {
        total_ads: 0,
        active_ads: 0,
        total_users: 0,
        active_users: 0,
        total_views: 0,
        premium_accounts: 0,
        today_ads: 0,
        today_views: 0,
        generated_at: new Date().toISOString()
      };

      // Обрабатываем результат платформенной статистики
      if (platformResult.status === 'fulfilled' && platformResult.value?.success && platformResult.value?.data?.platform_overview) {
        const platformData = platformResult.value.data.platform_overview;
        console.log('[Quick Stats API] ✅ Platform data:', platformData);

        formattedData.total_ads = platformData.total_ads || 0;
        formattedData.active_ads = platformData.active_ads || 0;
        formattedData.total_users = platformData.total_users || 0;
        formattedData.active_users = platformData.active_users || 0;
        formattedData.total_views = platformData.total_views || 0;
        formattedData.premium_accounts = platformData.premium_accounts || 0;
        formattedData.generated_at = platformResult.value.data.generated_at || formattedData.generated_at;
      }

      // Обрабатываем результат статистики аккаунтов (теперь публичной)
      if (accountResult.status === 'fulfilled' && accountResult.value) {
        console.log('[Quick Stats API] 📊 Raw account result:', accountResult.value);

        const accountData = accountResult.value.data || accountResult.value;
        const accountTypes = accountData?.account_types;

        console.log('[Quick Stats API] ✅ Account types data:', accountTypes);

        if (accountTypes) {
          const premiumCount = accountTypes.PREMIUM || accountTypes.premium || 0;
          console.log('[Quick Stats API] 👥 Premium accounts found:', premiumCount);

          formattedData.premium_accounts = premiumCount;

          if (accountData?.total_accounts) {
            formattedData.total_users = accountData.total_accounts;
          }
        }
      } else {
        console.log('[Quick Stats API] ⚠️ Account result failed:', accountResult.status);
      }

      // Обрабатываем результат быстрой статистики (дополнительные данные)
      if (quickResult.status === 'fulfilled' && quickResult.value?.success && quickResult.value?.data) {
        const quickData = quickResult.value.data;
        console.log('[Quick Stats API] ✅ Quick data:', quickData);

        // Дополняем данными, которых может не быть в основной статистике
        formattedData.today_ads = quickData.today_ads || formattedData.today_ads;
        formattedData.today_views = quickData.today_views || formattedData.today_views;
      }

      console.log('[Quick Stats API] 🎯 Final combined data:', formattedData);

      return NextResponse.json({
        success: true,
        data: formattedData,
        source: 'backend_combined_analytics',
        message: 'Данные получены с backend (комбинированная статистика)',
        sources_used: {
          platform: platformResult.status === 'fulfilled',
          accounts: accountResult.status === 'fulfilled',
          quick: quickResult.status === 'fulfilled'
        }
      });

    } catch (backendError) {
      console.log('[Quick Stats API] ⚠️ Backend unavailable, using fallback data:', backendError);
    }

    // Fallback данные при недоступности backend (фиксированные для стабильности)
    const fallbackData = {
      total_ads: 8,
      active_ads: 8,
      total_users: 50,
      active_users: 24,
      total_views: 156,
      premium_accounts: 4, // Фиксированное значение
      today_ads: 0,
      today_views: 0,
      generated_at: new Date().toISOString()
    };

    console.log('[Quick Stats API] 📊 Returning fallback statistics:', fallbackData);

    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'fallback',
      message: 'Fallback данные (backend недоступен)'
    });

  } catch (error: any) {
    console.error('[Quick Stats API] ❌ Error fetching quick stats:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Произошла ошибка при получении быстрой статистики'
    }, { status: 500 });
  }
}
