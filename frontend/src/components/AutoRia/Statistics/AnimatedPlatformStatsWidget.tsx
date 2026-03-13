"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface PlatformStats {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_accounts: number;
  generated_at?: string;
}

interface AnimatedPlatformStatsWidgetProps {
  className?: string;
  showHeader?: boolean;
  animationStage?: number;
  showWelcome?: boolean;
}

// Hook для анимированного счетчика (dev-optimized)
const useAnimatedCounter = (targetValue: number, shouldStart: boolean, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';

    if (!shouldStart || targetValue === 0) return;

    if (isDev) {
      // Dev mode: instant display, no animation
      setCount(targetValue);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Simplified easing for better performance
      const easeOut = 1 - Math.pow(1 - progress, 2);
      const currentCount = Math.floor(targetValue * easeOut);

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Simplified glow effect
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), 500);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [targetValue, shouldStart, duration]);

  return { count, isGlowing };
};

const AnimatedPlatformStatsWidget: React.FC<AnimatedPlatformStatsWidgetProps> = ({ 
  className = "",
  showHeader = true,
  animationStage = 0,
  showWelcome = false
}) => {
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

  // Анимированные счетчики
  const totalAdsCounter = useAnimatedCounter(
    stats.total_ads,
    showWelcome && animationStage >= 5,
    2500
  );
  const activeAdsCounter = useAnimatedCounter(
    stats.active_ads,
    showWelcome && animationStage >= 5,
    2800
  );
  const totalUsersCounter = useAnimatedCounter(
    stats.total_users,
    showWelcome && animationStage >= 5,
    3100
  );
  const premiumUsersCounter = useAnimatedCounter(
    stats.premium_accounts,
    showWelcome && animationStage >= 5,
    2200
  );

  // Функция для загрузки статистики
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AnimatedPlatformStatsWidget] 📊 Fetching platform statistics...');
      
      const response = await fetch('/api/autoria/ads/quick-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setStats({
          total_ads: result.data.total_ads || 0,
          active_ads: result.data.active_ads || 0,
          total_users: result.data.total_users || 0,
          premium_accounts: result.data.premium_accounts || 0,
          generated_at: result.data.generated_at
        });
        setLastUpdated(new Date());
        console.log('[AnimatedPlatformStatsWidget] ✅ Statistics updated:', result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('[AnimatedPlatformStatsWidget] ❌ Error fetching statistics:', error);
      setError(error.message || 'Ошибка загрузки статистики');
      
      // Fallback к статичным данным при ошибке
      setStats({
        total_ads: 15420,
        active_ads: 12350,
        total_users: 8900,
        premium_accounts: 1200
      });
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Принудительное обновление по клику пользователя
  const handleManualRefresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // Автоматическое обновление каждую минуту - ОТКЛЮЧЕНО для уменьшения трафика
  useEffect(() => {
    // Загружаем данные при монтировании компонента
    fetchStats();

    // Убираем автоматическое обновление каждую минуту
    // const interval = setInterval(() => {
    //   console.log('[AnimatedPlatformStatsWidget] ⏰ Auto-refreshing statistics...');
    //   fetchStats();
    // }, 60000); // 60 секунд

    // // Очищаем интервал при размонтировании
    // return () => {
    //   clearInterval(interval);
    // };
  }, [fetchStats]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок с кнопкой обновления */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📊 {t('autoria.platformStats') || 'Статистика платформи'}
          </h3>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {(t('common.updated') !== 'common.updated' ? t('common.updated') : 'Оновлено')}: {lastUpdated.toLocaleTimeString()}
              </span>
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
      )}

      {/* Сообщение об ошибке */}
      {error && showHeader && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Блоки статистики с анимацией */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
          totalAdsCounter.isGlowing ? 'ring-4 ring-blue-400 ring-opacity-50 shadow-blue-400/50' : ''
        }`}>
          <div className={`text-3xl font-bold text-blue-600 transition-all duration-300 ${
            totalAdsCounter.isGlowing ? 'text-blue-700 scale-110' : ''
          }`}>
            {isLoading && !showWelcome ? (
              <div className="animate-pulse bg-blue-200 h-8 w-16 rounded"></div>
            ) : (
              formatNumber(showWelcome ? totalAdsCounter.count : stats.total_ads)
            )}
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {t('autoria.totalAds') || 'Всего объявлений'}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br from-white to-green-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
          activeAdsCounter.isGlowing ? 'ring-4 ring-green-400 ring-opacity-50 shadow-green-400/50' : ''
        }`}>
          <div className={`text-3xl font-bold text-green-600 transition-all duration-300 ${
            activeAdsCounter.isGlowing ? 'text-green-700 scale-110' : ''
          }`}>
            {isLoading && !showWelcome ? (
              <div className="animate-pulse bg-green-200 h-8 w-16 rounded"></div>
            ) : (
              formatNumber(showWelcome ? activeAdsCounter.count : stats.active_ads)
            )}
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {t('autoria.activeAds') || 'Активные объявления'}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
          totalUsersCounter.isGlowing ? 'ring-4 ring-purple-400 ring-opacity-50 shadow-purple-400/50' : ''
        }`}>
          <div className={`text-3xl font-bold text-purple-600 transition-all duration-300 ${
            totalUsersCounter.isGlowing ? 'text-purple-700 scale-110' : ''
          }`}>
            {isLoading && !showWelcome ? (
              <div className="animate-pulse bg-purple-200 h-8 w-16 rounded"></div>
            ) : (
              formatNumber(showWelcome ? totalUsersCounter.count : stats.total_users)
            )}
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {t('autoria.totalUsers') || 'Всего пользователей'}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br from-white to-orange-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
          premiumUsersCounter.isGlowing ? 'ring-4 ring-orange-400 ring-opacity-50 shadow-orange-400/50' : ''
        }`}>
          <div className={`text-3xl font-bold text-orange-600 transition-all duration-300 ${
            premiumUsersCounter.isGlowing ? 'text-orange-700 scale-110' : ''
          }`}>
            {isLoading && !showWelcome ? (
              <div className="animate-pulse bg-orange-200 h-8 w-16 rounded"></div>
            ) : (
              formatNumber(showWelcome ? premiumUsersCounter.count : stats.premium_accounts)
            )}
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {t('autoria.premiumUsers') || 'Премиум пользователи'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedPlatformStatsWidget;
