/**
 * Reusable ad actions hook (DRY)
 * Used across: MyAdsPage, ModerationPage, SearchPage
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { CarAd } from '../types';

export interface UseAdActionsReturn {
  viewAd: (ad: CarAd) => void;
  editAd: (ad: CarAd) => void;
  deleteAd: (ad: CarAd) => Promise<void>;
  duplicateAd: (ad: CarAd) => Promise<void>;
}

export const useAdActions = (onAdDeleted?: () => void): UseAdActionsReturn => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const viewAd = useCallback((ad: CarAd) => {
    router.push(`/autoria/ads/${ad.id}`);
  }, [router]);

  const editAd = useCallback((ad: CarAd) => {
    router.push(`/autoria/my-ads/${ad.id}/edit`);
  }, [router]);

  const deleteAd = useCallback(async (ad: CarAd) => {
    try {
      const response = await fetch(`/api/autoria/ads/${ad.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete ad');
      }

      toast({
        title: t('common.success'),
        description: t('autoria.editAd.deleted', 'Ad deleted successfully')
      });

      onAdDeleted?.();
    } catch (error) {
      console.error('Failed to delete ad:', error);
      toast({
        title: t('common.error'),
        description: t('autoria.editAd.deleteError', 'Failed to delete ad'),
        variant: 'destructive'
      });
    }
  }, [toast, t, onAdDeleted]);

  const duplicateAd = useCallback(async (ad: CarAd) => {
    try {
      const response = await fetch(`/api/autoria/ads/${ad.id}/duplicate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate ad');
      }

      const newAd = await response.json();

      toast({
        title: t('common.success'),
        description: t('autoria.ad.duplicated', 'Ad duplicated successfully')
      });

      router.push(`/autoria/my-ads/${newAd.id}/edit`);
    } catch (error) {
      console.error('Failed to duplicate ad:', error);
      toast({
        title: t('common.error'),
        description: t('autoria.ad.duplicateError', 'Failed to duplicate ad'),
        variant: 'destructive'
      });
    }
  }, [toast, t, router]);

  return {
    viewAd,
    editAd,
    deleteAd,
    duplicateAd
  };
};
