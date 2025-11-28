"use client";

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { mapFormDataToApiData } from '@/modules/autoria/shared/utils/carAdDataMapper';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

export interface UseCreateAdPageStateResult {
  isSubmitting: boolean;
  handleSubmit: (formData: Partial<CarAdFormData>) => Promise<void>;
  handleCancel: () => void;
}

export function useCreateAdPageState(): UseCreateAdPageStateResult {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission for creating a new ad
  const handleSubmit = useCallback(
    async (formData: Partial<CarAdFormData>) => {
      setIsSubmitting(true);
      try {
        const apiData = mapFormDataToApiData(formData);

        const response = await CarAdsService.createCarAd(apiData);
        // Successful creation — show a localized toast and redirect to "My ads" page
        toast({
          title: t('common.success'),
          description: t('autoria.createAd.created'),
        });

        router.push('/autoria/my-ads');
      } catch (error) {
        console.error('[CreateAd] Error creating ad:', error);
        toast({
          title: t('common.error'),
          description:
            error instanceof Error ? error.message : t('autoria.createAd.createError'),
          variant: 'destructive',
        });
        // Re-throw so the CarAdForm can handle the error if needed
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, t, toast],
  );

  // Handle cancel: use callbackUrl/returnUrl if provided
  const handleCancel = useCallback(() => {
    const callbackUrl = searchParams.get('callbackUrl');
    const returnUrl = searchParams.get('returnUrl');
    const targetUrl = callbackUrl || returnUrl || '/autoria/search';

    const decodedUrl = callbackUrl || returnUrl ? decodeURIComponent(targetUrl) : targetUrl;

    router.push(decodedUrl);
  }, [router, searchParams]);

  return {
    isSubmitting,
    handleSubmit,
    handleCancel,
  };
}
