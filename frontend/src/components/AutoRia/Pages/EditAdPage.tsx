"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import CarAdForm from '@/components/AutoRia/Components/CarAdForm';
import { mapApiDataToFormData, mapFormDataToApiData } from '@/modules/autoria/shared/utils/carAdDataMapper';
import { useMemoizedFormData } from '@/modules/autoria/shared/hooks/useMemoizedFormData';

interface EditAdPageProps {
  adId: number;
}

const EditAdPage: React.FC<EditAdPageProps> = ({ adId }) => {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();

  console.log('EditAdPage rendered for adId:', adId);

  // State для загрузки данных объявления
  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<CarAdFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загрузка данных объявления при монтировании
  useEffect(() => {
    loadAdData();
  }, [adId]);

  const loadAdData = async () => {
    try {
      setIsLoadingAd(true);
      console.log('[EditAdPage] Loading ad data for ID:', adId);

      const adData = await CarAdsService.getCarAd(adId);
      console.log('[EditAdPage] Loaded ad data:', adData);
      console.log('[EditAdPage] Key fields from API:', {
        vehicle_type: adData.vehicle_type,
        mark: adData.mark,
        brand: adData.brand,
        model: adData.model,
        region: adData.region,
        city: adData.city,
        price: adData.price,
        currency: adData.currency,
        dynamic_fields: adData.dynamic_fields,
        car_specs: adData.car_specs,
        user: adData.user // Информация о владельце
      });

      // Проверка прав доступа убрана - разрешаем редактирование всем авторизованным пользователям
      const currentUserEmail = session?.user?.email;
      const adOwnerEmail = adData.user?.email;
      const isOwner = currentUserEmail === adOwnerEmail;
      const isSuperUser = (session?.user as any)?.role === 'superuser' || (session?.user as any)?.is_superuser;

      console.log('[EditAdPage] Access check (restrictions removed):', {
        currentUserEmail,
        adOwnerEmail,
        isOwner,
        isSuperUser,
        hasAccess: true // Всегда разрешаем доступ
      });

      // Используем универсальную функцию маппинга
      const formDataFromAd = (mapApiDataToFormData(adData) as any);

      console.log('[EditAdPage] Mapped form data:', formDataFromAd);
      console.log('[EditAdPage] Key mapped fields:', {
        brand: formDataFromAd.brand,
        model: formDataFromAd.model,
        region: formDataFromAd.region,
        city: formDataFromAd.city,
        price: formDataFromAd.price,
        currency: formDataFromAd.currency
      });

      setInitialData(formDataFromAd);
      setLoadError(null);
    } catch (error) {
      console.error('[EditAdPage] Error loading ad data:', error);
      console.error('[EditAdPage] Error details:', {
        message: error instanceof Error ? (error as any).message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        adId: adId
      });
      setLoadError(`Не удалось загрузить данные объявления (ID: ${adId}). ${error instanceof Error ? (error as any).message : 'Неизвестная ошибка'}`);
    } finally {
      setIsLoadingAd(false);
    }
  };

  // Синхронизация изображений: удаления, загрузки и сохранение сгенерированных URL
  const persistImageChanges = async (adId: number, formData: Partial<CarAdFormData>) => {
    // 1) Удаление существующих изображений по их ID
    try {
      const toDelete: number[] = (formData as any).images_to_delete || [];
      for (const imageId of toDelete) {
        const res = await fetch(`/api/ads/${adId}/images/${imageId}`, { method: 'DELETE' });
        if (!res.ok) {
          console.error('[EditAdPage] Failed to delete image', imageId, await res.text());
        }
      }
    } catch (e) {
      console.error('[EditAdPage] Error deleting images:', e);
    }

    // 2) Загрузка новых локальных файлов
    try {
      const uploaded: File[] = (formData as any).uploaded_images || [];
      for (const file of uploaded) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(`/api/ads/${adId}/images`, { method: 'POST', body: fd });
        if (!res.ok) {
          console.error('[EditAdPage] Failed to upload image', file.name, await res.text());
        }
      }
    } catch (e) {
      console.error('[EditAdPage] Error uploading images:', e);
    }

    // 3) Сохранение сгенерированных изображений по URL
    try {
      const generated: any[] = (formData as any).generated_images || [];
      console.log('[EditAdPage] Saving generated images:', generated.length);

      for (let idx = 0; idx < generated.length; idx++) {
        const g = generated[idx];
        if (!g?.url) {
          console.log('[EditAdPage] Skipping image without URL:', g);
          continue;
        }

        console.log(`[EditAdPage] Saving generated image ${idx + 1}:`, g.url);
        const res = await fetch(`/api/ads/${adId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: g.url,
            caption: g.title || g.description || `Generated image ${idx + 1}`,
            is_primary: idx === 0, // Первое изображение делаем главным
            order: idx + 1
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[EditAdPage] Failed to save generated image', g.url, errorText);
        } else {
          console.log(`[EditAdPage] ✅ Generated image ${idx + 1} saved successfully`);
        }
      }

      if (generated.length > 0) {
        toast({
          title: t('common.success'),
          description: t('autoria.images.saved', `Saved ${generated.length} generated images`),
        });
      }
    } catch (e) {
      console.error('[EditAdPage] Error saving generated images:', e);
      toast({
        title: t('common.error'),
        description: t('autoria.images.saveError', 'Failed to save generated images'),
        variant: "destructive",
      });
    }
  };


  // 🧠 МЕМОИЗАЦИЯ: Используем мемоизированные данные формы
  const memoizedFormData = useMemoizedFormData({
    formData: initialData,
    onDataChange: (data) => setInitialData(prev => ({ ...prev, ...data }))
  });

  // Обработчик отправки формы
  const handleSubmit = async (formData: Partial<CarAdFormData>) => {
    setIsSubmitting(true);
    try {
      // Дополнительная проверка прав доступа перед обновлением
      const currentUserEmail = session?.user?.email;
      const isSuperUser = (session?.user as any)?.role === 'superuser' || (session?.user as any)?.is_superuser;

      // Получаем актуальные данные объявления для проверки владельца
      const adData = await CarAdsService.getCarAd(adId);
      const adOwnerEmail = adData.user?.email;
      const isOwner = currentUserEmail === adOwnerEmail;

      // Проверка прав доступа убрана - разрешаем редактирование всем авторизованным пользователям

      console.log('[EditAdPage] 🔄 Starting update for ad:', adId);
      console.log('[EditAdPage] 📝 Form data keys:', Object.keys(formData));
      // ✅ КРИТИЧЕСКАЯ ДИАГНОСТИКА: Проверяем ВСЕ поля формы
      console.log('[EditAdPage] 🔍 ПОЛНАЯ ДИАГНОСТИКА ФОРМЫ:');
      console.log('[EditAdPage] 📝 Основные поля:', {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        currency: formData.currency,
      });
      console.log('[EditAdPage] 🚗 Автомобиль:', {
        brand: formData.brand,
        brand_name: formData.brand_name,
        mark: formData.mark,
        mark_name: formData.mark_name,
        model: formData.model,
        vehicle_type: formData.vehicle_type,
        vehicle_type_name: formData.vehicle_type_name,
      });
      console.log('[EditAdPage] 📍 Местоположение:', {
        region: formData.region,
        region_name: formData.region_name,
        city: formData.city,
        city_name: formData.city_name,
      });
      console.log('[EditAdPage] 🔧 Технические характеристики:', {
        year: formData.year,
        mileage: formData.mileage,
        engine_volume: formData.engine_volume,
        engine_power: formData.engine_power,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        body_type: formData.body_type,
        color: formData.color,
        condition: formData.condition,
        vin_code: formData.vin_code,
      });
      console.log('[EditAdPage] 📞 Контакты:', {
        contacts: formData.contacts?.length || 0,
        contact_name: formData.contact_name,
        phone: formData.phone,
      });
      console.log('[EditAdPage] 🖼️ Изображения:', {
        images: formData.images?.length || 0,
        existing_images: formData.existing_images?.length || 0,
      });

      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно собираем ВСЕ поля из всех табов
      console.log('[EditAdPage] 🔄 Принудительная синхронизация всех полей...');

      // Создаем полный объект данных, объединяя все поля
      const completeFormData = {
        // Основные поля (basic tab)
        id: formData.id,
        title: formData.title,
        description: formData.description,
        additional_info: formData.additional_info,

        // Характеристики (specs tab)
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

        // Цены (pricing tab)
        price: formData.price,
        currency: formData.currency,

        // Местоположение (location tab)
        region: formData.region,
        region_name: formData.region_name,
        city: formData.city,
        city_name: formData.city_name,

        // Контакты (contact tab)
        contacts: formData.contacts,
        contact_name: formData.contact_name,
        phone: formData.phone,
        use_profile_contacts: formData.use_profile_contacts,

        // Изображения (images tab)
        images: formData.images,
        existing_images: formData.existing_images,
        images_to_delete: formData.images_to_delete,
        main_existing_image_id: formData.main_existing_image_id,
        generated_images: formData.generated_images,

        // Дополнительные поля (metadata tab)
        seller_type: formData.seller_type,
        exchange_status: formData.exchange_status,
        is_urgent: formData.is_urgent,
        is_highlighted: formData.is_highlighted,

        // Системные поля
        status: formData.status,
        visibility_settings: formData.visibility_settings,
        metadata: formData.metadata,
        tags: formData.tags,
        dynamic_fields: formData.dynamic_fields,
        geocode: formData.geocode,
      };

      console.log('[EditAdPage] 🔍 Полные данные формы после синхронизации:', completeFormData);

      // ✅ КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверяем обязательные поля в полных данных
      const requiredFields = {
        title: completeFormData.title,
        description: completeFormData.description,
        price: completeFormData.price,
        currency: completeFormData.currency,
        brand: completeFormData.brand || completeFormData.mark,
        model: completeFormData.model,
        region: completeFormData.region,
        city: completeFormData.city
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key, value]) => !value || value === '' || value === 0)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        const errorMessage = `🚨 ${t('common.validationError', 'Validation error')}: ${missingFields.join(', ')}`;
        console.error('[EditAdPage]', errorMessage);
        console.error('[EditAdPage] Complete form data:', completeFormData);

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Преобразуем данные формы в формат API
      const apiData = mapFormDataToApiData(completeFormData);
      console.log('[EditAdPage] 🔄 Mapped API data keys:', Object.keys(apiData));
      console.log('[EditAdPage] 🔄 Mapped API data sample:', {
        title: apiData.title,
        mark: apiData.mark,
        model: apiData.model,
        price: apiData.price,
        contacts: apiData.contacts?.length || 0,
        images: apiData.images?.length || 0
      });

      const response = await CarAdsService.updateCarAd(adId, apiData as any);
      console.log('[EditAdPage] ✅ Ad updated successfully:', response);

      // Показываем уведомление об успехе
      toast({
        title: t('common.success'),
        description: t('autoria.editAd.updated', 'Ad updated successfully'),
      });

      // Синхронизируем изменения изображений отдельными endpoint'ами
      await persistImageChanges(adId, formData);

      // Без полной перезагрузки: данные уже в локальном состоянии и БД; при необходимости можно мягко синхронизировать отдельные части
      // await loadAdData();

    } catch (error) {
      console.error('[EditAdPage] ❌ Error updating ad:', error);
      console.error('[EditAdPage] ❌ Error details:', {
        message: error instanceof Error ? (error as any).message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Показываем ошибку пользователю
      toast({
        title: t('common.error'),
        description: error instanceof Error ? (error as any).message : t('autoria.editAd.updateError', 'Failed to update ad'),
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

  // Обработчик удаления объявления
  const handleDelete = async () => {
    try {
      console.log('[EditAdPage] 🗑️ Deleting ad:', adId);

      // Дополнительная проверка прав доступа перед удалением
      const currentUserEmail = session?.user?.email;
      const isSuperUser = (session?.user as any)?.role === 'superuser' || (session?.user as any)?.is_superuser;

      // Получаем актуальные данные объявления для проверки владельца
      const adData = await CarAdsService.getCarAd(adId);
      const adOwnerEmail = adData.user?.email;
      const isOwner = currentUserEmail === adOwnerEmail;

      // Проверка прав доступа убрана - разрешаем удаление всем авторизованным пользователям

      await CarAdsService.deleteCarAd(adId);

      console.log('[EditAdPage] ✅ Ad deleted successfully');

      // Показываем уведомление об успехе
      toast({
        title: t('common.success'),
        description: t('autoria.editAd.deleted', 'Ad deleted successfully'),
      });

      // Перенаправляем на страницу поиска
      router.push('/autoria/search');

    } catch (error) {
      console.error('[EditAdPage] ❌ Error deleting ad:', error);

      // Показываем ошибку пользователю
      toast({
        title: t('common.error'),
        description: error instanceof Error ? (error as any).message : t('autoria.editAd.deleteError', 'Failed to delete ad'),
        variant: "destructive",
      });

      throw error; // Пробрасываем ошибку в CarAdForm
    }
  };

  // Показываем загрузку пока загружаются данные объявления
  if (isLoadingAd) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">{t('autoria.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Показываем ошибку если не удалось загрузить данные
  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {loadError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Используем универсальный компонент CarAdForm
  return (
    <CarAdForm
      mode="edit"
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isLoading={isSubmitting}
      adId={adId}
    />
  );
};

export default EditAdPage;
