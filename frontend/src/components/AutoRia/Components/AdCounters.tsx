"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Eye, Heart, Phone } from 'lucide-react';

interface AdCountersProps {
  adId: number;
  initialCounters?: {
    views_count?: number;
    favorites_count?: number;
    phone_views_count?: number;
  };
  onPhoneClick?: () => void;
  onFavoriteClick?: () => void;
  onCountersUpdate?: (counters: CountersData) => void;
  showClickableButtons?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isFavorite?: boolean;
  counterMode?: 'analytics' | 'metadata'; // which source to use when refreshing from server
  showResetButton?: boolean; // show broom/reset icon alongside counters
}

interface CountersData {
  views_count: number;
  favorites_count: number;
  phone_views_count: number;
}

const AdCounters = forwardRef<{ forceRefresh: () => Promise<any> }, AdCountersProps>(({
  adId,
  initialCounters = {},
  onPhoneClick,
  onFavoriteClick,
  onCountersUpdate,
  showClickableButtons = false,
  showResetButton = false,
  className = '',
  size = 'md',
  isFavorite = false,
  counterMode = 'analytics'
}, ref) => {
  const { t } = useI18n();
  const [counters, setCounters] = useState<CountersData>({
    views_count: initialCounters.views_count || 0,
    favorites_count: Math.max(initialCounters.favorites_count || 0, isFavorite ? 1 : 0),
    phone_views_count: initialCounters.phone_views_count || 0
  });

  // Отладочные логи
  console.log(`[AdCounters] Ad ${adId} - showClickableButtons:`, showClickableButtons, 'showResetButton:', showResetButton);

  const [isUpdating, setIsUpdating] = useState(false);

  // Обновляем счетчики при изменении initialCounters
  useEffect(() => {
    setCounters({
      views_count: initialCounters.views_count || 0,
      favorites_count: Math.max(initialCounters.favorites_count || 0, isFavorite ? 1 : 0),
      phone_views_count: initialCounters.phone_views_count || 0
    });
  }, [initialCounters, isFavorite]);

  // Функция для обновления счетчиков с сервера
  const refreshCounters = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/autoria/cars/${adId}`);
      if (response.ok) {
        const data = await response.json();
        const newCounters = counterMode === 'metadata' ? {
          views_count: data.meta_views_count || 0,
          favorites_count: data.favorites_count || 0,
          phone_views_count: data.meta_phone_views_count || 0
        } : {
          views_count: data.view_count || 0,
          favorites_count: data.favorites_count || 0,
          phone_views_count: data.phone_views_count || 0
        };
        setCounters(newCounters);
        onCountersUpdate?.(newCounters);
        console.log(`[AdCounters] Updated counters for ad ${adId}:`, newCounters);
        return newCounters;
      }
    } catch (error) {
      console.error('[AdCounters] Error refreshing counters:', error);
    } finally {
      setIsUpdating(false);
    }
    return null;
  };

  // Публичная функция для принудительного обновления счетчиков
  const forceRefresh = () => {
    return refreshCounters();
  };

  // Expose forceRefresh method via ref
  useImperativeHandle(ref, () => ({
    forceRefresh
  }));

  // Обработчик клика по телефону
  const handlePhoneClick = async () => {
    try {
      // Трекинг события
      const trackingResponse = await fetch('/api/tracking/ad-interaction/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'phone_reveal',
          source_page: 'counters_component',
          session_id: (typeof window !== 'undefined' ? (sessionStorage.getItem('visitor_session_id') || (sessionStorage.setItem('visitor_session_id', crypto.randomUUID()), sessionStorage.getItem('visitor_session_id'))) : undefined),
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      });

      if (trackingResponse.ok) {
        console.log('✅ Phone view tracked successfully');
        // Обновляем счетчик локально
        setCounters(prev => ({
          ...prev,
          phone_views_count: prev.phone_views_count + 1
        }));

        // Обновляем с сервера через небольшую задержку
        setTimeout(refreshCounters, 1000);
      }

      // Вызываем внешний обработчик
      onPhoneClick?.();
    } catch (error) {
      console.error('❌ Error tracking phone view:', error);
      onPhoneClick?.();
    }
  };

  // Обработчик клика по избранному
  const handleFavoriteClick = async () => {
    try {
      // Вызываем внешний обработчик (который делает toggle)
      onFavoriteClick?.();

      // Обновление счетчиков выполняет родитель после toggle; здесь ничего не делаем
    } catch (error) {
      console.error('❌ Error handling favorite click:', error);
    }
  };

  // Стили в зависимости от размера
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs gap-2',
          icon: 'h-3 w-3',
          button: 'p-1'
        };
      case 'lg':
        return {
          container: 'text-base gap-4',
          icon: 'h-5 w-5',
          button: 'p-2'
        };
      default: // md
        return {
          container: 'text-sm gap-3',
          icon: 'h-4 w-4',
          button: 'p-1.5'
        };
    }

  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center text-gray-500 ${sizeClasses.container} ${className}`}>
      {/* Просмотры */}
      <div className="flex items-center gap-1">
        <Eye className={sizeClasses.icon} />
        <span>{counters.views_count}</span>
      </div>

      {/* Избранное */}
      {showClickableButtons ? (
        <button
          onClick={handleFavoriteClick}
          className={`flex items-center gap-1 hover:text-red-500 transition-colors ${sizeClasses.button} rounded`}
          disabled={isUpdating}
        >
          <Heart className={sizeClasses.icon} />
          <span>{counters.favorites_count}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <Heart className={sizeClasses.icon} />
          <span>{counters.favorites_count} {t('autoria.inFavorites')}</span>
        </div>
      )}

      {/* Просмотры телефона */}
      {showClickableButtons ? (
        <button
          onClick={handlePhoneClick}
          className={`flex items-center gap-1 hover:text-blue-500 transition-colors ${sizeClasses.button} rounded`}
          disabled={isUpdating}
        >
          <Phone className={sizeClasses.icon} />
          <span>{counters.phone_views_count}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <Phone className={sizeClasses.icon} />
          <span>{counters.phone_views_count}</span>
        </div>
      )}

      {/* Кнопка сброса рядом со счётчиками (только если явно разрешено) */}
      {showClickableButtons && showResetButton && (
        <button
          onClick={async () => {
            console.log('🧹 Reset button clicked for ad:', adId);
            try {
              const resp = await fetch(`/api/ads/analytics/reset?ad_id=${adId}`, { method: 'POST' });
              if (resp.ok) {
                setCounters(prev => ({ ...prev, views_count: 0, phone_views_count: 0 }));
                console.log('✅ Counters reset successfully');
              }
            } catch (e) {
              console.error('Failed to reset counters', e);
            }
          }}
          className={`ml-2 inline-flex items-center text-xs bg-red-100 border border-red-300 px-2 py-1 rounded text-red-600 hover:bg-red-200`}
          title={t('common.reset') || 'Reset'}
          aria-label={t('common.reset') || 'Reset'}
        >
          {/* Кастомная иконка метлы (SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M3 21l6-6" />
            <path d="M15 7l-4 4" />
            <path d="M2 22l3-8 5 5-8 3z" />
            <path d="M14 6l4-4 2 2-4 4-2-2z" />
            <path d="M7 13l4-4" />
          </svg>
        </button>
      )}
    </div>
  );
});

export default AdCounters;
