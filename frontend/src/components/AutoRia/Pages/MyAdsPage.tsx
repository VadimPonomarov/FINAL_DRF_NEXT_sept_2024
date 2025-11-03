"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
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
  EyeOff,
  Archive,
  Check,
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
  Phone,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import { CarAd } from '@/types/autoria';
import CarAdsService from '@/services/autoria/carAds.service';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { CurrencySelector } from '@/components/AutoRia/CurrencySelector/CurrencySelector';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

const MyAdsPage = () => {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAutoRiaAuth();
  const ownerEmail = user?.email || '';

  // Унифицированный форматер цены c учетом выбранной валюты
  const { formatPrice } = usePriceConverter();

  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');
  const [authError, setAuthError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  // Загрузка данных из API
  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[MyAdsPage] Loading user ads...', { statusFilter, sortBy, debouncedSearchTerm });

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
        case 'status_asc':
          ordering = 'status';
          break;
        case 'status_desc':
          ordering = '-status';
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

      const items = response.results || [];
      const filtered = statusFilter === 'all' ? items.filter(a => a.status !== 'archived') : items;
      setAds(filtered);
      setSelectedIds(new Set());
      setSelectAll(false);
      setLoading(false);
    } catch (error) {
      console.error('[MyAdsPage] Failed to load ads:', error);
      // В случае ошибки показываем пустой список
      setAds([]);
      setLoading(false);
    }
  }, [statusFilter, sortBy, debouncedSearchTerm]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, statusFilter, sortBy, debouncedSearchTerm]);

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
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t('autoria.moderation.status.draft')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('autoria.moderation.status.pending')}</Badge>;
      case 'needs_review':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{t('autoria.moderation.status.needsReview')}</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('autoria.moderation.status.active')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('autoria.moderation.status.rejected')}</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t('autoria.moderation.status.blocked')}</Badge>;
      case 'sold':
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">{t('autoria.moderation.status.sold')}</Badge>;
      case 'archived':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{t('autoria.moderation.status.archived')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }, [t]);

  const handleOwnerStatusChange = useCallback(async (adId: number, newStatus: string) => {
    try {
      await CarAdsService.updateMyAdStatus(adId, newStatus);
      setAds(prev => prev.map(ad => ad.id === adId ? { ...ad, status: newStatus } : ad));
      
      // Get the translated status name for the toast message
      const statusTranslation = t(`autoria.moderation.status.${newStatus.toLowerCase()}`, newStatus);
      toast({ 
        variant: 'default', 
        title: t('notifications.success', 'Успех'), 
        description: t('autoria.moderation.statusUpdated', `Статус изменен на: ${statusTranslation}`), 
        duration: 2000 
      });
    } catch (e) {
      console.error('Error updating ad status:', e);
      toast({ 
        variant: 'destructive', 
        title: t('notifications.error', 'Ошибка'), 
        description: t('autoria.moderation.statusUpdateFailed', 'Не удалось обновить статус. Пожалуйста, попробуйте снова.'), 
        duration: 3000 
      });
    }
  }, [toast, t]);

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
            <Link href="/autoria/create-ad">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('autoria.createAd')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
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
              {/* Currency selector */}
              <div className="w-full sm:w-auto"><CurrencySelector className="w-full" showLabel={false} /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('autoria.statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('autoria.moderation.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('autoria.moderation.status.draft')}</SelectItem>
                  <SelectItem value="pending">{t('autoria.moderation.status.pending')}</SelectItem>
                  <SelectItem value="needs_review">{t('autoria.moderation.status.needsReview')}</SelectItem>
                  <SelectItem value="active">{t('autoria.moderation.status.active')}</SelectItem>
                  <SelectItem value="rejected">{t('autoria.moderation.status.rejected')}</SelectItem>
                  <SelectItem value="blocked">{t('autoria.moderation.status.blocked')}</SelectItem>
                  <SelectItem value="sold">{t('autoria.moderation.status.sold')}</SelectItem>
                  <SelectItem value="archived">{t('autoria.moderation.status.archived')}</SelectItem>
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
                  <SelectItem value="status_asc">{t('autoria.moderation.status')}</SelectItem>
                  <SelectItem value="status_desc">{t('autoria.moderation.status')} ↓</SelectItem>
                </SelectContent>
              </Select>
              {/* View toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  title="Сетка"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  title="Список"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
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
            <div className="flex items-center gap-4">
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
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectAll(checked);
                    if (checked) setSelectedIds(new Set(ads.map(a => a.id)));
                    else setSelectedIds(new Set());
                  }}
                />
                Выбрать все
              </label>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      await Promise.allSettled(ids.map(id => CarAdsService.updateMyAdStatus(id, 'active')));
                      await loadAds();
                    }}
                  >{t('autoria.moderation.status.active')}</Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      await Promise.allSettled(ids.map(id => CarAdsService.updateMyAdStatus(id, 'draft')));
                      await loadAds();
                    }}
                  >{t('autoria.hide')}</Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      await Promise.allSettled(ids.map(id => CarAdsService.updateMyAdStatus(id, 'archived')));
                      await loadAds();
                    }}
                  >{t('autoria.moderation.status.archived')}</Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      await Promise.allSettled(ids.map(id => CarAdsService.updateMyAdStatus(id, 'sold')));
                      await loadAds();
                    }}
                  >{t('autoria.moderation.status.sold')}</Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await CarAdsService.bulkDeleteMyAds(Array.from(selectedIds));
                      await loadAds();
                    }}
                  >{t('delete')}</Button>
                </div>
              )}
            </div>
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <MyAdCard
                key={ad.id}
                ad={ad}
                onClick={handleCardClick}
                onDelete={async (id) => { await CarAdsService.deleteCarAd(id); await loadAds(); }}
                onStatusChange={handleOwnerStatusChange}
                ownerEmail={ownerEmail}
                formatPrice={(a) => formatPrice(a)}
                selected={selectedIds.has(ad.id)}
                onToggleSelected={(id, checked) => setSelectedIds(prev => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; })}
                viewLabel={t('view')}
                editLabel={t('edit')}
                activateLabel={t('autoria.moderation.activate')}
                hideLabel={t('autoria.hide')}
                archiveLabel={t('autoria.moderation.status.archived')}
                soldLabel={t('autoria.moderation.status.sold')}
                deleteLabel={t('delete')}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="flex gap-4 p-3 bg-white rounded-lg shadow-sm hover:shadow transition">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(ad.id)}
                  onChange={(e) => setSelectedIds(prev => { const next = new Set(prev); if (e.target.checked) next.add(ad.id); else next.delete(ad.id); return next; })}
                />
                <img src={ad.images?.[0]?.image_display_url || ad.images?.[0]?.image || '/api/placeholder/200/150'} alt={ad.title} className="w-40 h-28 object-cover rounded cursor-pointer" onClick={() => handleCardClick(ad.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{ad.mark_name} {ad.model}</div>
                      <div className="text-slate-600 text-sm truncate">{ad.description}</div>
                      {ownerEmail && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1" title={ownerEmail}>
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[180px]">{ownerEmail}</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {ad.dynamic_fields?.year && <Badge variant="outline" className="text-xs">{ad.dynamic_fields.year}</Badge>}
                        {ad.dynamic_fields?.mileage && <Badge variant="outline" className="text-xs">{ad.dynamic_fields.mileage.toLocaleString()} км</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-blue-600 tabular-nums">{formatPrice(ad)}</div>
                      <div className="mt-1">{getStatusBadge(ad.status)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => window.location.href = `/autoria/ads/view/${ad.id}`} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('view')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => window.location.href = `/autoria/ads/edit/${ad.id}`} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('edit')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" className="h-8 w-8" onClick={() => handleOwnerStatusChange(ad.id, 'active')}><Check className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('autoria.moderation.activate')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8" 
                            onClick={() => handleOwnerStatusChange(ad.id, 'draft')}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('autoria.hide')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8" 
                            onClick={() => handleOwnerStatusChange(ad.id, 'archived')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('autoria.moderation.status.archived')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8" 
                            onClick={() => handleOwnerStatusChange(ad.id, 'sold')}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('autoria.moderation.status.sold')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => CarAdsService.deleteCarAd(ad.id).then(loadAds)}><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('delete')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Мемоизированная карточка объявления в сетке
const MyAdCard: React.FC<{
  ad: CarAd;
  onClick: (id: number) => void;
  onDelete: (id: number) => Promise<void> | void;
  onStatusChange: (id: number, status: string) => Promise<void> | void;
  formatPrice: (ad: CarAd) => string;
  selected: boolean;
  onToggleSelected: (id: number, checked: boolean) => void;
  viewLabel: string;
  editLabel: string;
  activateLabel: string;
  hideLabel: string;
  archiveLabel: string;
  soldLabel: string;
  deleteLabel: string;
  getStatusBadge: (status: string) => React.ReactNode;
  ownerEmail?: string;
}> = memo(({ ad, onClick, onDelete, onStatusChange, formatPrice, selected, onToggleSelected, viewLabel, editLabel, activateLabel, hideLabel, archiveLabel, soldLabel, deleteLabel, getStatusBadge, ownerEmail }) => {
  const { t } = useI18n();
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 group">
                <CardContent className="p-0">
                  <div className="block">
                    <div className="w-full h-48 relative">
                      <img
                        src={ad.images?.[0]?.image_display_url || ad.images?.[0]?.image || '/api/placeholder/400/300'}
                        alt={ad.title}
                        className="w-full h-full object-cover rounded-t-lg cursor-pointer"
              onClick={() => onClick(ad.id)}
                      />
            <div className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-1 shadow">
              <input type="checkbox" checked={selected} onChange={(e) => onToggleSelected(ad.id, e.target.checked)} />
            </div>
                    </div>
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
                          {ownerEmail && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-2" title={ownerEmail}>
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{ownerEmail}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600 tabular-nums">
                            {formatPrice(ad)}
                          </div>
                          <div className="mt-1">
                            {getStatusBadge(ad.status)}
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

            <div className="flex flex-wrap gap-2 items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={() => window.location.href = `/autoria/ads/view/${ad.id}`} className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{viewLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={() => window.location.href = `/autoria/ads/edit/${ad.id}`} className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{editLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                          <Button size="icon" onClick={() => onStatusChange(ad.id, 'active')} className="h-8 w-8" variant="default">
                      <Check className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{activateLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                          <Button size="icon" variant="secondary" onClick={() => onStatusChange(ad.id, 'draft')} className="h-8 w-8">
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{hideLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={() => onStatusChange(ad.id, 'archived')} className="h-8 w-8">
                      <Archive className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{archiveLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={() => onStatusChange(ad.id, 'sold')} className="h-8 w-8">
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{soldLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="destructive" onClick={() => onDelete(ad.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{deleteLabel}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
  );
});

export default MyAdsPage;
