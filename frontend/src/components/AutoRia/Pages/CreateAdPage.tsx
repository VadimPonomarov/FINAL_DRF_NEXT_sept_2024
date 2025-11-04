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

  // Обработчик отправки формы
  const handleSubmit = async (formData: Partial<CarAdFormData>) => {
    setIsSubmitting(true);
    try {
      console.log('[CreateAdPage] 🔄 Creating new ad');
      console.log('[CreateAdPage] 📝 Form data keys:', Object.keys(formData));

      // Преобразуем данные формы в формат API
      const apiData = mapFormDataToApiData(formData);
      console.log('[CreateAdPage] 🔄 Mapped API data keys:', Object.keys(apiData));

      const response = await CarAdsService.createCarAd(apiData);
      console.log('[CreateAdPage] ✅ Ad created successfully:', response);

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
