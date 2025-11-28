"use client";

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';
import { ensureInitialTestAdsSeed } from '@/shared/init/ensureInitialSeed';

export interface UseAutoRiaMainPageStateResult {
  isGenerating: boolean;
  showAccountManager: boolean;
  setShowAccountManager: (value: boolean) => void;
  showTestAdsModal: boolean;
  setShowTestAdsModal: (value: boolean) => void;
  generateTestAds: (count?: number, imageTypes?: string[]) => Promise<void>;
  clearAllAds: () => Promise<void>;
}

export function useAutoRiaMainPageState(): UseAutoRiaMainPageStateResult {
  const { t } = useI18n();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showTestAdsModal, setShowTestAdsModal] = useState(false);

  // Ensure initial seed of test ads when the main page mounts
  useEffect(() => {
    const controller = new AbortController();

    ensureInitialTestAdsSeed({ signal: controller.signal }).catch((error: unknown) => {
      if ((error as { name?: string })?.name === 'AbortError') {
        return;
      }
      console.error('[AutoRiaMain] Initial seed failed:', error);
    });

    return () => controller.abort();
  }, []);

  const generateTestAds = useCallback(
    async (count?: number, imageTypes?: string[]) => {
      if (isGenerating) return;

      const finalCount = count ?? 3;
      const finalImageTypes = imageTypes ?? ['front', 'side'];

      if (!finalImageTypes || finalImageTypes.length === 0) {
        toast({
          title: 'Ошибка',
          description: t('autoria.testAds.imageTypes.noSelection'),
          variant: 'destructive',
        });
        return;
      }

      setIsGenerating(true);

      const REQUEST_TIMEOUT_MS = 300000; // 5 minutes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        console.log('[AutoRiaMain] Generating test ads:', {
          count: finalCount,
          imageTypes: finalImageTypes,
        });

        const response = await fetchWithAuth('/api/autoria/test-ads/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            count: finalCount,
            includeImages: true,
            imageTypes: finalImageTypes,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401 || response.status === 403) {
          toast({
            title: t('auth.loginRequiredTitle'),
            description: t('auth.loginRequiredDesc'),
            variant: 'destructive',
          });
          return;
        }

        if (response.ok) {
          const result = await response.json();

          let detailsText = '';
          if (result.details && result.details.length > 0) {
            detailsText = '\n\n📋 Созданные объявления:\n';
            result.details.forEach((detail: any, index: number) => {
              if (detail.success) {
                detailsText += `${index + 1}. ${detail.title}\n   🖼️ Изображений: ${
                  detail.imagesCount || 0
                }\n`;
              }
            });
          }

          const successMessage = t('autoria.testAds.successCreatedDetailed', {
            count: result.count,
            totalImages: result.totalImages || 0,
            duration: result.duration || 'N/A',
            details: detailsText,
          });

          toast({
            title: t('autoria.testAds.successCreatedTitle'),
            description: successMessage,
            variant: 'default',
          });
        } else {
          const error = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(error.message || 'Failed to generate test ads');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          toast({
            title: t('common.error'),
            description:
              'Генерация заняла слишком много времени. Попробуйте создать меньше объявлений.',
            variant: 'destructive',
          });
        } else {
          console.error('[AutoRiaMain] Error generating test ads:', fetchError);
          toast({
            title: t('common.error'),
            description: t('autoria.testAds.errorCreating', {
              error: fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка',
            }),
            variant: 'destructive',
          });
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, t, toast],
  );

  const clearAllAds = useCallback(
    async () => {
      if (isGenerating) return;

      const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
      const confirmed = await alertHelpers.confirmDelete(
        t('autoria.testAds.allTestAds') || 'всі тестові оголошення',
      );
      if (!confirmed) return;

      setIsGenerating(true);
      try {
        const response = await fetch('/api/autoria/test-ads/cleanup', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          toast({
            title: '✅ Объявления удалены!',
            description: t('autoria.testAds.successDeleted', { count: result.deleted }),
            variant: 'default',
          });
        } else {
          throw new Error('Failed to cleanup ads');
        }
      } catch (error) {
        console.error('[AutoRiaMain] Error cleaning up ads:', error);
        toast({
          title: '❌ Ошибка удаления',
          description: t('autoria.testAds.errorDeleting'),
          variant: 'destructive',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, t, toast],
  );

  return {
    isGenerating,
    showAccountManager,
    setShowAccountManager,
    showTestAdsModal,
    setShowTestAdsModal,
    generateTestAds,
    clearAllAds,
  };
}
