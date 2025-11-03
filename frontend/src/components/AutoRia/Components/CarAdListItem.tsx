"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Eye,
  MapPin,
  Calendar,
  Gauge,
  Edit,
  Trash2,
  ExternalLink,
  Phone,
  Mail
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { FavoritesService } from '@/services/autoria/favorites.service';
import { useI18n } from '@/contexts/I18nContext';
import { formatCardPrice } from '@/utils/priceFormatter';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CarAdListItemProps {
  ad: CarAd;
  onCountersUpdate?: (adId: number, counters: { favorites_count: number; phone_views_count: number }) => void;
  onDelete?: (adId: number) => void;
  isOwner?: (ad: CarAd) => boolean;
  togglingIds?: Set<number>;
  deletingIds?: Set<number>;
}

/**
 * Компонент для отображения объявления в СПИСОЧНОМ виде (одна строка на всю ширину)
 * Используется когда viewMode === 'list'
 */
const CarAdListItem: React.FC<CarAdListItemProps> = ({ 
  ad, 
  onCountersUpdate,
  onDelete,
  isOwner,
  togglingIds = new Set(),
  deletingIds = new Set()
}) => {
  const { t } = useI18n();
  const router = useRouter();
  const { currency } = useCurrency();
  const [isFavorite, setIsFavorite] = useState(ad.is_favorite || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(ad.is_favorite || false);
  }, [ad.id, ad.is_favorite]);

  const getPriceInCurrency = (): { price: number | null; currency: string } => {
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
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTogglingFavorite || togglingIds.has(ad.id)) return;

    try {
      setIsTogglingFavorite(true);
      const response = await FavoritesService.toggleFavorite(ad.id);
      setIsFavorite(response.is_favorite);
      onCountersUpdate?.(ad.id, { 
        favorites_count: response.is_favorite ? 1 : 0, 
        phone_views_count: ad.phone_views_count || 0 
      });
    } catch (error) {
      console.error(`❌ Error toggling favorite:`, error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleDeleteAd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deletingIds.has(ad.id)) return;
    
    const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
    const confirmed = await alertHelpers.confirmDelete(`${t('autoria.ad')}: "${ad.title}"`);
    if (confirmed) {
      onDelete?.(ad.id);
    }
  };

  const handleViewAd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    router.push(`/autoria/ad/${ad.id}`);
  };

  const getImageUrl = () => {
    if (!ad.images || (Array.isArray(ad.images) && ad.images.length === 0)) {
      return '/api/placeholder/400/300';
    }

    if (Array.isArray(ad.images)) {
      const firstImage = ad.images[0];
      if (!firstImage) return '/api/placeholder/400/300';

      const url = firstImage.image_url || firstImage.image_display_url || firstImage.url || firstImage.image;
      if (!url) return '/api/placeholder/400/300';

      if (typeof url === 'string' && url.startsWith('http')) return url;
      if (typeof url === 'string' && url.startsWith('/media/')) {
        return `/api/media${url.substring(6)}`;
      }
      if (typeof url === 'string' && url.startsWith('/api/media/')) return url;
      return `/api/media/${String(url).replace(/^\/+/, '')}`;
    }

    return '/api/placeholder/400/300';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    handleViewAd();
  };

  const ownerCheck = isOwner ? isOwner(ad) : false;
  const cityName = typeof ad.city === 'object' && 'name' in ad.city 
    ? ad.city.name 
    : ad.city_name || ad.city || '—';

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-row border border-slate-200 bg-white w-full hover:border-orange-400"
      style={{ minHeight: '90px' }}
      onClick={handleCardClick}
    >
      {/* Фото - узкое, неискаженное, с padding для сохранения пропорций */}
      <div className="relative flex-shrink-0 bg-slate-50 flex items-center justify-center" style={{ width: '120px', minWidth: '120px', padding: '6px' }}>
        <img
          src={getImageUrl()}
          alt={ad.title}
          className="object-contain"
          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/api/placeholder/400/300') {
              target.src = '/api/placeholder/400/300';
            }
          }}
        />
        
        {/* VIP/Premium badges */}
        {(ad.is_vip || ad.is_premium) && (
          <div className="absolute top-1 left-1 flex gap-0.5">
            {ad.is_vip && (
              <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 h-4 leading-[16px] font-bold">
                VIP
              </Badge>
            )}
            {ad.is_premium && (
              <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] px-1.5 py-0.5 h-4 leading-[16px] font-bold">
                ★ PRO
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Контент - флекс с переносом */}
      <div className="flex-1 flex flex-col gap-2 px-4 py-3 min-w-0">
        {/* Первая строка: ID, Заголовок, Цена */}
        <div className="flex items-center gap-3 w-full min-w-0">
          {/* ID */}
          <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
            ID {ad.id}
          </div>

          {/* Заголовок */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-orange-600 transition-colors">
              {ad.title}
            </h3>
            {/* Тип - Марка - Модель */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {ad.vehicle_type_name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-[16px]">
                  {ad.vehicle_type_name}
                </Badge>
              )}
              {ad.mark_name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-[16px] font-semibold">
                  {ad.mark_name}
                </Badge>
              )}
              {ad.model && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 leading-[16px]">
                  {ad.model}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Цена */}
          <div className="font-bold text-lg text-green-600 flex-shrink-0 text-right tabular-nums">
            {(() => {
              const { price, currency: displayCurrency } = getPriceInCurrency();
              return formatCardPrice(price, displayCurrency);
            })()}
          </div>

          {/* Действия */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Избранное */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-red-50 rounded-full"
              onClick={handleFavoriteToggle}
              disabled={isTogglingFavorite || togglingIds.has(ad.id)}
              role="button"
              aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              aria-pressed={isFavorite}
              title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
            </Button>

            {/* Просмотр */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewAd();
              }}
              className="h-7 w-7 p-0 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-full"
              title="Просмотреть детали"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>

            {/* Редактирование (только для владельца) */}
            {ownerCheck && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/autoria/ads/edit/${ad.id}`);
                }}
                className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                title="Редактировать"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Удаление (только для владельца) */}
            {ownerCheck && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAd}
                disabled={deletingIds.has(ad.id)}
                className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                title="Удалить объявление"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Вторая строка: Характеристики и Статистика */}
        <div className="flex items-center gap-4 w-full">
          {/* Характеристики */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium">{ad.year || ad.dynamic_fields?.year || '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium">{(ad.mileage || ad.dynamic_fields?.mileage || 0).toLocaleString('ru-RU')}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span className="font-medium text-[11px]">{cityName}</span>
            </span>
          </div>

          {/* Статистика */}
          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 ml-auto">
            <span className="flex items-center gap-1" title="Просмотры">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">{ad.views_count || ad.view_count || 0}</span>
            </span>
            <span className="flex items-center gap-1" title="В избранном">
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="font-medium tabular-nums">{ad.favorites_count || 0}</span>
            </span>
            <span className="flex items-center gap-1" title="Показы телефона">
              <Phone className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">{ad.phone_views_count || 0}</span>
            </span>
          </div>
        </div>

        {(ad.user?.email || ad.created_at) && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">
            {ad.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(ad.created_at).toLocaleDateString('uk-UA')}</span>
              </span>
            )}
            {ad.user?.email && (
              <span className="flex items-center gap-1" title={ad.user.email}>
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[240px]">{ad.user.email}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// Мемоизация компонента для предотвращения ненужных ререндеров
// Компонент будет перерисовываться только если изменился ad.id или важные поля
export default React.memo(CarAdListItem, (prevProps, nextProps) => {
  // Сравниваем по ID - если ID тот же, проверяем важные поля
  if (prevProps.ad.id !== nextProps.ad.id) return false;
  
  // Проверяем изменились ли критичные поля
  const fieldsToCompare: (keyof CarAd)[] = [
    'is_favorite',
    'favorites_count',
    'phone_views_count',
    'view_count',
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
  
  // Проверяем другие props
  if (prevProps.togglingIds !== nextProps.togglingIds ||
      prevProps.deletingIds !== nextProps.deletingIds ||
      prevProps.isOwner !== nextProps.isOwner ||
      prevProps.onDelete !== nextProps.onDelete ||
      prevProps.onCountersUpdate !== nextProps.onCountersUpdate) {
    return false;
  }
  
  // Props didn't change, skip re-render
  return true;
});

