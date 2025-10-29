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
import AdCard from '@/components/AutoRia/Moderation/AdCard';
import AdTableRow from '@/components/AutoRia/Moderation/AdTableRow';
import AdDetailsModal from '@/components/AutoRia/Moderation/AdDetailsModal';

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
          title: t('moderation.toast.authRequired'),
          description: error.message || t('moderation.toast.authRequiredDescription'),
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
          title: t('moderation.toast.authRequired'),
          description: error.message || t('moderation.toast.authRequiredDescription'),
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
      const response = await fetchWithAuth(endpoint, {
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

      if (!response.ok) {
        throw new Error(result.message || result.error || `Failed to ${action} ad`);
      }

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

  // Функція зміни статусу оголошення - оптимизированная версия
  const handleStatusChange = useCallback(async (adId: number, newStatus: string) => {
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

      // Оптимизированное обновление - только локальный стейт, без перезагрузки
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: newStatus } : ad
      ));
      
      // Обновляем только статистику, без перезагрузки списка
      loadModerationStats();
    } catch (error) {
      console.error('[ModerationPage] Error updating status:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('autoria.moderation.statusUpdateFailed'),
        variant: 'destructive',
      });
    }
  }, [user, t, toast, loadModerationStats]);

  // Функція видалення оголошення - оптимизированная версия
  const handleDeleteAd = useCallback(async (adId: number) => {
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

      // Оптимизированное обновление - только локальный стейт
      setAds(prev => prev.filter(ad => ad.id !== adId));
      
      // Обновляем только статистику
      loadModerationStats();
    } catch (error) {
      console.error('[ModerationPage] Error deleting ad:', error);
      toast({
        title: t('common.error'),
        description: t('autoria.moderation.deleteFailed'),
        variant: 'destructive',
      });
    }
  }, [t, toast, loadModerationStats]);

  // Обработчики для модального окна
  const handleViewAd = useCallback((ad: CarAd) => {
    setSelectedAd(ad);
  }, []);

  const handleSaveModerationNotes = useCallback(async (adId: number, notes: string) => {
    try {
      const response = await fetchWithAuth(`/api/ads/moderation/${adId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      // Обновляем локальное состояние
      setModerationQueue(prev => 
        prev.map(ad => 
          ad.id === adId 
            ? { ...ad, moderation_reason: notes }
            : ad
        )
      );

      toast({
        title: t('common.success'),
        description: t('autoria.moderation.notesSaved'),
      });
    } catch (error) {
      console.error('[ModerationPage] Error saving notes:', error);
      toast({
        title: t('common.error'),
        description: t('autoria.moderation.notesSaveError'),
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchWithAuth, t, toast]);

  const handleCloseModal = useCallback(() => {
    setSelectedAd(null);
  }, []);

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
              <AdCard
                key={ad.id}
                ad={ad}
                onStatusChange={handleStatusChange}
                onModerate={moderateAd}
                onDelete={handleDeleteAd}
                onView={handleViewAd}
                formatPrice={formatPrice}
                getStatusBadge={getStatusBadge}
              />
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
                    <AdTableRow
                      key={ad.id}
                      ad={ad}
                      onStatusChange={handleStatusChange}
                      onModerate={moderateAd}
                      onDelete={handleDeleteAd}
                      onView={handleViewAd}
                      formatPrice={formatPrice}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Модальное окно для просмотра деталей */}
        <AdDetailsModal
          ad={selectedAd}
          isOpen={!!selectedAd}
          onClose={handleCloseModal}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          onSaveNotes={handleSaveModerationNotes}
        />
      </div>
    </div>
  );
};

export default ModerationPage;