"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Eye,
  Phone,
  MapPin,
  Calendar,
  Fuel,
  Star,
  Mail
} from 'lucide-react';
import { CarAd } from '@/modules/autoria/shared/types/strict-types';
import { FavoritesService } from '@/services/autoria/favorites.service';
import { useI18n } from '@/contexts/I18nContext';
import { formatCardPrice } from '@/modules/autoria/shared/utils/priceFormatter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { resolveAdImageUrl, MEDIA_PLACEHOLDER } from '@/shared/utils/media-url';

interface CarAdCardProps {
  ad: CarAd;
  onCountersUpdate?: (adId: number, counters: { favorites_count: number; phone_views_count: number }) => void;
}

const CarAdCard: React.FC<CarAdCardProps> = ({ ad, onCountersUpdate }) => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(ad.is_favorite || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(ad.favorites_count || 0);
  const [phoneViewsCount, setPhoneViewsCount] = useState(ad.phone_views_count || 0);

  // Инициализируем состояние при смене объявления
  useEffect(() => {
    console.log(`🔄 [CarAdCard] Initializing ad ${ad.id}:`, {
      is_favorite: ad.is_favorite,
      favorites_count: ad.favorites_count,
      phone_views_count: ad.phone_views_count
    });

    setIsFavorite(ad.is_favorite || false);
    // Если сердечко активно – минимум 1
    const initialFavCount = Math.max(ad.favorites_count || 0, (ad.is_favorite ? 1 : 0));
    setFavoritesCount(initialFavCount);
    setPhoneViewsCount(ad.phone_views_count || 0);

    console.log(`✅ [CarAdCard] Initialized ad ${ad.id} with:`, {
      isFavorite: ad.is_favorite || false,
      favoritesCount: initialFavCount,
      phoneViewsCount: ad.phone_views_count || 0
    });
  }, [ad.id]);

  // Удалена локальная функция formatPrice - используем импортированную formatCardPrice

  /**
   * Получает цену в выбранной валюте
   * Backend всегда рассчитывает price_usd, price_eur и price_uah для всех объявлений
   */
  const getPriceInCurrency = (): { price: number | null; currency: string } => {
    switch (currency) {
      case 'USD':
        return { price: ad.price_usd || ad.price, currency: 'USD' };
      case 'EUR':
        return { price: ad.price_eur || ad.price, currency: 'EUR' };
      case 'UAH':
        // Используем price_uah из backend (всегда рассчитывается)
        return { price: ad.price_uah || ad.price, currency: 'UAH' };
      default:
        return { price: ad.price, currency: ad.currency || 'USD' };
    }
  };

  const refreshCountersFromServer = async () => {
    try {
      const r = await fetch(`/api/autoria/cars/${ad.id}`);
      if (r.ok) {
        const d = await r.json();
        const fav = d.favorites_count || 0;
        const phone = d.phone_views_count || 0;
        // Если текущий пользователь добавил в избранное – минимум 1
        const adjustedFavCount = Math.max(fav, (isFavorite ? 1 : 0));
        setFavoritesCount(adjustedFavCount);
        setPhoneViewsCount(phone);
        onCountersUpdate?.(ad.id, { favorites_count: adjustedFavCount, phone_views_count: phone });
      }
    } catch (err) {
      console.warn('[CarAdCard] Failed to refresh counters:', err);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log(`🔄 [CarAdCard] Toggling favorite for ad ${ad.id}, current state: ${isFavorite}`);

    if (isTogglingFavorite) {
      console.log(`⏳ [CarAdCard] Already toggling favorite for ad ${ad.id}, skipping`);
      return;
    }

    try {
      setIsTogglingFavorite(true);

      // Используем существующий FavoritesService
      console.log(`📡 [CarAdCard] Calling FavoritesService.toggleFavorite for ad ${ad.id}`);
      const response = await FavoritesService.toggleFavorite(ad.id);
      console.log(`✅ [CarAdCard] FavoritesService response:`, response);

      // Обновляем состояние с данными от сервера
      setIsFavorite(response.is_favorite);

      // Обновляем счетчик: если добавили в избранное - минимум 1, если убрали - 0
      const newFavoritesCount = response.is_favorite ? 1 : 0;
      setFavoritesCount(newFavoritesCount);
      onCountersUpdate?.(ad.id, { favorites_count: newFavoritesCount, phone_views_count: phoneViewsCount });

      // Отправляем трекинг события
      try {
        await fetch('/api/tracking/ad-interaction/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ad_id: ad.id,
            interaction_type: response.is_favorite ? 'favorite_add' : 'favorite_remove',
            source_page: 'search',
            metadata: {
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (trackingError) {
        console.warn('⚠️ [CarAdCard] Tracking failed, but favorite toggle succeeded:', trackingError);
      }

      // Убираем автоматическое обновление - только локальное состояние
      // setTimeout(() => { void refreshCountersFromServer(); }, 400);

      console.log(`✅ [CarAdCard] Favorite ${response.is_favorite ? 'added' : 'removed'} for ad ${ad.id}, new count: ${newFavoritesCount}`);
    } catch (error) {
      console.error(`❌ [CarAdCard] Error toggling favorite for ad ${ad.id}:`, error);

      // Показываем пользователю сообщение об ошибке
      if ((error instanceof Error ? error.message : String(error))?.includes('401') || (error instanceof Error ? error.message : String(error))?.includes('403')) {
        toast({
          variant: 'destructive',
          title: t('notifications.error'),
          description: t('notifications.loginRequiredForFavorites'),
          duration: 4000
        });
      } else {
        toast({
          variant: 'destructive',
          title: t('notifications.error'),
          description: `${t('notifications.favoriteAddError')}: ${(error instanceof Error ? error.message : String(error)) || t('notifications.tryAgain')}`,
          duration: 4000
        });
      }

      // НЕ откатываем изменения, так как состояние еще не изменилось
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Отправляем трекинг события
      await fetch('/api/ads/analytics/track/phone-view/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ad_id: ad.id,
          interaction_type: 'phone_view',
          source_page: 'search',
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      });
      
      // Обновляем локально (оптимистично)
      const newPhoneViewsCount = phoneViewsCount + 1;
      setPhoneViewsCount(newPhoneViewsCount);
      onCountersUpdate?.(ad.id, { favorites_count: favoritesCount, phone_views_count: newPhoneViewsCount });

      // Убираем автоматическое обновление - только локальное состояние
      // setTimeout(() => { void refreshCountersFromServer(); }, 400);

      console.log(`✅ Phone view tracked for ad ${ad.id}, total phone views: ${newPhoneViewsCount}`);
      
      // Показываем телефон
      toast({
        variant: 'default',
        title: t('notifications.phoneShown'),
        description: ad.user?.phone || t('notifications.phoneNumber'),
        duration: 5000
      });
    } catch (error) {
      console.error('❌ Error tracking phone view:', error);
    }
  };

  const imageUrl = useMemo(() => {
    const resolved = resolveAdImageUrl(ad.images);
    console.log(`🖼️ [CarAdCard ${ad.id}] Image resolution:`, {
      raw_images: ad.images,
      resolved_url: resolved,
      images_count: Array.isArray(ad.images) ? ad.images.length : 'not array'
    });
    return resolved;
  }, [ad.images, ad.id]);

  // Handle card click to navigate to ad details
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    router.push(`/autoria/ad/${ad.id}`);
  };

  const ownerEmail = ad.user?.email;

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 🖼️ Изображение */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={ad.title}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== MEDIA_PLACEHOLDER) {
              target.src = MEDIA_PLACEHOLDER;
            }
          }}
        />
        
        {/* 🏷️ Бейджи */}
        <div className="absolute top-2 left-2 flex gap-2">
          {ad.is_urgent && (
            <Badge className="bg-red-500 text-white">🔥 Срочно</Badge>
          )}
          {ad.is_premium && (
            <Badge className="bg-gold-500 text-white">💎 Премиум</Badge>
          )}
        </div>
        
        {/* ❤️ Избранное */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={handleFavoriteToggle}
          disabled={isTogglingFavorite}
          role="button"
          aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={isFavorite}
          title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        
        {/* 👁️ Просмотры */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {ad.views_count || 0}
        </div>
      </div>

      <CardContent className="p-4">
        {/* 📝 Заголовок */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {ad.title}
        </h3>
        
        {/* 🚗 Тип - Марка - Модель */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 flex-wrap">
          {ad.vehicle_type_name && (
            <Badge variant="outline" className="text-xs">
              {ad.vehicle_type_name}
            </Badge>
          )}
          {ad.mark_name && (
            <Badge variant="outline" className="font-semibold">
              {ad.mark_name}
            </Badge>
          )}
          {ad.model_name && (
            <Badge variant="outline" className="font-semibold">
              {ad.model_name}
            </Badge>
          )}
        </div>
        
        {/* 💰 Цена */}
        <div className="text-2xl font-bold text-green-600 mb-3">
          {(() => {
            const { price, currency: displayCurrency } = getPriceInCurrency();
            return formatCardPrice(price, displayCurrency);
          })()}
        </div>
        
        {/* 📊 Характеристики */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{ad.year || ad.dynamic_fields?.year || (ad as any).year_sort || '—'}</span>
            <span>•</span>
            <span>{(ad.mileage || ad.mileage_km || ad.dynamic_fields?.mileage || ad.dynamic_fields?.mileage_km || 0).toLocaleString()} км</span>
          </div>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            <span>{ad.dynamic_fields?.fuel_type || ad.fuel_type || 'N/A'}</span>
            <span>•</span>
            <span>{ad.dynamic_fields?.transmission || ad.transmission || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{(ad.city_name || (ad.city as any)?.name || (typeof ad.city === 'string' ? ad.city : '') || '—')}, {(ad.region_name || (ad.region as any)?.name || (typeof ad.region === 'string' ? ad.region : '') || '')}</span>
          </div>
        </div>
        
        {/* 📊 Счетчики */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>{Math.max(favoritesCount, (isFavorite ? 1 : 0))} ({isFavorite ? '❤️' : '🤍'})</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{phoneViewsCount}</span>
          </div>
        </div>
        
        {/* 🔗 Действия */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handlePhoneClick}
          >
            <Phone className="h-4 w-4 mr-1" />
            {t('phone')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/autoria/ad/${ad.id}`)}
          >
            {t('common.open')}
          </Button>
        </div>
        
        {(ownerEmail || ad.created_at) && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-3 gap-3">
            <span className="flex items-center gap-1 text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(ad.created_at).toLocaleDateString(locale)}</span>
            </span>
            {ownerEmail && (
              <span className="flex items-center gap-1" title={ownerEmail}>
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{ownerEmail}</span>
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Мемоизация компонента для предотвращения ненужных ререндеров
// Компонент будет перерисовываться только если изменился ad.id или важные поля ad
export default React.memo(CarAdCard, (prevProps, nextProps) => {
  // Сравниваем по ID - если ID тот же, проверяем важные поля
  if (prevProps.ad.id !== nextProps.ad.id) return false;
  
  // Проверяем изменились ли критичные поля
  const fieldsToCompare: (keyof CarAd)[] = [
    'is_favorite',
    'favorites_count',
    'phone_views_count',
    'views_count',
    'title',
    'price',
    'price_usd',
    'price_eur',
    'price_uah'
  ];
  
  for (const field of fieldsToCompare) {
    if (prevProps.ad[field] !== nextProps.ad[field]) {
      return false; // Props changed, need re-render
    }
  }
  
  // Props didn't change, skip re-render
  return true;
});
