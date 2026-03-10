"use client";
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  RefreshCw,
  Car,
  Calendar,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Heart,
  Phone
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

// 🚗 Интерфейс объявления из backend
interface CarAd {
  id: number;
  title: string;
  mark: {
    id: number;
    name: string;
  };
  model: {
    id: number;
    name: string;
  };
  year: number;
  price: number;
  currency: string;
  mileage_km: number;
  status: 'draft' | 'pending' | 'active' | 'needs_review' | 'rejected' | 'sold' | 'archived';
  is_validated: boolean;
  region: {
    id: number;
    name: string;
  };
  city: {
    id: number;
    name: string;
  };
  views_count?: number;
  created_at: string;
  updated_at: string;
  moderation_reason?: string;
}

// 📊 Статусы объявлений с эмодзи
const STATUS_CONFIG = {
  draft: { label: '📝 Черновик', color: 'bg-gray-500', description: 'Не опубликовано' },
  pending: { label: '⏳ На модерации', color: 'bg-yellow-500', description: 'Проверяется системой' },
  active: { label: '✅ Активно', color: 'bg-green-500', description: 'Опубликовано и видно всем' },
  needs_review: { label: '👀 Требует проверки', color: 'bg-orange-500', description: 'Ручная модерация' },
  rejected: { label: '❌ Отклонено', color: 'bg-red-500', description: 'Не прошло модерацию' },
  sold: { label: '🎉 Продано', color: 'bg-blue-500', description: 'Автомобиль продан' },
  archived: { label: '📦 Архив', color: 'bg-gray-400', description: 'В архиве' }
};

const MyAdsPage: React.FC = () => {
  const { formatDate: formatDateFunc } = useI18n();
  const { toast } = useToast();
  const { t } = useI18n();
  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalAds, setTotalAds] = useState(0);

  // 📊 Загрузка объявлений с backend
  const loadAds = useCallback(async (statusFilter = 'all', pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[MyAdsPage] 📤 Loading ads:', { status: statusFilter, page: pageNum });

      const params = new URLSearchParams({
        page: pageNum.toString(),
        page_size: '10'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/ads/my-ads?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error((result as any).message || 'Ошибка загрузки объявлений');
      }

      if (result.success) {
        setAds(result.data || []);
        setTotalAds(result.total || 0);
        console.log('[MyAdsPage] ✅ Ads loaded:', result.data?.length || 0);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }

    } catch (error: any) {
      console.error('[MyAdsPage] ❌ Error loading ads:', error);
      setError((error as any).message);
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🗑️ Удаление объявления
  const deleteAd = useCallback(async (adId: number) => {
    const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
    const confirmed = await alertHelpers.confirmDelete(t('autoria.thisAd') || 'це оголошення');
    if (!confirmed) {
      return;
    }

    try {
      console.log('[MyAdsPage] 🗑️ Deleting ad:', adId);

      const response = await fetch(`/api/ads/my-ads?id=${adId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error((result as any).message || 'Ошибка удаления объявления');
      }

      if (result.success) {
        console.log('[MyAdsPage] ✅ Ad deleted successfully');
        // Перезагружаем список
        await loadAds(selectedStatus, page);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }

    } catch (error: any) {
      console.error('[MyAdsPage] ❌ Error deleting ad:', error);
      toast({ title: '❌ ' + t('common.error'), description: `${t('myAds.deleteError')}: ${(error as any).message}`, variant: 'destructive' });
    }
  }, [selectedStatus, page, loadAds, t, toast]);

  // 🔄 Загрузка при монтировании
  useEffect(() => {
    loadAds(selectedStatus, page);
  }, [loadAds, selectedStatus, page]);

  // 💰 Форматирование цены
  const formatPrice = useCallback((price: number, currency: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency as keyof typeof symbols] || '$'}${price.toLocaleString()}`;
  }, []);

  // 📅 Форматирование даты
  const formatDate = useCallback((dateString: string) => {
    return formatDateFunc(new Date(dateString), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [formatDateFunc]);

  // 🎨 Карточка объявления
  const AdCard: React.FC<{ ad: CarAd }> = ({ ad }) => {
    const statusConfig = STATUS_CONFIG[ad.status];

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2 mb-2">
                {ad.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  {ad.mark.name} {ad.model.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {ad.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {ad.city.name}
                </span>
              </div>
            </div>
            
            <Badge className={`${statusConfig.color} text-white ml-4`}>
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* 💰 Цена и характеристики */}
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(ad.price, ad.currency)}
              </div>
              <div className="text-sm text-gray-600">
                {ad.mileage_km.toLocaleString()} км
              </div>
            </div>

            {/* 📊 Статистика просмотров */}
            {ad.views_count !== undefined && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>{ad.views_count} просмотров</span>
              </div>
            )}

            {/* ⚠️ Причина отклонения */}
            {ad.status === 'rejected' && ad.moderation_reason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">Причина отклонения:</p>
                  <p className="text-sm">{ad.moderation_reason}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* 📅 Даты */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>Создано: {formatDate(ad.created_at)}</div>
              <div>Обновлено: {formatDate(ad.updated_at)}</div>
            </div>

            {/* 📊 Статистика */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>{ad.views_count || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Heart className="h-4 w-4" />
                <span>{ad.views_count /* favorites_count */ || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{ad.views_count /* phone_views_count */ || 0}</span>
              </div>

              {ad.status === 'active' && (
                <Button size="sm" variant="outline" className="ml-auto">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Статистика
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 📋 Заголовок */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🚗 Мои объявления
              </h1>
              <p className="text-gray-600 mt-2">
                Управление вашими объявлениями о продаже автомобилей
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button onClick={() => loadAds(selectedStatus, page)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать объявление
              </Button>
            </div>
          </div>

          {/* 🎛️ Фильтры по статусу */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('all')}
            >
              Все ({totalAds})
            </Button>
            
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ❌ Ошибка */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Ошибка загрузки объявлений</p>
              <p className="text-sm mt-1">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* ⏳ Загрузка */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка объявлений...</p>
          </div>
        )}

        {/* 📋 Список объявлений */}
        {!loading && !error && (
          <>
            {ads.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ads.map((ad: any) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Объявлений не найдено
                </h3>
                <p className="text-gray-600 mb-6">
                  {selectedStatus === 'all' 
                    ? 'У вас пока нет объявлений. Создайте первое!'
                    : `Нет объявлений со статусом "${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG]?.label}"`
                  }
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать объявление
                </Button>
              </div>
            )}

            {/* 📄 Пагинация */}
            {ads.length > 0 && totalAds > 10 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Предыдущая
                  </Button>
                  
                  <span className="px-4 py-2 text-sm">
                    Страница {page} из {Math.ceil(totalAds / 10)}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={page >= Math.ceil(totalAds / 10)}
                    onClick={() => setPage(page + 1)}
                  >
                    Следующая
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyAdsPage;
