"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Car,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Lock,
  LogIn,
  Heart,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  Gauge,
  Fuel,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import { CarAd } from '@/types/autoria';
import CarAdsService from '@/services/autoria/carAds.service';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';

const MyAdsPage = () => {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAutoRiaAuth();

  // Функция форматирования цены
  const formatPrice = (price: number, currency: string) => {
    const currencyCode = currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'UAH';
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');
  const [authError, setAuthError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Загрузка данных из API
  const loadAds = async () => {
    try {
      setLoading(true);
      console.log('[MyAdsPage] Loading user ads...', { statusFilter, sortBy, searchTerm });

      // Преобразуем параметры сортировки для API
      let ordering = '-created_at'; // по умолчанию
      switch (sortBy) {
        case 'price_asc':
          ordering = 'price';
          break;
        case 'price_desc':
          ordering = '-price';
          break;
        case 'created_desc':
          ordering = '-created_at';
          break;
        case 'created_asc':
          ordering = 'created_at';
          break;
        case 'views_desc':
          ordering = '-view_count';
          break;
        case 'views_asc':
          ordering = 'view_count';
          break;
        case 'title_asc':
          ordering = 'title';
          break;
        case 'title_desc':
          ordering = '-title';
          break;
      }

      // Используем реальный API для получения объявлений пользователя
      const response = await CarAdsService.getMyCarAds({
        page: 1,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        ordering: ordering,
        search: debouncedSearchTerm.trim() || undefined // Добавляем поиск на backend
      });

      console.log('[MyAdsPage] API response:', response);
      console.log('[MyAdsPage] Number of ads received:', response.results?.length || 0);
      console.log('[MyAdsPage] First ad sample:', response.results?.[0]);

      setAds(response.results || []);
      setLoading(false);
    } catch (error) {
      console.error('[MyAdsPage] Failed to load ads:', error);
      // В случае ошибки показываем пустой список
      setAds([]);
      setLoading(false);
    }
  };

  // Проверка авторизации при загрузке компонента
  useEffect(() => {
    const checkAuthAndLoadAds = async () => {
      console.log('[MyAdsPage] Checking authentication...');

      if (authLoading) {
        console.log('[MyAdsPage] Auth still loading...');
        return;
      }

      if (!isAuthenticated) {
        console.log('[MyAdsPage] User not authenticated, redirecting to login...');
        setAuthError('Для просмотра ваших объявлений необходимо войти в систему');
        setLoading(false);
        return;
      }

      console.log('[MyAdsPage] User authenticated:', user?.email);
      setAuthError(null);
      await loadAds();
    };

    checkAuthAndLoadAds();
  }, [isAuthenticated, authLoading, statusFilter, sortBy, debouncedSearchTerm, user]);

  // Дебаунс для поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms задержка

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Дополнительная проверка токена при монтировании
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  // Обработчик клика по карточке объявления (переход на редактирование для своих объявлений)
  const handleCardClick = useCallback((carId: number) => {
    window.location.href = `/autoria/ads/edit/${carId}`;
  }, []);

  // Обработчик добавления/удаления из избранного (мемоизировано)
  const handleFavoriteToggle = useCallback(async (carId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Предотвращаем клик по карточке

    try {
      const adIndex = ads.findIndex(ad => ad.id === carId);
      if (adIndex === -1) return;

      const currentAd = ads[adIndex];
      const newFavoriteStatus = !currentAd.is_favorite;

      // Оптимистично обновляем UI
      const updatedAds = [...ads];
      updatedAds[adIndex] = { ...currentAd, is_favorite: newFavoriteStatus };
      setAds(updatedAds);

      // Отправляем запрос на сервер
      if (newFavoriteStatus) {
        await CarAdsService.addToFavorites(carId);
      } else {
        await CarAdsService.removeFromFavorites(carId);
      }

    } catch (error) {
      console.error('[MyAdsPage] Error toggling favorite:', error);
      // В случае ошибки возвращаем предыдущее состояние
      await loadAds();
    }
  }, [ads, loadAds]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('statusActive')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('statusPending')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('statusRejected')}</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t('statusInactive')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }, [t]);

  // Фильтрация теперь происходит на backend через API параметры

  // Показываем загрузку во время проверки авторизации
  if (authLoading || (loading && !authError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">
                {authLoading ? 'Проверка авторизации...' : t('autoria.loadingAds')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Показываем ошибку авторизации
  if (authError || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {t('authRequired.title')}
                  </h2>
                  <p className="text-slate-600 mb-6">
                    {authError || t('authRequired.description')}
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link href="/api/auth/signin">
                      <Button className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('authRequired.loginButton')}
                      </Button>
                    </Link>
                    <Link href="/autoria/search">
                      <Button variant="outline" className="w-full">
                        Перейти к поиску
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('myAdsTitle')}</h1>
            <p className="text-slate-600">{t('myAdsDesc')}</p>
            {user && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {user.email}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {user.account_type}
                </Badge>
              </div>
            )}
          </div>
          <Link href="/autoria/create-ad">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('autoria.createAd')}
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder={t('autoria.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {loading && debouncedSearchTerm !== searchTerm && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('autoria.statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('autoria.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('autoria.active')}</SelectItem>
                  <SelectItem value="pending">{t('autoria.pending')}</SelectItem>
                  <SelectItem value="rejected">{t('autoria.rejected')}</SelectItem>
                  <SelectItem value="inactive">{t('autoria.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('autoria.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">{t('autoria.newest')}</SelectItem>
                  <SelectItem value="created_asc">{t('autoria.oldest')}</SelectItem>
                  <SelectItem value="price_desc">{t('autoria.priceHigh')}</SelectItem>
                  <SelectItem value="price_asc">{t('autoria.priceLow')}</SelectItem>
                  <SelectItem value="views_desc">{t('autoria.byViews')}</SelectItem>
                  <SelectItem value="title_asc">По названию (А-Я)</SelectItem>
                  <SelectItem value="title_desc">По названию (Я-А)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Counter */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {ads.length === 0
                ? 'Объявления не найдены'
                : `Найдено ${ads.length} ${ads.length === 1 ? 'объявление' : ads.length < 5 ? 'объявления' : 'объявлений'}`
              }
            </p>
            {(statusFilter !== 'all' || debouncedSearchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                }}
                className="text-xs"
              >
                Сбросить фильтры
              </Button>
            )}
          </div>
        )}

        {/* Ads List */}
        {ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {ads.length === 0 ? t('autoria.noAdsYet') : t('autoria.noAdsFound')}
                </h3>
                <p className="text-slate-600 mb-6">
                  {ads.length === 0
                    ? t('autoria.createFirstAd')
                    : t('autoria.changeSearchParams')
                  }
                </p>
                {ads.length === 0 && (
                  <Link href="/autoria/create-ad">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('autoria.createAd')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <Card key={ad.id} className="hover:shadow-lg transition-shadow duration-300 group">
                <CardContent className="p-0">
                  <div className="block">
                    {/* Image */}
                    <div className="w-full h-48 relative">
                      <img
                        src={ad.images?.[0]?.image_display_url || ad.images?.[0]?.image || '/api/placeholder/400/300'}
                        alt={ad.title}
                        className="w-full h-full object-cover rounded-t-lg cursor-pointer"
                        onClick={() => handleCardClick(ad.id)}
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">
                            {ad.mark_name} {ad.model}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{ad.city_name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            {formatPrice(ad.price, ad.currency)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Eye className="h-3 w-3" />
                              <span>{ad.view_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Heart className="h-3 w-3" />
                              <span>{ad.favorites_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              <span>{ad.phone_views_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                        {ad.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {ad.dynamic_fields?.year && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {ad.dynamic_fields.year}
                          </Badge>
                        )}
                        {ad.dynamic_fields?.mileage && (
                          <Badge variant="outline" className="text-xs">
                            <Gauge className="h-3 w-3 mr-1" />
                            {ad.dynamic_fields.mileage.toLocaleString()} км
                          </Badge>
                        )}
                        {ad.dynamic_fields?.fuel_type && (
                          <Badge variant="outline" className="text-xs">
                            <Fuel className="h-3 w-3 mr-1" />
                            {ad.dynamic_fields.fuel_type}
                          </Badge>
                        )}
                      </div>


                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAdsPage;
