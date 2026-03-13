"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import CarAdForm from '@/components/AutoRia/Components/CarAdForm';
import { mapFormDataToApiData } from '@/modules/autoria/shared/utils/carAdDataMapper';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

const CreateAdPage: React.FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  console.log('CreateAdPage rendered');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const persistCreatedAdImages = async (adId: number, formData: Partial<CarAdFormData>) => {
    const uploaded = ((formData as any).uploaded_images || []) as File[];
    for (const file of uploaded) {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`/api/ads/${adId}/images`, {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || `Failed to upload image ${file.name}`);
      }
    }

    const generated = ((formData as any).generated_images || []) as Array<{ url?: string; title?: string; isMain?: boolean }>;
    for (let idx = 0; idx < generated.length; idx++) {
      const image = generated[idx];
      if (!image?.url) {
        continue;
      }

      const res = await fetch(`/api/ads/${adId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: image.url,
          caption: image.title || `Generated image ${idx + 1}`,
          is_primary: !!image.isMain,
          order: idx,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || `Failed to save generated image ${idx + 1}`);
      }
    }
  };

  // Обработчик отправки формы
  const handleSubmit = async (formData: Partial<CarAdFormData>) => {
    setIsSubmitting(true);
    try {
      console.log('[CreateAdPage] 🔄 Creating new ad');
      console.log('[CreateAdPage] 📝 Form data keys:', Object.keys(formData));

      // Преобразуем данные формы в формат API
      const apiData = mapFormDataToApiData(formData);
      console.log('[CreateAdPage] 🔄 Mapped API data keys:', Object.keys(apiData));

      const response = await CarAdsService.createCarAd(apiData as any);
      console.log('[CreateAdPage] ✅ Ad created successfully:', response);

      const createdAdId = Number((response as any)?.id);
      if (Number.isFinite(createdAdId) && createdAdId > 0) {
        await persistCreatedAdImages(createdAdId, formData);
      }

      // Показываем уведомление об успехе
      toast({
        title: t('common.success'),
        description: t('autoria.createAd.created'),
      });

      // Перенаправляем на страницу объявлений
      router.push('/autoria/my-ads');

    } catch (error) {
      console.error('[CreateAdPage] ❌ Error creating ad:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('autoria.createAd.createError'),
        variant: "destructive",
      });
      throw error; // Пробрасываем ошибку в CarAdForm
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик отмены - использует callbackUrl/returnUrl если доступны
  const handleCancel = () => {
    // Приоритет: callbackUrl > returnUrl > дефолтный путь
    const callbackUrl = searchParams.get('callbackUrl');
    const returnUrl = searchParams.get('returnUrl');
    const targetUrl = callbackUrl || returnUrl || '/autoria/search';
    
    // Декодируем URL если он закодирован
    const decodedUrl = callbackUrl || returnUrl 
      ? decodeURIComponent(targetUrl) 
      : targetUrl;
    
    router.push(decodedUrl);
  };

  // Используем универсальный компонент CarAdForm
  return (
    <CarAdForm
      mode="create"
      initialData={{}}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isSubmitting}
    />
  );
};

export default CreateAdPage;
