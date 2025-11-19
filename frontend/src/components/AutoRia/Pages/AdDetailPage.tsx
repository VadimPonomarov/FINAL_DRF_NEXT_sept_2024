"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  Car,
  Phone,
  Mail,
  User,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Camera,
  Info,
  Award,
  Zap,
  MessageSquare,
  Bookmark,
  ExternalLink,
  Copy,
  Star
} from 'lucide-react';

import { CarAd } from '@/modules/autoria/shared/types/autoria';
import { useI18n, useTranslation } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { FavoritesService } from '@/services/autoria/favorites.service';
import { useAutoRiaAuth } from '@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import AdCounters from '@/components/AutoRia/Components/AdCounters';
import { ApiClient } from '@/services/api/apiClient';
import '@/shared/styles/showroom.css';

interface AdDetailPageProps {
  adId: number;
  showModerationControls?: boolean; // Для суперюзеров
  onBack?: () => void; // Callback для кнопки "Назад"
  onEdit?: () => void; // Callback для кнопки "Редактировать"
}

const AdDetailPage: React.FC<AdDetailPageProps> = ({ 
  adId, 
  showModerationControls = false, 
  onBack, 
  onEdit 
}) => {
  const { t, formatDate, formatCurrency } = useI18n();
  const tReact = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated, getToken } = useAutoRiaAuth();
  const { toast } = useToast();

  // Handle back navigation with callback support
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  // State
  const [adData, setAdData] = useState<CarAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const adCountersRef = useRef<{ forceRefresh: () => Promise<any> }>(null);
  const [showPhoneList, setShowPhoneList] = useState(false);
  const phoneListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPhoneList) return;
    function handleClickOutside(e: MouseEvent) {
      if (phoneListRef.current && !phoneListRef.current.contains(e.target as Node)) {
        setShowPhoneList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPhoneList]);



  // Load ad data on mount
  useEffect(() => {
    loadAdData();
  }, [adId]);

  const loadAdData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log('[AdDetailPage] Loading ad data for ID:', adId);

      // Используем тот же API что и ShowroomPage для синхронизации счетчиков
      const response = await fetch(`/api/autoria/cars/${adId}`);
      if (!response.ok) {
        throw new Error(`Failed to load car ad: ${response.status}`);
      }
      const data = await response.json();
      console.log('[AdDetailPage] Loaded ad data:', data);
      console.log('[AdDetailPage] Images data:', data.images);
      console.log('[AdDetailPage] Images count:', data.images?.length || 0);
      if (data.images && data.images.length > 0) {
        console.log('[AdDetailPage] First image:', data.images[0]);
        console.log('[AdDetailPage] First image display URL:', data.images[0].image_display_url);
      }

      setAdData(data);

      // Получаем актуальный статус избранного для текущего пользователя
      if (user) {
        try {
          const token = await getToken();
          const favoriteResponse = await fetch(`/api/autoria/favorites/check/${adId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (favoriteResponse.ok) {
            const favoriteData = await favoriteResponse.json();
            setIsFavorite(favoriteData.is_favorite || false);
          }
        } catch (error) {
          console.error('[AdDetailPage] Error checking favorite status:', error);
          setIsFavorite(false);
        }
      } else {
        setIsFavorite(false);
      }

      console.log('[AdDetailPage] Counters loaded:', {
        favorites_count: data.favorites_count,
        phone_views_count: data.phone_views_count,
        view_count: data.view_count
      });

      // Убираем лишний принудительный апдейт, чтобы не вызывать двойной ререндер
      // setAdData({ ...data });


    } catch (error) {
      console.error('[AdDetailPage] Error loading ad:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Track a view once when adId changes
  useEffect(() => {
    let cancelled = false;
    const trackView = async () => {
      try {
        const resp = await fetch('/api/tracking/ad-interaction/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ad_id: adId,
            interaction_type: 'view',
            source_page: 'ad_view',
            session_id: (typeof window !== 'undefined' ? (sessionStorage.getItem('visitor_session_id') || (sessionStorage.setItem('visitor_session_id', crypto.randomUUID()), sessionStorage.getItem('visitor_session_id'))) : undefined),
            metadata: { timestamp: new Date().toISOString() }
          })
        });
        if (resp.ok && !cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              // Принудительно обновляем счетчики в AdCounters
              adCountersRef.current?.forceRefresh();
            }
          }, 800);
        }
      } catch (e) {
        console.warn('[AdDetailPage] view tracking failed', e);
      }
    };
    trackView();
    return () => { cancelled = true; };
  }, [adId]);


  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Для добавления в избранное необходимо войти в систему",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAddingToFavorites(true);

      // Используем единый метод toggleFavorite
      const response = await FavoritesService.toggleFavorite(adId);

      console.log('[AdDetailPage] Favorite toggled:', {
        adId,
        is_favorite: response.is_favorite,
        message: response.message
      });

      // Обновляем состояние с реальным статусом от сервера
      setIsFavorite(response.is_favorite);

      // Трекинг события избранного
      try {
        const trackingResponse = await fetch('/api/tracking/ad-interaction/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ad_id: adId,
            interaction_type: response.is_favorite ? 'favorite_add' : 'favorite_remove',
            source_page: 'ad_view',
            session_id: (typeof window !== 'undefined' ? sessionStorage.getItem('visitor_session_id') : undefined) || undefined,
            metadata: {
              timestamp: new Date().toISOString()
            }
          })
        });

        if (trackingResponse.ok) {
          console.log('✅ Favorite interaction tracked successfully');
          // Обновляем только счётчик favorites_count в adData, не перезагружая состояние isFavorite
          if (adData && typeof response.favorites_count === 'number') {
            setAdData(prev => prev ? { ...prev, favorites_count: response.favorites_count } : prev);
          }
        }
      } catch (trackingError) {
        console.error('❌ Error tracking favorite interaction:', trackingError);
      }

      // Показываем сообщение об успехе
      toast({
        title: response.is_favorite ? "Добавлено в избранное" : "Удалено из избранного",
        description: response.message || (response.is_favorite ? 'Объявление добавлено в ваш список избранного' : 'Объявление удалено из избранного'),
        variant: "default"
      });

      // Счётчик favorites_count уже обновлён выше, не нужно перезагружать всю страницу

    } catch (error) {
      console.error('[AdDetailPage] Error toggling favorite:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при изменении статуса избранного. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToFavorites(false);
    }
  }, [isAuthenticated, toast, adId, adData]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adData?.title,
          text: adData?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ title: '✅ Успіх', description: 'Посилання скопійовано в буфер обміну' });
    }
  }, [adData]);

  const nextImage = useCallback(() => {
    if (adData?.images) {
      setCurrentImageIndex((prev) =>
        prev === adData.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [adData]);

  const prevImage = useCallback(() => {
    if (adData?.images) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? adData.images.length - 1 : prev - 1
      );
    }
  }, [adData]);

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS!
  // Debug: compute reset permission early and log (MUST be before any returns!)
  const canShowResetButton = useMemo(() => Boolean(
    user && (
      user.is_superuser ||
      user.id === adData?.user?.id ||
      (user.email && adData?.user?.email && user.email.toLowerCase() === adData.user.email.toLowerCase())
    )
  ), [user, adData?.user?.id, adData?.user?.email]);

  console.log('[AdDetailPage] reset button check:', {
    user: user ? { id: user.id, email: user.email, is_superuser: user.is_superuser } : null,
    adUser: adData?.user ? { id: adData.user.id, email: adData.user.email } : null,
    canShowResetButton
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-8"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="h-12 w-12 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Загружаем объявление</h2>
          <p className="text-slate-600">Пожалуйста, подождите...</p>

          {/* Loading skeleton */}
          <div className="mt-12 max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="loading-shimmer h-64 rounded-3xl"></div>
                <div className="loading-shimmer h-32 rounded-3xl"></div>
              </div>
              <div className="space-y-6">
                <div className="loading-shimmer h-48 rounded-3xl"></div>
                <div className="loading-shimmer h-32 rounded-3xl"></div>
                <div className="loading-shimmer h-40 rounded-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !adData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Ошибка загрузки
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {loadError || 'Объявление не найдено. Возможно, оно было удалено или перемещено.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={loadAdData}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover-lift smooth-transition"
              >
                Попробовать снова
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-2 border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-xl font-semibold"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Назад
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    // Define status configurations with default labels
    const statusConfig = {
      active: { 
        label: 'Активное',
        variant: 'default' as const, 
        icon: CheckCircle 
      },
      pending: { 
        label: 'На модерации',
        variant: 'secondary' as const, 
        icon: Clock 
      },
      rejected: { 
        label: 'Отклонено',
        variant: 'destructive' as const, 
        icon: AlertCircle 
      },
      draft: { 
        label: 'Черновик',
        variant: 'outline' as const, 
        icon: Clock 
      },
      requires_verification: {
        label: 'Требует проверки',
        variant: 'secondary' as const,
        icon: AlertCircle
      },
      // Add any other statuses that might be used
      ...(status && !['active', 'pending', 'rejected', 'draft', 'requires_verification'].includes(status) 
        ? { [status]: { label: status, variant: 'outline' as const, icon: AlertCircle } }
        : {})
    };
    
    // Get the status config or default to a generic status
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: 'outline' as const, 
      icon: AlertCircle 
    };
    
    // First try with the full path, then with just the status
    let translatedLabel = t(`autoria.moderation.status.${status}`, '');
    if (!translatedLabel) {
      translatedLabel = t(status, config.label);
    }
    
    // Fallback to the status if no translation found
    if (translatedLabel === status) {
      translatedLabel = config.label || status;
    }

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {translatedLabel}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
    {/* Main Container */}
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 hover:text-orange-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{tReact('adView.backButton')}</span>
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">{adData.mark_name} {adData.model}</span>
        {showModerationControls && (
          <>
            <span className="text-gray-400">/</span>
            {/* Кнопка сброса счетчиков для владельца/суперпользователя */}
            {canShowResetButton && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const resp = await fetch(`/api/ads/analytics/reset?ad_id=${adData.id}`, { method: 'POST' });
                      if (resp.ok) {
                        // Обнулить метаданные в локальном состоянии
                        setAdData(prev => prev ? { ...prev, meta_views_count: 0, meta_phone_views_count: 0, view_count: 0, phone_views_count: 0 } : prev);
                      }
                    } catch (e) {
                      console.error('Failed to reset counters', e);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Reset counters
                </Button>
                <span className="text-gray-400">/</span>
              </>
            )}

            <Link href={`/autoria/ads/moderate/${adId}`} className="text-orange-500 hover:text-orange-600">
              Модерация
            </Link>
          </>
        )}
        </nav>

        {/* Title and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              {adData.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(adData.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{adData.city_name}, {adData.region_name}</span>
              </div>

              {/* Счетчики */}
              <AdCounters
                ref={adCountersRef}
                adId={adData.id}
                initialCounters={{
                  views_count: adData.meta_views_count || 0,
                  favorites_count: adData.favorites_count || 0,
                  phone_views_count: adData.meta_phone_views_count || 0
                }}
                onFavoriteClick={handleToggleFavorite}
                showClickableButtons={true}
                showResetButton={canShowResetButton}
                counterMode="metadata"
                size="md"
                className="text-gray-500"
              />
              {/* Counters tooltip (instead of inline debug text) */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="Stats" className="inline-flex items-center text-slate-400 hover:text-slate-600">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <div>{t('debug.analyticsViewCount', 'Debug: analytics view_count')}: {adData.view_count ?? 0}</div>
                      <div>{t('debug.metadataViewsCount', 'Metadata views_count')}: {adData.meta_views_count ?? 0}</div>
                      <div>{t('debug.analyticsPhoneViewsCount', 'Debug: analytics phone_views_count')}: {adData.phone_views_count ?? 0}</div>
                      <div>{t('debug.metadataPhoneViewsCount', 'Metadata phone_views_count')}: {adData.meta_phone_views_count ?? 0}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {getStatusBadge(adData.status)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleToggleFavorite}
              disabled={isAddingToFavorites}
              variant="outline"
              size="sm"
              className={`${isFavorite ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-300'}`}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? t('autoria.inFavorites', 'In favorites') : t('autoria.addToFavorites', 'Add to favorites')}
            </Button>

            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('common.share', 'Share')}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Images and Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Block */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {adData.price_usd ? formatCurrency(adData.price_usd, 'USD') : formatCurrency(adData.price, adData.currency)}
              </div>

              {/* Additional currency prices */}
              <div className="space-y-1 text-sm text-gray-600">
                {adData.price_eur && (
                  <div>≈ {formatCurrency(adData.price_eur, 'EUR')}</div>
                )}
                <div>≈ {formatCurrency(adData.price, 'UAH')}</div>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Курсы валют могут изменяться
              </div>
            </div>

            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="relative">
                <div className="relative aspect-video bg-gray-100">
                  {adData.images && adData.images.length > 0 ? (
                    (() => {
                      const currentImage = adData.images[currentImageIndex];
                      const imageUrl = currentImage?.image_display_url || currentImage?.image_url || currentImage?.url || currentImage?.image;
                      console.log('[AdDetailPage] Rendering image:', { currentImageIndex, currentImage, imageUrl });
                      return (
                        <img
                          src={imageUrl}
                          alt={adData.title}
                          className="w-full h-full object-cover"
                          onLoad={() => console.log('[AdDetailPage] Image loaded successfully:', imageUrl)}
                          onError={(e) => {
                            console.error('[AdDetailPage] Image failed to load:', imageUrl);
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/800/400?text=Car+Image';
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Нет изображений</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {adData.images && adData.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                        {currentImageIndex + 1} / {adData.images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {adData.images && adData.images.length > 1 && (
                  <div className="p-4 bg-gray-50">
                    <div className="flex gap-2 overflow-x-auto">
                      {adData.images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden transition-all ${
                            index === currentImageIndex
                              ? 'border-orange-500 ring-2 ring-orange-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={image.image_display_url || image.image}
                            alt={`${adData.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/api/placeholder/100/80?text=Car';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {adData.description && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {tReact('adView.description')}
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {adData.description}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">

            {/* Characteristics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-500" />
                {tReact('adView.characteristics')}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{tReact('adView.type')}:</span>
                  <span className="font-medium text-orange-600">{adData.vehicle_type_name || 'Не указано'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{tReact('adView.brand')}:</span>
                  <span className="font-medium text-orange-600">{adData.mark_name || 'Не указано'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{tReact('adView.model')}:</span>
                  <span className="font-medium text-orange-600">{adData.model || 'Не указано'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{tReact('adView.year')}:</span>
                  <span className="font-medium text-orange-600">{adData.year || 'Не указано'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{tReact('adView.mileage')}:</span>
                  <span className="font-medium text-orange-600">
                    {adData.mileage ? `${adData.mileage.toLocaleString()} км` : 'Не указано'}
                  </span>
                </div>

                {/* Additional specs if available */}
                {adData.car_specs?.fuel_type && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{tReact('adView.fuelType')}:</span>
                    <span className="font-medium text-orange-600">{adData.car_specs.fuel_type}</span>
                  </div>
                )}
                {adData.car_specs?.transmission && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{tReact('adView.transmission')}:</span>
                    <span className="font-medium text-orange-600">{adData.car_specs.transmission}</span>
                  </div>
                )}
                {adData.car_specs?.engine_volume && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Объем двигателя:</span>
                    <span className="font-medium text-orange-600">{adData.car_specs.engine_volume}л</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                {tReact('adView.location')}
              </h3>

              <div className="space-y-2">
                <div className="font-medium text-gray-900">{adData.city_name}</div>
                <div className="text-gray-600">{adData.region_name}</div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                {tReact('adView.contactInfo')}
              </h3>

              <div className="space-y-4">
                {/* Показываем контакты объявления если они есть */}
                {adData.contacts && adData.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {adData.contacts
                      .filter(contact => contact.is_visible) // Показываем только видимые контакты
                      .map((contact, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {contact.type === 'phone' && <Phone className="h-4 w-4 text-gray-500" />}
                          {contact.type === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                          {contact.type === 'telegram' && <span className="text-sm">📲</span>}
                          {contact.type === 'viber' && <span className="text-sm">📡</span>}
                          {contact.type === 'whatsapp' && <span className="text-sm">💬</span>}
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{contact.value}</span>
                            {contact.note && (
                              <div className="text-xs text-gray-500">{contact.note}</div>
                            )}
                            {contact.is_primary && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                {tReact('contacts.primary', 'Primary')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  // Fallback к email пользователя если нет контактов объявления
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{adData.user.email}</span>
                  </div>
                )}

                {adData.user.account_type === 'premium' && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      Премиум продавец
                    </span>
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  {isAuthenticated ? (
                    <>
                      <Button
                        data-phone-button
                        type="button"
                        onClick={async (e) => { e.preventDefault(); e.stopPropagation();
                          // Трекинг просмотра телефона
                          try {
                            console.log('📞 Tracking phone view for ad:', adId);
                            const trackingResponse = await fetch('/api/tracking/ad-interaction/', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                ad_id: adId,
                                interaction_type: 'phone_reveal',
                                source_page: 'ad_view',
                                session_id: (typeof window !== 'undefined' ? (sessionStorage.getItem('visitor_session_id') || (sessionStorage.setItem('visitor_session_id', crypto.randomUUID()), sessionStorage.getItem('visitor_session_id'))) : undefined),
                                metadata: {
                                  timestamp: new Date().toISOString()
                                }
                              })
                            });

                            if (trackingResponse.ok) {
                              console.log('✅ Phone view tracked successfully');
                              // Обновляем только счетчики без перезагрузки всего объявления
                              setTimeout(() => {
                                // Принудительно обновляем счетчики в AdCounters
                                adCountersRef.current?.forceRefresh();
                              }, 800);
                            }
                          } catch (trackingError) {
                            console.error('❌ Error tracking phone view:', trackingError);
                          }

                          // Переключаем выпадающий список телефонов (сохраняем трекинг выше без изменений)
                          // Даже если номеров нет, всё равно покажем дропдаун с деликатным сообщением
                          setShowPhoneList(prev => !prev);
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {tReact('adView.showPhone')}
                      </Button>

                      {showPhoneList && (
                        <div ref={phoneListRef} className="mt-2 w-full rounded-md border bg-white shadow-sm">
                          {(() => {
                            const list = adData.contacts?.filter(c => String(c.type).toLowerCase() === 'phone') || [];
                            if (list.length === 0) {
                              return (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  {tReact('adView.noPhones', 'Продавець не вказав номер телефону.')}<br />
                                  <span className="text-xs text-gray-400">
                                    {tReact('adView.contactByEmail', 'Ви можете написати продавцю на email:')} {adData.user?.email}
                                  </span>
                                </div>
                              );
                            }
                            return list.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-500" />
                                  <a href={`tel:${c.value}`} className="text-sm text-blue-600 hover:underline">{c.value}</a>
                                </div>
                                <div className="flex items-center gap-2">
                                  {c.is_primary && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{tReact('contacts.primary', 'Primary')}</span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await navigator.clipboard.writeText(c.value);
                                        toast({ title: tReact('common.copied', 'Скопійовано'), description: c.value, duration: 1500 });
                                      } catch {
                                        toast({ title: tReact('common.copyFailed', 'Не вдалося скопіювати'), description: c.value, duration: 2000, variant: 'destructive' });
                                      }
                                    }}
                                    className="text-slate-500 hover:text-slate-700"
                                    aria-label={tReact('common.copy', 'Скопіювати')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}


                      <Button
                        variant="outline"
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          const emailContacts = adData.contacts?.filter(c => c.type === 'email' && c.is_visible) || [];
                          const emailAddresses = emailContacts.length > 0
                            ? emailContacts.map(c => c.value).join(',')
                            : adData.user.email;
                          window.open(`mailto:${emailAddresses}`, '_self');
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {tReact('adView.sendEmail')}
                      </Button>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Требуется авторизация</span>
                      </div>
                      <p className="text-xs text-yellow-700 mb-3">
                        Войдите в систему, чтобы увидеть контактную информацию
                      </p>
                      <Button
                        onClick={() => router.push('/auth/login')}
                        size="sm"
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Войти в систему
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};



export default AdDetailPage;
