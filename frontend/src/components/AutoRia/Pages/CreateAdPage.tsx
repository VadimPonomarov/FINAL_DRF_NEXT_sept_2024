"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import CarAdForm from '@/components/AutoRia/Components/CarAdForm';
import { mapFormDataToApiData } from '@/utils/carAdDataMapper';
import { useToast } from '@/hooks/use-toast';

const CreateAdPage: React.FC = () => {
  const { t } = useI18n();
  const router = useRouter();
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
        title: "✅ Успешно создано",
        description: "Объявление успешно создано",
      });

      // Перенаправляем на страницу объявлений
      router.push('/autoria/my-ads');

    } catch (error) {
      console.error('[CreateAdPage] ❌ Error creating ad:', error);
      toast({
        title: "❌ Ошибка создания",
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: "destructive",
      });
      throw error; // Пробрасываем ошибку в CarAdForm
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик отмены
  const handleCancel = () => {
    router.push('/autoria/search');
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
