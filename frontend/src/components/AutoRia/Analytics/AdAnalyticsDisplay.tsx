'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Phone, Heart, Share2, TrendingUp, Star } from 'lucide-react';
import analyticsTracker from '@/lib/analytics-tracker';
import ShareMenu from './ShareMenu';

interface AdAnalyticsData {
  views_count: number;
  unique_views_count: number;
  phone_reveals_count: number;
  favorites_count: number;
  shares_count: number;
  conversion_rate: number;
  quality_score: number;
  trending: boolean;
}

interface AdAnalyticsDisplayProps {
  adId: number;
  className?: string;
  showDetailed?: boolean;
  onInteraction?: (type: string) => void;
  adTitle?: string;
  adPrice?: string;
}

const AdAnalyticsDisplay: React.FC<AdAnalyticsDisplayProps> = ({
  adId,
  className = '',
  showDetailed = false,
  onInteraction,
  adTitle = 'Объявление',
  adPrice = 'Цена не указана'
}) => {
  const [analytics, setAnalytics] = useState<AdAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [adId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('[AdAnalyticsDisplay] Analytics DISABLED for debugging');

      // ВРЕМЕННО ОТКЛЮЧАЕМ АНАЛИТИКУ ДЛЯ ОТЛАДКИ
      // const data = await analyticsTracker.getAdAnalyticsForCard(adId);
      // setAnalytics(data);

      // Устанавливаем заглушку
      setAnalytics({
        views_count: 0,
        unique_views_count: 0,
        phone_reveals_count: 0,
        favorites_count: 0,
        shares_count: 0,
        conversion_rate: 0,
        quality_score: 0,
        trending: false
      });
    } catch (error) {
      console.error('Error loading ad analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneReveal = async () => {
    await analyticsTracker.revealPhone(adId);
    onInteraction?.('phone_reveal');
    // Обновляем аналитику
    loadAnalytics();
  };

  const handleFavoriteToggle = async (isAdding: boolean) => {
    if (isAdding) {
      await analyticsTracker.addToFavorites(adId);
      onInteraction?.('favorite_add');
    } else {
      await analyticsTracker.removeFromFavorites(adId);
      onInteraction?.('favorite_remove');
    }
    // Обновляем аналитику
    loadAnalytics();
  };

  const handleShare = async (method: string = 'link') => {
    await analyticsTracker.shareAd(adId, method);
    onInteraction?.('share');
    // Обновляем аналитику
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-400 ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 w-8 bg-gray-200 rounded"></div>
          <div className="h-4 w-8 bg-gray-200 rounded"></div>
          <div className="h-4 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`flex items-center space-x-2 text-gray-400 ${className}`}>
        <Eye className="h-4 w-4" />
        <span className="text-sm">0</span>
      </div>
    );
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 10) return 'text-green-600';
    if (rate >= 5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Просмотры */}
      <div className="flex items-center space-x-1 text-gray-600">
        <Eye className="h-3 w-3" />
        <span className="text-xs font-medium">
          {analytics.views_count}
          {showDetailed && analytics.unique_views_count !== analytics.views_count && (
            <span className="text-xs text-gray-400 ml-1">
              ({analytics.unique_views_count} уник.)
            </span>
          )}
        </span>
        {analytics.trending && (
          <TrendingUp className="h-3 w-3 text-red-500 animate-pulse" title="Трендовое объявление" />
        )}
      </div>

      {/* Показы телефона */}
      <button
        onClick={handlePhoneReveal}
        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
        title="Показать телефон"
      >
        <Phone className="h-3 w-3" />
        <span className="text-xs font-medium">{analytics.phone_reveals_count}</span>
        {showDetailed && analytics.conversion_rate > 0 && (
          <span className={`text-xs ml-1 ${getConversionColor(analytics.conversion_rate)}`}>
            ({analytics.conversion_rate}%)
          </span>
        )}
      </button>

      {/* Избранное */}
      <button
        onClick={() => handleFavoriteToggle(true)}
        className="flex items-center space-x-1 text-red-500 hover:text-red-700 transition-colors"
        title="Добавить в избранное"
      >
        <Heart className="h-3 w-3" />
        <span className="text-xs font-medium">{analytics.favorites_count}</span>
      </button>

      {/* Поделиться */}
      <ShareMenu
        adId={adId}
        adTitle={adTitle}
        adPrice={adPrice}
        onShare={(method) => {
          handleShare(method);
          onInteraction?.('share');
        }}
      />

      {/* Оценка качества (только в детальном режиме) */}
      {showDetailed && analytics.quality_score > 0 && (
        <div className="flex items-center space-x-1" title={`Оценка качества: ${analytics.quality_score}/100`}>
          <Star className={`h-3 w-3 ${getQualityColor(analytics.quality_score)}`} />
          <span className={`text-xs font-medium ${getQualityColor(analytics.quality_score)}`}>
            {analytics.quality_score}
          </span>
        </div>
      )}

      {/* Индикатор трендовости */}
      {analytics.trending && (
        <div className="px-1 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
          🔥
        </div>
      )}
    </div>
  );
};

export default AdAnalyticsDisplay;
