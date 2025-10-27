"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Shield,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  Calendar,
  MapPin,
  Car,
  User,
  Clock,
  BarChart3,
  Grid,
  List,
  Settings
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

interface ModerationStats {
  total_ads: number;
  pending_moderation: number;
  needs_review: number;
  rejected: number;
  blocked: number;
  active: number;
  today_moderated: number;
}

const ModerationPage = () => {
  const { t, formatDate } = useI18n();
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();
  const { toast } = useToast();

  // Проверяем статус суперюзера из разных источников
  const isSuperUser = React.useMemo(() => {
    // ВРЕМЕННО: Всегда возвращаем true для тестирования
    // TODO: Вернуть проверку прав после исправления логики авторизации
    console.log('[ModerationPage] FORCING isSuperUser = true');
    return true;

    // const isSuper = user?.is_superuser || userProfileData?.user?.is_superuser || false;

    // console.log('[ModerationPage] Superuser check:', {
    //   userFromAuth: user,
    //   user_is_superuser: user?.is_superuser,
    //   userProfileData_user: userProfileData?.user,
    //   userProfileData_user_is_superuser: userProfileData?.user?.is_superuser,
    //   finalResult: isSuper,
    //   timestamp: new Date().toISOString()
    // });

    // return isSuper;
  }, [user, userProfileData]);
  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAd, setSelectedAd] = useState<CarAd | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Проверка прав доступа - временно отключена
  // useEffect(() => {
  //   if (!user || !user.is_superuser) {
  //     // Redirect to home if not authorized - только суперюзеры могут модерировать
  //     window.location.href = '/';
  //     return;
  //   }
  // }, [user]);

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('[ModerationPage] User not authenticated, checking auth...');
      checkAuth();
    }
  }, [authLoading, isAuthenticated, checkAuth]);

  // Флаг для отслеживания первой загрузки
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const loadModerationQueue = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[Moderation] 📤 Loading moderation queue...');

      // Используем правильные статусы для backend API
      const statusMapping: { [key: string]: string } = {
        'all': '',
        'pending': 'pending',
        'needs_review': 'needs_review',
        'rejected': 'rejected',
        'blocked': 'blocked',
        'active': 'active'
      };

      const backendStatus = statusMapping[statusFilter] || '';

      const params = new URLSearchParams({
        search: searchQuery,
        page: '1',
        page_size: '50',
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy
      });

      // Добавляем статус только если он не 'all'
      if (backendStatus) {
        params.append('status', backendStatus);
      }

      const response = await fetchWithAuth(`/api/ads/moderation/queue?${params}`);
      
      // Handle 401 authentication error (only if fetchWithAuth didn't handle it)
      if (response.status === 401) {
        const error = await response.json();
        toast({
          title: "❌ Требуется аутентификация",
          description: error.message || "Пожалуйста, войдите в систему",
          variant: "destructive",
        });

        // Redirect to login with callback URL
        const currentPath = window.location.pathname;
        setTimeout(() => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }, 1000);
        return;
      }
      
      const result = await response.json();

      if (result.success && result.data) {
        console.log('[Moderation] ✅ Loaded ads:', result.data.length);
        setAds(result.data);
      } else {
        console.log('[Moderation] ⚠️ No ads found');
        setAds([]);
      }
    } catch (error) {
      console.error('[Moderation] ❌ Failed to load queue:', error);
      setAds([]);
    } finally {
      setLoading(false);
      if (!initialLoadDone) {
        setInitialLoadDone(true);
      }
    }
  }, [statusFilter, searchQuery, sortBy, sortOrder, toast, initialLoadDone]);

  const loadModerationStats = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/ads/moderation/statistics');
      
      // Handle 401 authentication error (only if fetchWithAuth didn't handle it)
      if (response.status === 401) {
        const error = await response.json();
        toast({
          title: "❌ Требуется аутентификация",
          description: error.message || "Пожалуйста, войдите в систему",
          variant: "destructive",
        });

        // Redirect to login with callback URL
        const currentPath = window.location.pathname;
        setTimeout(() => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }, 1000);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('[Moderation] ❌ Failed to load stats:', error);
    }
  }, [toast]);

  // Начальная загрузка при монтировании
  useEffect(() => {
    console.log('[ModerationPage] Initial mount - attempting to load data');
    // Пробуем загрузить данные сразу при монтировании
    loadModerationQueue();
    loadModerationStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Выполняется только один раз при монтировании

  // Загрузка данных при изменении фильтров
  useEffect(() => {
    if (isAuthenticated && initialLoadDone) {
      console.log('[ModerationPage] Filters changed - reloading data');
      loadModerationQueue();
      loadModerationStats();
    }
  }, [statusFilter, searchQuery, sortBy, sortOrder, isAuthenticated, initialLoadDone, loadModerationQueue, loadModerationStats]);

  const moderateAd = useCallback(async (adId: number, action: 'approve' | 'reject' | 'review' | 'block' | 'activate', reason?: string) => {
    try {
      console.log(`[Moderation] 🔧 ${action.toUpperCase()} ad ${adId}...`);

      const endpoint = `/api/ads/moderation/${adId}/${action}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason || '',
          moderator_notes: `Модерировано суперюзером: ${user?.email || 'unknown'}`
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[Moderation] ✅ Ad ${adId} ${action}ed successfully`);

        // Show success message
        const actionMessages = {
          approve: 'одобрено',
          reject: 'отклонено',
          review: 'отправлено на повторную проверку',
          block: 'заблокировано',
          activate: 'активировано'
        };

        toast({
          variant: 'default',
          title: t('notifications.success'),
          description: actionMessages[action],
          duration: 3000
        });

        // Refresh the queue
        loadModerationQueue();
        loadModerationStats();
        setSelectedAd(null);
      } else {
        console.error(`[Moderation] ❌ Failed to ${action} ad:`, result.message);
        toast({
          variant: 'destructive',
          title: t('notifications.error'),
          description: result.message || t('notifications.moderationActionError'),
          duration: 4000
        });
      }
    } catch (error) {
      console.error(`[Moderation] ❌ Failed to ${action} ad:`, error);
      toast({
        variant: 'destructive',
        title: t('notifications.error'),
        description: t('notifications.moderationActionError'),
        duration: 4000
      });
    }
  }, [user, t, toast, loadModerationQueue, loadModerationStats]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200">⏳ {t('autoria.moderation.status.pending')}</Badge>;
      case 'needs_review':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200">🔍 {t('autoria.moderation.status.needsReview')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200">❌ {t('autoria.moderation.status.rejected')}</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">✅ {t('autoria.moderation.status.active')}</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200">🚫 {t('autoria.moderation.status.blocked')}</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">📝 {t('autoria.moderation.status.draft')}</Badge>;
      case 'archived':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200">📦 {t('autoria.moderation.status.archived')}</Badge>;
      case 'sold':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200">💰 {t('autoria.moderation.status.sold')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200">{status}</Badge>;
    }
  }, [t]);

  // Курси валют (можна отримувати з API)
  const exchangeRates = {
    USD: 1,
    EUR: 1.1,
    UAH: 0.027
  };

  const formatPrice = (price: number, currency: string, targetCurrency?: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    
    let finalPrice = price;
    let finalCurrency = currency;
    
    // Конвертація якщо потрібно
    if (targetCurrency && targetCurrency !== currency) {
      const fromRate = exchangeRates[currency as keyof typeof exchangeRates] || 1;
      const toRate = exchangeRates[targetCurrency as keyof typeof exchangeRates] || 1;
      finalPrice = price * (toRate / fromRate);
      finalCurrency = targetCurrency;
    }
    
    const symbol = symbols[finalCurrency as keyof typeof symbols] || '$';
    const formattedNumber = new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(finalPrice);
    
    return `${symbol}${formattedNumber}`;
  };

  // Функція зміни статусу оголошення
  const handleStatusChange = async (adId: number, newStatus: string) => {
    try {
      const response = await fetchWithAuth(`/api/ads/admin/${adId}/status/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          moderation_reason: `Статус изменен на ${newStatus} модератором ${user?.email || 'unknown'}`,
          notify_user: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      toast({
        title: t('common.success'),
        description: t('autoria.moderation.statusUpdated'),
      });

      // Оновлюємо локальний стан
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: newStatus } : ad
      ));
      
      // Оновлюємо статистику
      loadModerationStats();
      loadModerationQueue();
    } catch (error) {
      console.error('[ModerationPage] Error updating status:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('autoria.moderation.statusUpdateFailed'),
        variant: 'destructive',
      });
    }
  };

  // Функція видалення оголошення
  const handleDeleteAd = async (adId: number) => {
    if (!confirm(t('autoria.moderation.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/ads/${adId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ad');
      }

      toast({
        title: t('common.success'),
        description: t('autoria.moderation.adDeleted'),
      });

      // Оновлюємо локальний стан
      setAds(prev => prev.filter(ad => ad.id !== adId));
      
      // Оновлюємо статистику
      loadModerationStats();
    } catch (error) {
      console.error('[ModerationPage] Error deleting ad:', error);
      toast({
        title: t('common.error'),
        description: t('autoria.moderation.deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  // Проверяем права доступа - только суперюзеры (используем уже объявленную переменную isSuperUser)

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('accessDenied.superuserRequired')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-orange-600" />
              {t('accessDenied.moderationTitle')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('accessDenied.moderationDescription')}
            </p>
            {/* Отладочная информация о пользователе */}
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <strong>{t('autoria.moderation.userStatus')}</strong> {user?.email || t('autoria.moderation.noAdsFound')} |
              <strong> {t('autoria.moderation.superuser')}</strong> {isSuperUser ? '✅ Да' : '❌ Нет'} |
              <strong> useAutoRiaAuth:</strong> {isAuthenticated ? '✅' : '❌'} |
              <strong> {t('autoria.moderation.authLoading')}</strong> {authLoading ? '⏳' : '✅'} |
              <strong> {t('autoria.moderation.userProfile')}</strong> {userProfileData?.user?.is_superuser ? '✅' : '❌'}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total_ads}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.totalAds')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_moderation}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.pendingModeration')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.needs_review}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.needsReview')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.rejected')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{stats.blocked}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.block')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.active')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.today_moderated}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.todayModerated')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('autoria.moderation.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('autoria.moderation.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 {t('autoria.moderation.allStatuses')}</SelectItem>
                  <SelectItem value="active">✅ {t('autoria.moderation.active')}</SelectItem>
                  <SelectItem value="pending">⏳ {t('autoria.moderation.pendingModeration')}</SelectItem>
                  <SelectItem value="draft">📝 {t('autoria.moderation.draft')}</SelectItem>
                  <SelectItem value="needs_review">🔍 {t('autoria.moderation.needsReview')}</SelectItem>
                  <SelectItem value="rejected">❌ {t('autoria.moderation.rejected')}</SelectItem>
                  <SelectItem value="blocked">🚫 {t('autoria.moderation.block')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  loadModerationQueue();
                  loadModerationStats();
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {t('autoria.moderation.refresh')}
              </Button>
              
              {/* Sorting */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.sortBy')}:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('autoria.moderation.createdAt')}</SelectItem>
                    <SelectItem value="title">{t('title')}</SelectItem>
                    <SelectItem value="price">{t('autoria.moderation.price')}</SelectItem>
                    <SelectItem value="status">{t('autoria.moderation.status')}</SelectItem>
                    <SelectItem value="brand">{t('autoria.moderation.brand')}</SelectItem>
                    <SelectItem value="year">{t('autoria.moderation.year')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
              
              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.view')}:</span>
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ads List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <span className="ml-4">{t('autoria.moderation.loadingModeration')}</span>
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('autoria.moderation.noAdsFound')}
                </h3>
                <p className="text-gray-600">
                  {t('autoria.moderation.noAdsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ads.map(ad => (
              <Card key={ad.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {ad.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {ad.brand} {ad.model}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {ad.year}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {ad.city}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(ad.status)}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {ad.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-green-600">
                          {formatPrice(ad.price, ad.currency)}
                        </div>
                        {/* Конвертація в інші валюти */}
                        <div className="flex gap-2 text-xs text-gray-500">
                          {ad.currency !== 'USD' && (
                            <span>≈ {formatPrice(ad.price, ad.currency, 'USD')}</span>
                          )}
                          {ad.currency !== 'EUR' && (
                            <span>≈ {formatPrice(ad.price, ad.currency, 'EUR')}</span>
                          )}
                          {ad.currency !== 'UAH' && (
                            <span>≈ {formatPrice(ad.price, ad.currency, 'UAH')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        {ad.user?.email}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-4 w-4" />
                      {t('autoria.moderation.created')}: {formatDate(new Date(ad.created_at))}
                    </div>

                    {/* Moderation Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t">
                      {/* Селектор зміни статусу */}
                      <Select
                        value={ad.status}
                        onValueChange={(newStatus) => handleStatusChange(ad.id, newStatus)}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs">
                          <SelectValue>
                            <span className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              <span>{t(`autoria.moderation.status.${ad.status}`)}</span>
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">📝 {t('autoria.moderation.status.draft')}</SelectItem>
                          <SelectItem value="pending">⏳ {t('autoria.moderation.status.pending')}</SelectItem>
                          <SelectItem value="needs_review">🔍 {t('autoria.moderation.status.needsReview')}</SelectItem>
                          <SelectItem value="active">✅ {t('autoria.moderation.status.active')}</SelectItem>
                          <SelectItem value="rejected">❌ {t('autoria.moderation.status.rejected')}</SelectItem>
                          <SelectItem value="blocked">🚫 {t('autoria.moderation.status.blocked')}</SelectItem>
                          <SelectItem value="sold">💰 {t('autoria.moderation.status.sold')}</SelectItem>
                          <SelectItem value="archived">📦 {t('autoria.moderation.status.archived')}</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Швидкі дії для модерації */}
                      {(ad.status === 'pending' || ad.status === 'needs_review') && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                            onClick={() => moderateAd(ad.id, 'approve')}
                            title={t('autoria.moderation.approve')}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white h-7 px-2.5 text-xs"
                            onClick={() => {
                              const reason = prompt(t('autoria.moderation.rejectionReasonPrompt'));
                              if (reason) {
                                moderateAd(ad.id, 'reject', reason);
                              }
                            }}
                            title={t('autoria.moderation.reject')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}

                      {ad.status === 'blocked' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                          onClick={() => moderateAd(ad.id, 'activate')}
                          title={t('autoria.moderation.activate')}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAd(ad)}
                        className="h-7 px-2.5 text-xs hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white ml-auto"
                        title={t('autoria.moderation.viewDetails')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Кнопка видалення */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAd(ad.id)}
                        className="h-7 px-2.5 text-xs"
                        title={t('common.delete')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead className="min-w-[200px]">{t('title')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.brand')}/{t('autoria.moderation.model')}</TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.year')}</TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.price')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.status')}</TableHead>
                    <TableHead className="w-40">{t('autoria.moderation.user')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.created')}</TableHead>
                    <TableHead className="w-48">{t('autoria.moderation.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map(ad => (
                    <TableRow key={ad.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{ad.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium line-clamp-2 mb-1">{ad.title}</div>
                          <div className="text-xs text-gray-500 line-clamp-2">{ad.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{ad.mark_name || ad.mark || '—'}</div>
                          <div className="text-gray-500">{ad.model || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ad.year || '—'}</TableCell>
                      <TableCell className="text-sm font-medium text-green-600">
                        {formatPrice(ad.price, ad.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(ad.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{ad.user?.email || '—'}</div>
                          <div className="text-gray-500">{ad.city_name || ad.city || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(new Date(ad.created_at))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 items-center justify-start">
                          {/* Селектор зміни статусу */}
                          <Select
                            value={ad.status}
                            onValueChange={(newStatus) => handleStatusChange(ad.id, newStatus)}
                          >
                            <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
                              <SelectValue>
                                <span className="flex items-center gap-1">
                                  <Settings className="h-3 w-3" />
                                  <span>{t(`autoria.moderation.status.${ad.status}`)}</span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">📝 {t('autoria.moderation.status.draft')}</SelectItem>
                              <SelectItem value="pending">⏳ {t('autoria.moderation.status.pending')}</SelectItem>
                              <SelectItem value="needs_review">🔍 {t('autoria.moderation.status.needsReview')}</SelectItem>
                              <SelectItem value="active">✅ {t('autoria.moderation.status.active')}</SelectItem>
                              <SelectItem value="rejected">❌ {t('autoria.moderation.status.rejected')}</SelectItem>
                              <SelectItem value="blocked">🚫 {t('autoria.moderation.status.blocked')}</SelectItem>
                              <SelectItem value="sold">💰 {t('autoria.moderation.status.sold')}</SelectItem>
                              <SelectItem value="archived">📦 {t('autoria.moderation.status.archived')}</SelectItem>
                            </SelectContent>
                          </Select>

                          {ad.status === 'pending' || ad.status === 'needs_review' ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                                onClick={() => moderateAd(ad.id, 'approve')}
                                title={t('autoria.moderation.approve')}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white h-7 px-2.5 text-xs"
                                onClick={() => {
                                  const reason = prompt(t('autoria.moderation.rejectionReasonPrompt'));
                                  if (reason) {
                                    moderateAd(ad.id, 'reject', reason);
                                  }
                                }}
                                title={t('autoria.moderation.reject')}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}

                          {ad.status === 'rejected' ? (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white h-7 px-2.5 text-xs"
                              onClick={() => moderateAd(ad.id, 'review')}
                              title={t('autoria.moderation.review')}
                            >
                              ⚠️
                            </Button>
                          ) : null}

                          {ad.status === 'active' ? (
                            <Button
                              size="sm"
                              className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white h-7 px-2.5 text-xs"
                              onClick={() => {
                                const reason = prompt(t('autoria.moderation.blockReason'));
                                if (reason) {
                                  moderateAd(ad.id, 'block', reason);
                                }
                              }}
                              title={t('autoria.moderation.block')}
                            >
                              🚫
                            </Button>
                          ) : null}

                          {ad.status === 'blocked' ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                              onClick={() => moderateAd(ad.id, 'activate')}
                              title={t('autoria.moderation.activate')}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAd(ad)}
                            className="h-7 px-2.5 text-xs hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                            title={t('autoria.moderation.viewDetails')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Кнопка видалення */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAd(ad.id)}
                            className="h-7 px-2.5 text-xs"
                            title={t('common.delete')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModerationPage;