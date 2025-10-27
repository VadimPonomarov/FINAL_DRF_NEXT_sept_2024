"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlatformStats {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_accounts: number;
  generated_at?: string;
}

interface PlatformStatsWidgetProps {
  className?: string;
}

const PlatformStatsWidget: React.FC<PlatformStatsWidgetProps> = ({ className = "" }) => {
  const { t, formatNumber } = useI18n();
  const [stats, setStats] = useState<PlatformStats>({
    total_ads: 0,
    active_ads: 0,
    total_users: 0,
    premium_accounts: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  // Функция для загрузки статистики
  const fetchStats = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[PlatformStatsWidget] 📊 Fetching platform statistics...', forceRefresh ? '(force refresh)' : '');

      const url = forceRefresh
        ? '/api/autoria/ads/quick-stats?force_refresh=true'
        : '/api/autoria/ads/quick-stats';

      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      const result = await response.json();
      console.log('[PlatformStatsWidget] 📦 Response:', result);

      if (result.success && result.data) {
        setDataSource(result.source || 'unknown');
        setStats({
          total_ads: result.data.total_ads || 0,
          active_ads: result.data.active_ads || 0,
          total_users: result.data.total_users || 0,
          premium_accounts: result.data.premium_accounts || 0,
          generated_at: result.data.generated_at
        });
        setLastUpdated(new Date());
        console.log('[PlatformStatsWidget] ✅ Statistics updated:', result.data);
        console.log('[PlatformStatsWidget] 📦 Data source:', result.source);
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('[PlatformStatsWidget] ❌ Error fetching statistics:', error);
      setError(error.message || 'Ошибка загрузки статистики');
      setDataSource('error');

      // НЕ устанавливаем fallback данные - показываем 0
      setStats({
        total_ads: 0,
        active_ads: 0,
        total_users: 0,
        premium_accounts: 0
      });
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Принудительное обновление по клику пользователя
  const handleManualRefresh = useCallback(() => {
    fetchStats(true); // Принудительное обновление с очисткой кеша
  }, [fetchStats]);

  // Автоматическое обновление каждую минуту
  useEffect(() => {
    // Загружаем данные при монтировании компонента
    fetchStats();

    // Устанавливаем интервал для автоматического обновления каждую минуту
    const interval = setInterval(() => {
      console.log('[PlatformStatsWidget] ⏰ Auto-refreshing statistics...');
      fetchStats();
    }, 60000); // 60 секунд

    // Очищаем интервал при размонтировании
    return () => {
      clearInterval(interval);
    };
  }, [fetchStats]);

  const getDataSourceInfo = () => {
    switch (dataSource) {
      case 'cache':
        return { icon: '💾', text: t('autoria.dataSource.cache') };
      case 'generated_direct':
        return { icon: '🔄', text: t('autoria.dataSource.fresh') };
      case 'mock_fallback':
        return { icon: '⚠️', text: t('autoria.dataSource.mockFallback') };
      case 'error_fallback':
        return { icon: '❌', text: t('autoria.dataSource.errorFallback') };
      case 'error':
        return { icon: '❌', text: t('autoria.dataSource.error') };
      default:
        return null;
    }
  };

  const sourceInfo = getDataSourceInfo();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📊 {t('autoria.platformStats') || 'Статистика платформи'}
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">
                {t('common.updated') || 'Оновлено'}: {lastUpdated.toLocaleTimeString()}
              </span>
              {sourceInfo && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm cursor-help">
                        {sourceInfo.icon}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{sourceInfo.text}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Блоки статистики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 shadow-sm border">
          <div className={`text-lg md:text-2xl font-bold text-blue-600 ${isLoading ? 'animate-pulse' : ''}`}>
            {formatNumber(stats.total_ads)}
          </div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-gray-300">
            {t('autoria.totalAds') || 'Всего объявлений'}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 shadow-sm border">
          <div className={`text-lg md:text-2xl font-bold text-green-600 ${isLoading ? 'animate-pulse' : ''}`}>
            {formatNumber(stats.active_ads)}
          </div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-gray-300">
            {t('autoria.activeAds') || 'Активные объявления'}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 shadow-sm border">
          <div className={`text-lg md:text-2xl font-bold text-purple-600 ${isLoading ? 'animate-pulse' : ''}`}>
            {formatNumber(stats.total_users)}
          </div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-gray-300">
            {t('autoria.totalUsers') || 'Всего пользователей'}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 shadow-sm border">
          <div className={`text-lg md:text-2xl font-bold text-orange-600 ${isLoading ? 'animate-pulse' : ''}`}>
            {formatNumber(stats.premium_accounts)}
          </div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-gray-300">
            {t('autoria.premiumUsers') || 'Премиум пользователи'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformStatsWidget;
