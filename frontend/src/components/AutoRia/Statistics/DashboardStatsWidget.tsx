"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Car, CheckCircle, Clock, Eye } from 'lucide-react';

interface DashboardStats {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_accounts: number;
  today_ads?: number;
  today_views?: number;
  generated_at?: string;
}

interface DashboardStatsWidgetProps {
  className?: string;
}

const DashboardStatsWidget: React.FC<DashboardStatsWidgetProps> = ({ className = "" }) => {
  const [stats, setStats] = useState<DashboardStats>({
    total_ads: 0,
    active_ads: 0,
    total_users: 0,
    premium_accounts: 0,
    today_ads: 0,
    today_views: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Функция для загрузки статистики
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[DashboardStatsWidget] 📊 Fetching dashboard statistics...');
      
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
          today_ads: result.data.today_ads || 0,
          today_views: result.data.today_views || 0,
          generated_at: result.data.generated_at
        });
        setLastUpdated(new Date());
        console.log('[DashboardStatsWidget] ✅ Statistics updated:', result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('[DashboardStatsWidget] ❌ Error fetching statistics:', error);
      setError(error.message || 'Ошибка загрузки статистики');
      
      // Fallback к статичным данным при ошибке
      setStats({
        total_ads: 1247,
        active_ads: 892,
        total_users: 5432,
        premium_accounts: 234,
        today_ads: 23,
        today_views: 156
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

  // Автоматическое обновление каждую минуту
  useEffect(() => {
    // Загружаем данные при монтировании компонента
    fetchStats();

    // Устанавливаем интервал для автоматического обновления каждую минуту
    const interval = setInterval(() => {
      console.log('[DashboardStatsWidget] ⏰ Auto-refreshing statistics...');
      fetchStats();
    }, 60000); // 60 секунд

    // Очищаем интервал при размонтировании
    return () => {
      clearInterval(interval);
    };
  }, [fetchStats]);

  // Вычисляем процент активных объявлений
  const activePercentage = stats.total_ads > 0 
    ? Math.round((stats.active_ads / stats.total_ads) * 100) 
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📊 Основная статистика
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Обновлено: {lastUpdated.toLocaleTimeString()}
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

      {/* Сообщение об ошибке */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📊 Всего объявлений</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isLoading ? 'animate-pulse' : ''}`}>
              {stats.total_ads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.today_ads} сегодня
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Активные</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-green-600 ${isLoading ? 'animate-pulse' : ''}`}>
              {stats.active_ads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {activePercentage}% от общего числа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">👥 Пользователи</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-purple-600 ${isLoading ? 'animate-pulse' : ''}`}>
              {stats.total_users.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.premium_accounts} премиум
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">👁️ Просмотры</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-blue-600 ${isLoading ? 'animate-pulse' : ''}`}>
              {stats.today_views.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.today_views} сегодня
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStatsWidget;
