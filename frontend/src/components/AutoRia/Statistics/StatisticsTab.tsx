"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  Eye,
  TrendingUp,
  DollarSign,
  MapPin,
  Calendar,
  Lock,
  Crown,
  AlertCircle,
  Info
} from 'lucide-react';
import { UserRole, AccountType } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';

// 📊 Интерфейс для статистики объявления
interface AdStatistics {
  ad_id: number;
  title: string;
  is_premium: boolean;
  views?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  pricing?: {
    your_price: {
      amount: number;
      currency: string;
    };
    region_average: {
      amount: number;
      currency: string;
      count: number;
      position_percentile: number;
    };
    ukraine_average: {
      amount: number;
      currency: string;
      count: number;
      position_percentile: number;
    };
  };
  message?: string; // Для базовых аккаунтов
}

interface StatisticsTabProps {
  adId?: number;
  userAccountType?: AccountType;
  userRole?: UserRole;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({
  adId,
  userAccountType = 'basic',
  userRole = 'seller'
}) => {
  const { t } = useI18n();
  const [statistics, setStatistics] = useState<AdStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔐 Проверка прав доступа
  const hasAccess = userAccountType === 'premium' || ['manager', 'admin', 'superuser'].includes(userRole);

  // 📊 Моковые данные для демонстрации
  const mockStatistics: AdStatistics = {
    ad_id: adId || 1,
    title: "BMW X5 2020 - Идеальное состояние",
    is_premium: userAccountType === 'premium',
    views: {
      total: 1234,
      today: 45,
      this_week: 234,
      this_month: 567,
      daily: [
        { date: '2024-01-15', count: 45 },
        { date: '2024-01-14', count: 38 },
        { date: '2024-01-13', count: 52 },
        { date: '2024-01-12', count: 41 },
        { date: '2024-01-11', count: 33 }
      ],
      weekly: [
        { week: '2024-W03', count: 234 },
        { week: '2024-W02', count: 189 },
        { week: '2024-W01', count: 156 }
      ],
      monthly: [
        { month: '2024-01', count: 567 },
        { month: '2023-12', count: 423 },
        { month: '2023-11', count: 244 }
      ]
    },
    pricing: {
      your_price: {
        amount: 45000,
        currency: 'USD'
      },
      region_average: {
        amount: 42500,
        currency: 'USD',
        count: 23,
        position_percentile: 75
      },
      ukraine_average: {
        amount: 40000,
        currency: 'USD',
        count: 156,
        position_percentile: 82
      }
    }
  };

  // 📈 Загрузка статистики с реального API
  useEffect(() => {
    const loadStatistics = async () => {
      if (!hasAccess || !adId) return;

      setLoading(true);
      setError(null);

      try {
        console.log('[StatisticsTab] 📊 Loading statistics for ad:', adId);

        const response = await fetchWithAuth(`/api/ads/statistics?ad_id=${adId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            // Нет доступа - это нормально для базовых аккаунтов
            setStatistics(null);
            return;
          }
          throw new Error(result.message || 'Ошибка загрузки статистики');
        }

        if (result.success) {
          setStatistics(result.data);
          console.log('[StatisticsTab] ✅ Statistics loaded:', result.data);
        } else {
          throw new Error(result.error || 'Неизвестная ошибка');
        }

      } catch (error: any) {
        console.error('[StatisticsTab] ❌ Error loading statistics:', error);
        setError((error instanceof Error ? error.message : String(error)));
        // Fallback на моковые данные для демонстрации
        if (hasAccess) {
          setStatistics(mockStatistics);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [adId, hasAccess]);

  // 🔒 Если нет доступа
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            🔒 {t('statisticsUnavailable')}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('statisticsUnavailableDesc')}
          </p>
          
          {userAccountType === 'basic' && !['manager', 'admin', 'superuser'].includes(userRole) && (
            <div className="max-w-md mx-auto">
              <Alert className="border-blue-200 bg-blue-50 mb-4">
                <Crown className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="space-y-2">
                    <p className="font-medium">{t('premiumBenefits')}:</p>
                    <ul className="text-sm space-y-1">
                      <li>📊 {t('detailedStatistics')}</li>
                      <li>💰 {t('priceAnalysis')}</li>
                      <li>📈 {t('chartsAndTrends')}</li>
                      <li>🚗 {t('unlimitedAds')}</li>
                      <li>⭐ {t('priorityPlacement')}</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                <Crown className="h-4 w-4 mr-2" />
                💎 {t('upgradeToPremium')}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ⏳ Загрузка
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  // ❌ Ошибка
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Ошибка загрузки статистики</p>
            <p className="text-sm mt-1">{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 📊 Отображение статистики
  if (!statistics) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('statisticsAfterPublication')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📋 Заголовок */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 {t('adStatistics')}
          {statistics.is_premium && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
              💎 {t('premium')}
            </Badge>
          )}
        </h3>
        <p className="text-sm text-gray-600">
          {t('detailedAnalytics')}
        </p>
      </div>

      {/* 👁️ Статистика просмотров */}
      {statistics.views && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">👁️ {t('totalViews')}</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.views.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('allTime')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">📅 {t('today')}</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.views.today}</div>
              <p className="text-xs text-muted-foreground">
                {t('viewsToday')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">📊 {t('thisWeek')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.views.this_week}</div>
              <p className="text-xs text-muted-foreground">
                {t('last7Days')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">📈 {t('thisMonth')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{statistics.views.this_month}</div>
              <p className="text-xs text-muted-foreground">
                {t('last30Days')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 💰 Анализ цен */}
      {statistics.pricing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💰 {t('yourPrice')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                ${statistics.pricing.your_price.amount.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {t('yourPriceDesc')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('regionAverage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${statistics.pricing.region_average.amount.toLocaleString()}
              </div>
              <div className="space-y-1 mt-2">
                <p className="text-sm text-gray-600">
                  {t('basedOnAds', { count: statistics.pricing.region_average.count })}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t('yourPosition')}:</span>
                  <Badge variant={statistics.pricing.region_average.position_percentile > 50 ? "destructive" : "secondary"}>
                    {statistics.pricing.region_average.position_percentile}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🇺🇦 {t('ukraineAverage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                ${statistics.pricing.ukraine_average.amount.toLocaleString()}
              </div>
              <div className="space-y-1 mt-2">
                <p className="text-sm text-gray-600">
                  {t('basedOnAds', { count: statistics.pricing.ukraine_average.count })}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t('yourPosition')}:</span>
                  <Badge variant={statistics.pricing.ukraine_average.position_percentile > 50 ? "destructive" : "secondary"}>
                    {statistics.pricing.ukraine_average.position_percentile}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 💡 Рекомендации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 {t('recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.pricing && statistics.pricing.your_price.amount > statistics.pricing.region_average.amount && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <p className="font-medium">{t('priceAboveRegionAverage')}</p>
                  <p className="text-sm mt-1">
                    {t('considerPriceReduction', {
                      amount: (statistics.pricing.your_price.amount - statistics.pricing.region_average.amount).toLocaleString()
                    })}
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            {statistics.views && statistics.views.today < 10 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium">{t('lowViewsToday')}</p>
                  <p className="text-sm mt-1">
                    {t('tryUpdatePhotosOrDescription')}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsTab;
