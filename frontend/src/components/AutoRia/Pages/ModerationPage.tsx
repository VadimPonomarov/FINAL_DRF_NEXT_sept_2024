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
import { CarAd } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaAuth } from '@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/modules/autoria/shared/hooks/useUserProfileData';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';
import CarAdsService from '@/services/autoria/carAds.service';
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
    const isSuper = user?.is_superuser || userProfileData?.user?.is_superuser || false;

    console.log('[ModerationPage] Superuser check:', {
      userFromAuth: user,
      user_is_superuser: user?.is_superuser,
      userProfileData_user: userProfileData?.user,
      userProfileData_user_is_superuser: userProfileData?.user?.is_superuser,
      finalResult: isSuper,
      timestamp: new Date().toISOString()
    });

    return isSuper;
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
  const [targetCurrency, setTargetCurrency] = useState<'UAH' | 'USD' | 'EUR'>('UAH');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Проверка прав доступа и авторизации (только один раз)
  const accessCheckedRef = React.useRef(false);
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      if (accessCheckedRef.current) return; // Уже проверили, не повторяем

      accessCheckedRef.current = true;

      if (!isAuthenticated) {
        console.log('[ModerationPage] User not authenticated, redirecting to login...');
        const { redirectToAuth } = await import('@/shared/utils/auth/redirectToAuth');
        redirectToAuth(window.location.pathname, 'auth_required');
        return;
      }

      if (!isSuperUser) {
        console.log('[ModerationPage] User not authorized (not superuser), redirecting to home...');
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('autoria.moderation.accessDenied'),
          duration: 3000
        });
        setTimeout(() => {
          window.location.href = '/autoria';
        }, 1000);
        return;
      }

      console.log('[ModerationPage] ✅ Access granted for superuser');
    };

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

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
      
      // fetchWithAuth handles 401 automatically, just check if response is ok
      if (!response.ok) {
        console.error('[Moderation] Queue request failed:', response.status);
        setAds([]);
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
      
      // fetchWithAuth handles 401 automatically, just check if response is ok
      if (!response.ok) {
        console.error('[Moderation] Stats request failed:', response.status);
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

  // Загрузка данных при изменении фильтров - БЕЗ loadModerationQueue и loadModerationStats в зависимостях
  useEffect(() => {
    if (isAuthenticated && initialLoadDone) {
      console.log('[ModerationPage] Filters changed - reloading data');
      loadModerationQueue();
      loadModerationStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery, sortBy, sortOrder, isAuthenticated, initialLoadDone]);

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

      // Try to parse JSON, but don't rely on specific shape
      let result: any = null;
      try { result = await response.json(); } catch { result = null; }

      if (!response.ok) {
        const msg = result?.message || result?.error || `Failed to ${action} ad`;
        throw new Error(msg);
      }

      // Success path: update local state optimistically without full reload
      const actionMessages = {
        approve: t('notifications.moderationApproved'),
        reject: t('notifications.moderationRejected'),
        review: t('notifications.moderationReviewSent'),
        block: t('notifications.moderationBlocked'),
        activate: t('notifications.moderationActivated')
      } as const;

      // Map quick-action to resulting status
      const nextStatusMap: Record<typeof action, string> = {
        approve: 'active',
        reject: 'rejected',
        review: 'needs_review',
        block: 'blocked',
        activate: 'active'
      };

      const newStatus = nextStatusMap[action];
      setAds(prev => prev.map((ad: any) => ad.id === adId ? { ...ad, status: newStatus } : ad));
      setSelectedAd(null);
      // Update only stats, avoid reloading the whole list
      loadModerationStats();

      toast({
        variant: 'default',
        title: t('notifications.success'),
        description: actionMessages[action],
        duration: 2500
      });

    } catch (error) {
      console.error(`[Moderation] ❌ Failed to ${action} ad:`, error);
      toast({
        variant: 'destructive',
        title: t('notifications.error'),
        description: t('notifications.moderationActionError'),
        duration: 3500
      });
    }
  }, [user, t, toast, loadModerationStats]);

  // Bulk moderation (approve/reject/block/activate) with fallback per-item
  const bulkModerate = useCallback(async (
    action: 'approve' | 'reject' | 'review' | 'block' | 'activate',
    reason?: string
  ) => {
    const ids = Array.from(selectedIds.values());
    if (ids.length === 0) return;

    try {
      const resp = await fetchWithAuth('/api/ads/moderation/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, reason: reason || '' })
      });
      if (resp.ok) {
        toast({ title: t('common.success'), description: t('autoria.moderation.bulkDone') });
      } else {
        // fallback
        await Promise.allSettled(ids.map(id => moderateAd(id, action, reason)));
      }
    } catch {
      await Promise.allSettled(ids.map(id => moderateAd(id, action, reason)));
    }

    setSelectedIds(new Set());
    setSelectAll(false);
    loadModerationQueue();
    loadModerationStats();
  }, [selectedIds, moderateAd, t, toast, loadModerationQueue, loadModerationStats]);

  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds.values());
    if (ids.length === 0) return;
    if (!confirm(t('autoria.moderation.confirmBulkDelete') || 'Видалити вибрані оголошення?')) return;
    try {
      const resp = await fetchWithAuth('/api/ads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!resp.ok) {
        await Promise.allSettled(ids.map(id => fetchWithAuth(`/api/ads/${id}/`, { method: 'DELETE' })));
      }
      toast({ title: t('common.success'), description: t('autoria.moderation.bulkDeleted') });
    } catch (e) {
      toast({ title: t('common.error'), description: t('autoria.moderation.deleteFailed'), variant: 'destructive' });
    }
    setSelectedIds(new Set());
    setSelectAll(false);
    loadModerationQueue();
    loadModerationStats();
  }, [selectedIds, t, toast, loadModerationQueue, loadModerationStats]);

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

  // Актуальные курсы из БД (UAH как база)
  const [currencyRates, setCurrencyRates] = useState<{ USD: number; EUR: number; UAH: number }>({ USD: 41.6, EUR: 45.5, UAH: 1 });
  useEffect(() => {
    const loadRates = async () => {
      try {
        const resp = await fetch('/api/currency/rates/', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const next = { USD: 41.6, EUR: 45.5, UAH: 1 } as { USD: number; EUR: number; UAH: number };
          if (Array.isArray(data?.rates)) {
            data.rates.forEach((r: any) => {
              if (r?.target_currency === 'USD') next.USD = Number(r.rate) || next.USD;
              if (r?.target_currency === 'EUR') next.EUR = Number(r.rate) || next.EUR;
              if (r?.target_currency === 'UAH') next.UAH = 1;
            });
          }
          setCurrencyRates(next);
        }
      } catch {}
    };
    loadRates();
  }, []);

  const formatPrice = (price: number, currency: string, targetCurrencyParam?: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    
    let finalPrice = price;
    let finalCurrency = currency;
    
    // Конвертація якщо потрібно
    const target = (targetCurrencyParam as 'UAH' | 'USD' | 'EUR') || targetCurrency;
    if (target && target !== currency) {
      const fromRateUAH = currencyRates[currency as keyof typeof currencyRates] || 1; // UAH per 1 unit
      const toRateUAH = currencyRates[target as keyof typeof currencyRates] || 1;
      finalPrice = (price * fromRateUAH) / toRateUAH;
      finalCurrency = target;
    }
    
    const symbol = symbols[finalCurrency as keyof typeof symbols] || '$';
    const formattedNumber = new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(finalPrice);
    
    return `${symbol}${formattedNumber}`;
  };

  // Функція зміни статусу оголошення - оптимізированная версия
  const handleStatusChange = useCallback(async (adId: number, newStatus: string) => {
    // Сохраняем текущее состояние для возможного отката
    const prevAds = [...ads];
    
    // Оптимистичное обновление UI
    setAds(prev => prev.map((ad: any) => ad.id === adId ? { ...ad, status: newStatus } : ad));

    try {
      await CarAdsService.updateAdStatusAsModerator(
        adId,
        newStatus,
        `Статус изменен на ${newStatus} модератором ${user?.email || 'unknown'}`
      );

      await loadModerationStats();

      toast({
        title: t('common.success'),
        description: t('autoria.moderation.statusUpdated'),
        duration: 2000
      });

      return { success: true };

    } catch (error) {
      console.error('Error updating status:', error);
      
      // Восстанавливаем предыдущее состояние
      setAds(prevAds);
      
      // Показываем ошибку пользователю
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('autoria.moderation.statusUpdateFailed'),
        variant: 'destructive',
        duration: 3000
      });
      
      // Пробрасываем ошибку дальше, если нужно обработать её в вызывающем коде
      throw error;
    }
  }, [ads, user, t, toast, loadModerationStats]);

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
      ((x: any) => x)((prev: any) => 
        prev.map((ad: any) => 
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
                  <SelectItem value="active">✅ {t('autoria.moderation.status.active')}</SelectItem>
                  <SelectItem value="pending">⏳ {t('autoria.moderation.status.pending')}</SelectItem>
                  <SelectItem value="draft">📝 {t('autoria.moderation.status.draft')}</SelectItem>
                  <SelectItem value="needs_review">🔍 {t('autoria.moderation.status.needsReview')}</SelectItem>
                  <SelectItem value="rejected">❌ {t('autoria.moderation.status.rejected')}</SelectItem>
                  <SelectItem value="blocked">🚫 {t('autoria.moderation.status.blocked')}</SelectItem>
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

              {/* Валюта */}
              <Select value={targetCurrency} onValueChange={(v) => setTargetCurrency(v as any)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAH">₴ UAH</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
              
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
            {ads.map((ad: any) => (
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
                    <TableHead className="w-10">
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
                    </TableHead>
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
                  {ads.map((ad: any) => (
                    <React.Fragment key={ad.id}>
                      <TableRow className="hidden" />
                      <TableRow>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ad.id)}
                            onChange={(e) => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(ad.id); else next.delete(ad.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        {/* Render existing row content via component */}
                        <AdTableRow
                          ad={ad}
                          onStatusChange={handleStatusChange}
                          onModerate={moderateAd}
                          onDelete={handleDeleteAd}
                          onView={handleViewAd}
                          formatPrice={formatPrice}
                          getStatusBadge={getStatusBadge}
                        />
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Bulk actions bar */}
            <div className="flex flex-wrap gap-2 items-center p-4 border-t bg-gray-50">
              <span className="text-sm text-gray-600 mr-2">{t('autoria.moderation.selected') || 'Вибрано'}: {selectedIds.size}</span>
              <Button size="icon" title={t('autoria.moderation.approve')} onClick={() => bulkModerate('approve')} disabled={selectedIds.size===0}>✅</Button>
              <Button size="icon" variant="outline" title={t('autoria.moderation.review')} onClick={() => bulkModerate('review')} disabled={selectedIds.size===0}>🔄</Button>
              <Button size="icon" variant="destructive" title={t('autoria.moderation.reject')} onClick={() => bulkModerate('reject')} disabled={selectedIds.size===0}>❌</Button>
              <Button size="icon" variant="outline" title={t('autoria.moderation.block')} onClick={() => bulkModerate('block')} disabled={selectedIds.size===0}>🚫</Button>
              <Button size="icon" variant="outline" title={t('autoria.moderation.activate')} onClick={() => bulkModerate('activate')} disabled={selectedIds.size===0}>✅</Button>
              <Button size="icon" variant="destructive" title={t('common.delete')} onClick={bulkDelete} disabled={selectedIds.size===0}>🗑️</Button>
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