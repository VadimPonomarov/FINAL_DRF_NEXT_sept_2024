"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { mapApiDataToFormData, mapFormDataToApiData } from '@/modules/autoria/shared/utils/carAdDataMapper';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

interface UseEditAdPageStateParams {
  adId: number;
}

export interface UseEditAdPageStateResult {
  isLoadingAd: boolean;
  loadError: string | null;
  initialData: Partial<CarAdFormData>;
  isSubmitting: boolean;
  handleSubmit: (formData: Partial<CarAdFormData>) => Promise<void>;
  handleCancel: () => void;
  handleDelete: () => Promise<void>;
}

export function useEditAdPageState({ adId }: UseEditAdPageStateParams): UseEditAdPageStateResult {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();

  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<CarAdFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdData = useCallback(async () => {
    try {
      setIsLoadingAd(true);
      setLoadError(null);

      const adData = await CarAdsService.getCarAd(adId);
      const formDataFromAd = mapApiDataToFormData(adData);

      setInitialData(formDataFromAd);
    } catch (error) {
      console.error('[EditAd] Error loading ad data:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLoadError(`Не удалось загрузить данные объявления (ID: ${adId}). ${message}`);
    } finally {
      setIsLoadingAd(false);
    }
  }, [adId]);

  useEffect(() => {
    loadAdData();
  }, [loadAdData]);

  const persistImageChanges = useCallback(
    async (targetAdId: number, formData: Partial<CarAdFormData>) => {
      try {
        const toDelete: number[] = (formData as any).images_to_delete || [];
        for (const imageId of toDelete) {
          const res = await fetch(`/api/ads/${targetAdId}/images/${imageId}`, { method: 'DELETE' });
          if (!res.ok) {
            console.error('[EditAd] Failed to delete image', imageId, await res.text());
          }
        }
      } catch (e) {
        console.error('[EditAd] Error deleting images:', e);
      }

      try {
        const uploaded: File[] = (formData as any).uploaded_images || [];
        for (const file of uploaded) {
          const fd = new FormData();
          fd.append('image', file);
          const res = await fetch(`/api/ads/${targetAdId}/images`, { method: 'POST', body: fd });
          if (!res.ok) {
            console.error('[EditAd] Failed to upload image', file.name, await res.text());
          }
        }
      } catch (e) {
        console.error('[EditAd] Error uploading images:', e);
      }

      try {
        const generated: any[] = (formData as any).generated_images || [];
        console.log('[EditAd] Saving generated images:', generated.length);

        for (let idx = 0; idx < generated.length; idx++) {
          const g = generated[idx];
          if (!g?.url) {
            console.log('[EditAd] Skipping image without URL:', g);
            continue;
          }

          const res = await fetch(`/api/ads/${targetAdId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: g.url,
              caption: g.title || g.description || `Generated image ${idx + 1}`,
              is_primary: idx === 0,
              order: idx + 1,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error('[EditAd] Failed to save generated image', g.url, errorText);
          } else {
            console.log(`[EditAd] Generated image ${idx + 1} saved successfully`);
          }
        }

        if (generated.length > 0) {
          toast({
            title: t('common.success'),
            description: t('autoria.images.saved', `Saved ${generated.length} generated images`),
          });
        }
      } catch (e) {
        console.error('[EditAd] Error saving generated images:', e);
        toast({
          title: t('common.error'),
          description: t('autoria.images.saveError', 'Failed to save generated images'),
          variant: 'destructive',
        });
      }
    },
    [t, toast],
  );

  const handleSubmit = useCallback(
    async (formData: Partial<CarAdFormData>) => {
      setIsSubmitting(true);
      try {
        const currentUserEmail = session?.user?.email;
        const isSuperUser = session?.user?.role === 'superuser' || session?.user?.is_superuser;

        const adData = await CarAdsService.getCarAd(adId);
        const adOwnerEmail = adData.user?.email;
        const isOwner = currentUserEmail === adOwnerEmail;

        console.log('[EditAd] Access check (restrictions removed):', {
          currentUserEmail,
          adOwnerEmail,
          isOwner,
          isSuperUser,
          hasAccess: true,
        });

        const completeFormData = {
          id: formData.id,
          title: formData.title,
          description: formData.description,
          additional_info: formData.additional_info,
          vehicle_type: formData.vehicle_type,
          vehicle_type_name: formData.vehicle_type_name,
          brand: formData.brand,
          brand_name: formData.brand_name,
          mark: formData.mark,
          mark_name: formData.mark_name,
          model: formData.model,
          model_name: formData.model_name,
          year: formData.year,
          mileage: formData.mileage,
          engine_volume: formData.engine_volume,
          engine_power: formData.engine_power,
          fuel_type: formData.fuel_type,
          transmission: formData.transmission,
          drive_type: formData.drive_type,
          body_type: formData.body_type,
          color: formData.color,
          color_name: formData.color_name,
          steering_wheel: formData.steering_wheel,
          condition: formData.condition,
          vin_code: formData.vin_code,
          license_plate: formData.license_plate,
          number_of_doors: formData.number_of_doors,
          number_of_seats: formData.number_of_seats,
          generation: formData.generation,
          modification: formData.modification,
          price: formData.price,
          currency: formData.currency,
          region: formData.region,
          region_name: formData.region_name,
          city: formData.city,
          city_name: formData.city_name,
          contacts: formData.contacts,
          contact_name: formData.contact_name,
          phone: formData.phone,
          use_profile_contacts: formData.use_profile_contacts,
          images: formData.images,
          existing_images: formData.existing_images,
          images_to_delete: formData.images_to_delete,
          main_existing_image_id: formData.main_existing_image_id,
          generated_images: formData.generated_images,
          seller_type: formData.seller_type,
          exchange_status: formData.exchange_status,
          is_urgent: formData.is_urgent,
          is_highlighted: formData.is_highlighted,
          status: formData.status,
          visibility_settings: formData.visibility_settings,
          metadata: formData.metadata,
          tags: formData.tags,
          dynamic_fields: formData.dynamic_fields,
          geocode: formData.geocode,
        };

        const requiredFields = {
          title: completeFormData.title,
          description: completeFormData.description,
          price: completeFormData.price,
          currency: completeFormData.currency,
          brand: completeFormData.brand || completeFormData.mark,
          model: completeFormData.model,
          region: completeFormData.region,
          city: completeFormData.city,
        };

        const missingFields = Object.entries(requiredFields)
          .filter(([, value]) => !value || value === '' || value === 0)
          .map(([key]) => key);

        if (missingFields.length > 0) {
          const errorMessage = `🚨 ${t('common.validationError', 'Validation error')}: ${missingFields.join(
            ', ',
          )}`;
          console.error('[EditAd]', errorMessage);
          console.error('[EditAd] Complete form data:', completeFormData);

          toast({
            title: t('common.error'),
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }

        const apiData = mapFormDataToApiData(completeFormData);
        console.log('[EditAd] Mapped API data keys:', Object.keys(apiData));

        const response = await CarAdsService.updateCarAd(adId, apiData);
        console.log('[EditAd] Ad updated successfully:', response);

        toast({
          title: t('common.success'),
          description: t('autoria.editAd.updated', 'Ad updated successfully'),
        });

        await persistImageChanges(adId, formData);
      } catch (error) {
        console.error('[EditAd] Error updating ad:', error);
        console.error('[EditAd] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        toast({
          title: t('common.error'),
          description:
            error instanceof Error
              ? error.message
              : t('autoria.editAd.updateError', 'Failed to update ad'),
          variant: 'destructive',
        });

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [adId, persistImageChanges, session, t, toast],
  );

  const handleCancel = useCallback(() => {
    const callbackUrl = searchParams.get('callbackUrl');
    const returnUrl = searchParams.get('returnUrl');
    const targetUrl = callbackUrl || returnUrl || '/autoria/search';

    const decodedUrl = callbackUrl || returnUrl ? decodeURIComponent(targetUrl) : targetUrl;

    router.push(decodedUrl);
  }, [router, searchParams]);

  const handleDelete = useCallback(async () => {
    try {
      console.log('[EditAd] Deleting ad:', adId);

      const currentUserEmail = session?.user?.email;
      const isSuperUser = session?.user?.role === 'superuser' || session?.user?.is_superuser;

      const adData = await CarAdsService.getCarAd(adId);
      const adOwnerEmail = adData.user?.email;
      const isOwner = currentUserEmail === adOwnerEmail;

      console.log('[EditAd] Delete access check (restrictions removed):', {
        currentUserEmail,
        adOwnerEmail,
        isOwner,
        isSuperUser,
        hasAccess: true,
      });

      await CarAdsService.deleteCarAd(adId);

      toast({
        title: t('common.success'),
        description: t('autoria.editAd.deleted', 'Ad deleted successfully'),
      });

      router.push('/autoria/search');
    } catch (error) {
      console.error('[EditAd] Error deleting ad:', error);

      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('autoria.editAd.deleteError', 'Failed to delete ad'),
        variant: 'destructive',
      });

      throw error;
    }
  }, [adId, router, session, t, toast]);

  return {
    isLoadingAd,
    loadError,
    initialData,
    isSubmitting,
    handleSubmit,
    handleCancel,
    handleDelete,
  };
}
