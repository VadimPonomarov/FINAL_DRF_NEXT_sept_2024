"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CarAd, AdStatus } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { useAutoRiaAuth } from '@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

interface UseAdModerationPageStateParams {
  adId: number;
}

export interface UseAdModerationPageStateResult {
  adData: CarAd | null;
  isLoading: boolean;
  loadError: string | null;
  isSaving: boolean;
  newStatus: AdStatus;
  moderationReason: string;
  setNewStatus: (status: AdStatus) => void;
  setModerationReason: (value: string) => void;
  reload: () => Promise<void>;
  handleSaveModeration: () => Promise<void>;
}

export function useAdModerationPageState(
  params: UseAdModerationPageStateParams,
): UseAdModerationPageStateResult {
  const { adId } = params;

  const router = useRouter();
  const { user } = useAutoRiaAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [adData, setAdData] = useState<CarAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newStatus, setNewStatus] = useState<AdStatus>('active');
  const [moderationReason, setModerationReason] = useState('');

  // Check permissions and redirect unauthorized users
  useEffect(() => {
    if (!user) return;

    if (!user.is_superuser && !user.is_staff) {
      router.push('/autoria/search');
    }
  }, [user, router]);

  const loadAdData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log('[AdModerationPage] Loading ad data for ID:', adId);

      const data = await CarAdsService.getCarAd(adId);
      console.log('[AdModerationPage] Loaded ad data:', data);

      setAdData(data);
      setNewStatus(data.status as AdStatus);
      setModerationReason(data.moderation_reason || '');
    } catch (error) {
      console.error('[AdModerationPage] Error loading ad:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    loadAdData();
  }, [loadAdData]);

  const handleSaveModeration = useCallback(async () => {
    if (!adData) return;

    try {
      setIsSaving(true);

      console.log('[AdModerationPage] Saving moderation:', {
        adId,
        status: newStatus,
        reason: moderationReason,
      });

      // TODO: Implement actual moderation API call when available
      // await CarAdsService.moderateAd(adId, newStatus, moderationReason);

      toast({
        title: '✅ ' + t('common.success'),
        description: t('moderation.savedSuccessfully'),
      });
    } catch (error) {
      console.error('[AdModerationPage] Error saving moderation:', error);
      toast({
        title: '❌ ' + t('common.error'),
        description: t('moderation.errorSaving'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [adData, adId, moderationReason, newStatus, t, toast]);

  return {
    adData,
    isLoading,
    loadError,
    isSaving,
    newStatus,
    moderationReason,
    setNewStatus,
    setModerationReason,
    reload: loadAdData,
    handleSaveModeration,
  };
}
