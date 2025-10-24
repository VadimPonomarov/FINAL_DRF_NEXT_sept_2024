"use client";

import React, { useState, useEffect } from 'react';
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
  Star
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { FavoritesService } from '@/services/autoria/favorites.service';
import { useI18n } from '@/contexts/I18nContext';
import { formatCardPrice } from '@/utils/priceFormatter';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CarAdCardProps {
  ad: CarAd;
  onCountersUpdate?: (adId: number, counters: { favorites_count: number; phone_views_count: number }) => void;
}

/**
 * Мемоизированный компонент карточки объявления
 * Перерисовывается только при изменении данных объявления
 */
const CarAdCard: React.FC<CarAdCardProps> = React.memo(({ ad, onCountersUpdate }) => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { currency } = useCurrency();
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
  }, [ad.id, ad.is_favorite, ad.favorites_count, ad.phone_views_count]);

  // Мемоизируем вычисление цены в выбранной валюте
  const priceInCurrency = React.useMemo((): { price: number | null; currency: string } => {
    switch (currency) {
      case 'USD':
        return { price: ad.price_usd || ad.price, currency: 'USD' };
      case 'EUR':
        return { price: ad.price_eur || ad.price, currency: 'EUR' };
      case 'UAH':
        return { price: ad.price_uah || ad.price, currency: 'UAH' };
      default:
        return { price: ad.price, currency: ad.currency || 'USD' };
    }
  }, [currency, ad.price_usd, ad.price_eur, ad.price_uah, ad.price, ad.currency]);

  // Мемоизируем функцию обновления счетчиков
  const refreshCountersFromServer = React.useCallback(async () => {
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
  }, [ad.id, isFavorite, onCountersUpdate]);

  // Мемоизируем обработчик лайка
  const handleFavoriteToggle = React.useCallback(async (e: React.MouseEvent) => {
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
      if (error.message?.includes('401') || error.message?.includes('403')) {
        alert('Необходимо войти в систему для добавления в избранное');
      } else {
        alert(`Ошибка при обновлении избранного: ${error.message || 'Попробуйте еще раз'}`);
      }

      // НЕ откатываем изменения, так как состояние еще не изменилось
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [ad.id, isFavorite, favoritesCount, phoneViewsCount, onCountersUpdate, refreshCountersFromServer]);

  // Мемоизируем обработчик клика по телефону
  const handlePhoneClick = React.useCallback(async (e: React.MouseEvent) => {
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
      alert(`Телефон: ${ad.seller?.phone || '+380 XX XXX XX XX'}`);
    } catch (error) {
      console.error('❌ Error tracking phone view:', error);
    }
  }, [ad.id, ad.seller?.phone, phoneViewsCount, favoritesCount, onCountersUpdate]);

  // Мемоизируем функцию получения URL изображения
  const imageUrl = React.useMemo(() => {
    if (!ad.images || (Array.isArray(ad.images) && ad.images.length === 0)) {
      return '/api/placeholder/400/300';
    }

    // If images is an array, get the first image
    if (Array.isArray(ad.images)) {
      const firstImage = ad.images[0];
      if (!firstImage) return '/api/placeholder/400/300';

      // ПРИОРИТЕТ: image_url (это правильное поле от бекенда)
      const url = firstImage.image_url || firstImage.image_display_url || firstImage.url || firstImage.image;

      if (!url) return '/api/placeholder/400/300';

      // If URL is already absolute (starts with http), use it as is
      if (typeof url === 'string' && url.startsWith('http')) {
        return url;
      }

      // If URL starts with /media/, proxy it through /api/media
      if (typeof url === 'string' && url.startsWith('/media/')) {
        return `/api/media${url.substring(6)}`; // Remove /media/ and add /api/media/
      }

      // If URL starts with /api/media/, use it as is
      if (typeof url === 'string' && url.startsWith('/api/media/')) {
        return url;
      }

      // Otherwise, assume it's a relative path and add /api/media/ prefix
      return `/api/media/${String(url).replace(/^\/+/, '')}`;
    }

    // If images is a string, use it directly
    if (typeof ad.images === 'string') {
      if (ad.images.startsWith('http')) return ad.images;
      if (ad.images.startsWith('/media/')) return `/api/media${ad.images.substring(6)}`;
      if (ad.images.startsWith('/api/media/')) return ad.images;
      return `/api/media/${ad.images.replace(/^\/+/, '')}`;
    }

    return '/api/placeholder/400/300';
  }, [ad.images, ad.main_image]);

  // Мемоизируем обработчик клика по карточке
  const handleCardClick = React.useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    router.push(`/autoria/ad/${ad.id}`);
  }, [ad.id, router]);

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
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== '/api/placeholder/400/300') {
              target.src = '/api/placeholder/400/300';
            }
          }}
        />
        
        {/* 🏷️ Бейджи */}
        <div className="absolute top-2 left-2 flex gap-2">
          {ad.isUrgent && (
            <Badge className="bg-red-500 text-white">🔥 Срочно</Badge>
          )}
          {ad.isPremium && (
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
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        
        {/* 👁️ Просмотры */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {ad.view_count || 0}
        </div>
      </div>

      <CardContent className="p-4">
        {/* 📝 Заголовок */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {ad.title}
        </h3>
        
        {/* 💰 Цена */}
        <div className="text-2xl font-bold text-green-600 mb-3">
          {(() => {
            const { price, currency: displayCurrency } = priceInCurrency;
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
            <span>{ad.dynamic_fields?.fuel_type || 'N/A'}</span>
            <span>•</span>
            <span>{ad.dynamic_fields?.transmission || 'N/A'}</span>
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
        
        {/* 📅 Дата создания */}
        <div className="text-xs text-gray-400 mt-3 text-center">
          {new Date(ad.created_at).toLocaleDateString(locale)}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Кастомный компаратор - перерисовываем только при изменении ключевых данных
  return (
    prevProps.ad.id === nextProps.ad.id &&
    prevProps.ad.title === nextProps.ad.title &&
    prevProps.ad.price === nextProps.ad.price &&
    prevProps.ad.price_usd === nextProps.ad.price_usd &&
    prevProps.ad.price_eur === nextProps.ad.price_eur &&
    prevProps.ad.price_uah === nextProps.ad.price_uah &&
    prevProps.ad.is_favorite === nextProps.ad.is_favorite &&
    prevProps.ad.favorites_count === nextProps.ad.favorites_count &&
    prevProps.ad.phone_views_count === nextProps.ad.phone_views_count &&
    prevProps.ad.main_image === nextProps.ad.main_image
  );
});

CarAdCard.displayName = 'CarAdCard';

export default CarAdCard;
