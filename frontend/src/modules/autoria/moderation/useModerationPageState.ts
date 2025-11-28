"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CarAd } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaAuth } from '@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/modules/autoria/shared/hooks/useUserProfileData';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';
import CarAdsService from '@/services/autoria/carAds.service';

export interface ModerationStats {
  total_ads: number;
  pending_moderation: number;
  needs_review: number;
  rejected: number;
  blocked: number;
  active: number;
  today_moderated: number;
}

export type ViewMode = 'grid' | 'list';
export type SortOrder = 'asc' | 'desc';
export type TargetCurrency = 'UAH' | 'USD' | 'EUR';
export type ModerationAction = 'approve' | 'reject' | 'review' | 'block' | 'activate';

export interface UseModerationPageStateResult {
  user: any;
  isAuthenticated: boolean;
  authLoading: boolean;
  userProfileData: any;
  isSuperUser: boolean;

  ads: CarAd[];
  loading: boolean;
  stats: ModerationStats | null;

  statusFilter: string;
  setStatusFilter: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  targetCurrency: TargetCurrency;
  setTargetCurrency: (value: TargetCurrency) => void;

  selectedAd: CarAd | null;
  handleViewAd: (ad: CarAd) => void;
  handleCloseModal: () => void;

  selectedIds: Set<number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectAll: boolean;
  setSelectAll: (value: boolean) => void;

  formatPrice: (price: number, currency: string, targetCurrencyParam?: string) => string;

  loadModerationQueue: () => Promise<void>;
  loadModerationStats: () => Promise<void>;

  handleStatusChange: (adId: number, newStatus: string) => Promise<{ success: boolean } | void>;
  handleDeleteAd: (adId: number) => Promise<void>;
  handleSaveModerationNotes: (adId: number, notes: string) => Promise<void>;

  moderateAd: (adId: number, action: ModerationAction, reason?: string) => Promise<void>;
  bulkModerate: (action: ModerationAction, reason?: string) => Promise<void>;
  bulkDelete: () => Promise<void>;
}

export function useModerationPageState(): UseModerationPageStateResult {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading: authLoading } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();
  const { toast } = useToast();

  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAd, setSelectedAd] = useState<CarAd | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>('UAH');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Currency rates from backend (UAH as base)
  const [currencyRates, setCurrencyRates] = useState<{ USD: number; EUR: number; UAH: number }>(
    {
      USD: 41.6,
      EUR: 45.5,
      UAH: 1,
    },
  );

  const isSuperUser = useMemo(() => {
    const isSuper = user?.is_superuser || userProfileData?.user?.is_superuser || false;

    console.log('[Moderation] Superuser resolved:', {
      userEmail: user?.email,
      isSuperUser: isSuper,
    });

    return isSuper;
  }, [user, userProfileData]);

  // Access check (runs once when auth state is resolved)
  const accessCheckedRef = useRef(false);
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      if (accessCheckedRef.current) return;

      accessCheckedRef.current = true;

      if (!isAuthenticated) {
        const { redirectToAuth } = await import('@/shared/utils/auth/redirectToAuth');
        redirectToAuth(window.location.pathname, 'auth_required');
        return;
      }

      if (!isSuperUser) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('autoria.moderation.accessDenied'),
          duration: 3000,
        });
        setTimeout(() => {
          window.location.href = '/autoria';
        }, 1000);
      }
    };

    void checkAccess();
  }, [authLoading, isAuthenticated, isSuperUser, t, toast]);

  const loadModerationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const statusMapping: { [key: string]: string } = {
        all: '',
        pending: 'pending',
        needs_review: 'needs_review',
        rejected: 'rejected',
        blocked: 'blocked',
        active: 'active',
      };

      const backendStatus = statusMapping[statusFilter] || '';

      const params = new URLSearchParams({
        search: searchQuery,
        page: '1',
        page_size: '50',
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy,
      });

      if (backendStatus) {
        params.append('status', backendStatus);
      }

      const response = await fetchWithAuth(`/api/ads/moderation/queue?${params}`);

      if (!response.ok) {
        console.error('[Moderation] Queue request failed:', response.status);
        setAds([]);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setAds(result.data);
      } else {
        setAds([]);
      }
    } catch (error) {
      console.error('[Moderation] Failed to load queue:', error);
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, sortOrder, statusFilter]);

  const loadModerationStats = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/ads/moderation/statistics');

      if (!response.ok) {
        console.error('[Moderation] Stats request failed:', response.status);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('[Moderation] Failed to load stats:', error);
    }
  }, []);

  // Initial load + reload when filters/sorting change
  useEffect(() => {
    void loadModerationQueue();
    void loadModerationStats();
  }, [loadModerationQueue, loadModerationStats]);

  // Load currency rates once
  useEffect(() => {
    const loadRates = async () => {
      try {
        const resp = await fetch('/api/currency/rates/', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const next: { USD: number; EUR: number; UAH: number } = { USD: 41.6, EUR: 45.5, UAH: 1 };
          if (Array.isArray(data?.rates)) {
            data.rates.forEach((r: any) => {
              if (r?.target_currency === 'USD') next.USD = Number(r.rate) || next.USD;
              if (r?.target_currency === 'EUR') next.EUR = Number(r.rate) || next.EUR;
              if (r?.target_currency === 'UAH') next.UAH = 1;
            });
          }
          setCurrencyRates(next);
        }
      } catch (error) {
        console.error('[Moderation] Failed to load currency rates:', error);
      }
    };

    void loadRates();
  }, []);

  const formatPrice = useCallback(
    (price: number, currency: string, targetCurrencyParam?: string) => {
      const symbols = { USD: '$', EUR: '€', UAH: '₴' } as const;

      let finalPrice = price;
      let finalCurrency = currency;

      const target = (targetCurrencyParam as TargetCurrency | undefined) || targetCurrency;
      if (target && target !== currency) {
        const fromRateUAH = currencyRates[currency as keyof typeof currencyRates] || 1;
        const toRateUAH = currencyRates[target as keyof typeof currencyRates] || 1;
        finalPrice = (price * fromRateUAH) / toRateUAH;
        finalCurrency = target;
      }

      const symbol = symbols[finalCurrency as keyof typeof symbols] || '$';
      const formattedNumber = new Intl.NumberFormat('uk-UA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(finalPrice);

      return `${symbol}${formattedNumber}`;
    },
    [currencyRates, targetCurrency],
  );

  const handleStatusChange = useCallback(
    async (adId: number, newStatus: string) => {
      const previousAds = [...ads];

      // Optimistic UI update
      setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status: newStatus } : ad)));

      try {
        await CarAdsService.updateAdStatusAsModerator(
          adId,
          newStatus,
          `Статус изменен на ${newStatus} модератором ${user?.email || 'unknown'}`,
        );

        await loadModerationStats();

        toast({
          title: t('common.success'),
          description: t('autoria.moderation.statusUpdated'),
          duration: 2000,
        });

        return { success: true };
      } catch (error) {
        console.error('[Moderation] Error updating status:', error);

        // Roll back previous state
        setAds(previousAds);

        toast({
          title: t('common.error'),
          description:
            error instanceof Error
              ? error.message
              : t('autoria.moderation.statusUpdateFailed'),
          variant: 'destructive',
          duration: 3000,
        });

        throw error;
      }
    },
    [ads, loadModerationStats, t, toast, user?.email],
  );

  const handleDeleteAd = useCallback(
    async (adId: number) => {
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

        setAds((prev) => prev.filter((ad) => ad.id !== adId));
        await loadModerationStats();
      } catch (error) {
        console.error('[Moderation] Error deleting ad:', error);
        toast({
          title: t('common.error'),
          description: t('autoria.moderation.deleteFailed'),
          variant: 'destructive',
        });

        throw error;
      }
    },
    [loadModerationStats, t, toast],
  );

  const handleViewAd = useCallback((ad: CarAd) => {
    setSelectedAd(ad);
  }, []);

  const handleSaveModerationNotes = useCallback(
    async (adId: number, notes: string) => {
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

        // Update local state with new moderation reason
        setAds((prev) =>
          prev.map((ad) => (ad.id === adId ? { ...ad, moderation_reason: notes } : ad)),
        );

        toast({
          title: t('common.success'),
          description: t('autoria.moderation.notesSaved'),
        });
      } catch (error) {
        console.error('[Moderation] Error saving notes:', error);
        toast({
          title: t('common.error'),
          description: t('autoria.moderation.notesSaveError'),
          variant: 'destructive',
        });

        throw error;
      }
    },
    [t, toast],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedAd(null);
  }, []);

  const moderateAd = useCallback(
    async (adId: number, action: ModerationAction, reason?: string) => {
      try {
        const endpoint = `/api/ads/moderation/${adId}/${action}`;
        const response = await fetchWithAuth(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: reason || '',
            moderator_notes: `Модерировано суперюзером: ${user?.email || 'unknown'}`,
          }),
        });

        let result: any = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {
          const msg = result?.message || result?.error || `Failed to ${action} ad`;
          throw new Error(msg);
        }

        const actionMessages = {
          approve: t('notifications.moderationApproved'),
          reject: t('notifications.moderationRejected'),
          review: t('notifications.moderationReviewSent'),
          block: t('notifications.moderationBlocked'),
          activate: t('notifications.moderationActivated'),
        } as const;

        const nextStatusMap: Record<ModerationAction, string> = {
          approve: 'active',
          reject: 'rejected',
          review: 'needs_review',
          block: 'blocked',
          activate: 'active',
        };

        const newStatus = nextStatusMap[action];
        setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status: newStatus } : ad)));
        setSelectedAd(null);
        await loadModerationStats();

        toast({
          variant: 'default',
          title: t('notifications.success'),
          description: actionMessages[action],
          duration: 2500,
        });
      } catch (error) {
        console.error(`[Moderation] Failed to ${action} ad:`, error);
        toast({
          variant: 'destructive',
          title: t('notifications.error'),
          description: t('notifications.moderationActionError'),
          duration: 3500,
        });

        throw error;
      }
    },
    [loadModerationStats, t, toast, user?.email],
  );

  const bulkModerate = useCallback(
    async (action: ModerationAction, reason?: string) => {
      const ids = Array.from(selectedIds.values());
      if (ids.length === 0) return;

      try {
        const resp = await fetchWithAuth('/api/ads/moderation/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action, reason: reason || '' }),
        });
        if (resp.ok) {
          toast({ title: t('common.success'), description: t('autoria.moderation.bulkDone') });
        } else {
          await Promise.allSettled(ids.map((id) => moderateAd(id, action, reason)));
        }
      } catch {
        await Promise.allSettled(ids.map((id) => moderateAd(id, action, reason)));
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      await loadModerationQueue();
      await loadModerationStats();
    },
    [loadModerationQueue, loadModerationStats, moderateAd, selectedIds, t, toast],
  );

  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds.values());
    if (ids.length === 0) return;
    if (!confirm(t('autoria.moderation.confirmBulkDelete') || 'Видалити вибрані оголошення?')) return;

    try {
      const resp = await fetchWithAuth('/api/ads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!resp.ok) {
        await Promise.allSettled(
          ids.map((id) => fetchWithAuth(`/api/ads/${id}/`, { method: 'DELETE' })),
        );
      }
      toast({ title: t('common.success'), description: t('autoria.moderation.bulkDeleted') });
    } catch (e) {
      console.error('[Moderation] Bulk delete failed:', e);
      toast({
        title: t('common.error'),
        description: t('autoria.moderation.deleteFailed'),
        variant: 'destructive',
      });
    }

    setSelectedIds(new Set());
    setSelectAll(false);
    await loadModerationQueue();
    await loadModerationStats();
  }, [loadModerationQueue, loadModerationStats, selectedIds, t, toast]);

  return {
    user,
    isAuthenticated,
    authLoading,
    userProfileData,
    isSuperUser,
    ads,
    loading,
    stats,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    targetCurrency,
    setTargetCurrency,
    selectedAd,
    handleViewAd,
    handleCloseModal,
    selectedIds,
    setSelectedIds,
    selectAll,
    setSelectAll,
    formatPrice,
    loadModerationQueue,
    loadModerationStats,
    handleStatusChange,
    handleDeleteAd,
    handleSaveModerationNotes,
    moderateAd,
    bulkModerate,
    bulkDelete,
  };
}
