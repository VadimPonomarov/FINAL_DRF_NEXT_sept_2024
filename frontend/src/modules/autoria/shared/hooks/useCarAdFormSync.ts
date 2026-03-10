/**
 * Хук для синхронизации данных формы редактирования объявления
 * Обеспечивает правильную передачу данных между компонентами
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

interface UseCarAdFormSyncProps {
  initialData: Partial<CarAdFormData>;
  onDataChange?: (data: Partial<CarAdFormData>) => void;
}

export function useCarAdFormSync({ initialData, onDataChange }: UseCarAdFormSyncProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Partial<CarAdFormData>>(() => initialData);
  const [isDataReady, setIsDataReady] = useState(() => Object.keys(initialData).length > 0);
  const initialDataRef = useRef(initialData);
  const isInitializedRef = useRef(false);

  // Обновляем formData при изменении initialData только один раз при инициализации
  useEffect(() => {
    // Проверяем, изменились ли действительно данные
    const hasChanged = JSON.stringify(initialDataRef.current) !== JSON.stringify(initialData);

    if (!isInitializedRef.current || hasChanged) {
      console.log('[useCarAdFormSync] Initial data changed:', initialData);

      if (Object.keys(initialData).length > 0) {
        console.log('[useCarAdFormSync] Setting form data:', initialData);

        // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: Валидируем обязательные поля
        const requiredFields = ['title', 'description', 'price', 'brand', 'model', 'region', 'city'];
        const missingFields = requiredFields.filter(field => {
          const value = initialData[field as keyof typeof initialData];
          return !value || value === '' || value === 0;
        });

        if (missingFields.length > 0) {
          console.error('[useCarAdFormSync] 🚨 CRITICAL: Missing required fields in initialData:', missingFields);
          console.error('[useCarAdFormSync] 🚨 Initial data:', initialData);
          console.error('[useCarAdFormSync] 🚨 FORM WILL NOT WORK PROPERLY - REQUIRED FIELDS ARE MISSING!');
        }

        setFormData(initialData);
        setIsDataReady(true);
      } else {
        // Устанавливаем значения по умолчанию для новой формы
        const defaultData = {
          contacts: [] as any[],
          use_profile_contacts: true, // По умолчанию используем контакты из профиля
          status: 'draft',
          visibility_settings: {} as any,
          metadata: {} as any,
          tags: [] as any[]
        };
        console.log('[useCarAdFormSync] Setting default data:', defaultData);
        setFormData(defaultData as any);
        setIsDataReady(true);
      }

      initialDataRef.current = initialData;
      isInitializedRef.current = true;
    }
  }, [initialData]);

  // Обработчик изменения данных в табах
  const handleTabDataChange = useCallback((tabId: string, tabData: Partial<CarAdFormData>) => {
    console.log(`[useCarAdFormSync] Tab ${tabId} data changed:`, tabData);

    setFormData(prevData => {
      const newData = { ...prevData, ...tabData };
      console.log('[useCarAdFormSync] Updated form data:', newData);

      // Вызываем callback если он передан, но только если данные действительно изменились
      if (onDataChange && JSON.stringify(prevData) !== JSON.stringify(newData)) {
        // Используем setTimeout чтобы избежать синхронных обновлений состояния
        setTimeout(() => onDataChange(newData), 0);
      }

      return newData;
    });
  }, [onDataChange]);

  // Функция для получения данных конкретного таба
  const getTabData = useCallback((tabId: string): Partial<CarAdFormData> => {
    switch (tabId) {
      case 'specs':
        return {
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
          // Сохраняем названия регионов и городов
          region_name: formData.region_name,
          city_name: formData.city_name,
        };
      
      case 'pricing':
        return {
          price: formData.price,
          currency: formData.currency,
          // Сохраняем названия регионов и городов
          region_name: formData.region_name,
          city_name: formData.city_name,
        };
      
      case 'location':
        return {
          region: formData.region,
          city: formData.city,
          region_name: formData.region_name,
          city_name: formData.city_name,
        };
      
      case 'contact':
        return {
          contacts: formData.contacts,
          contact_name: formData.contact_name,
          phone: formData.phone,
          use_profile_contacts: formData.use_profile_contacts,
          additional_info: formData.additional_info,
          // Сохраняем названия регионов и городов при переключении табов
          region_name: formData.region_name,
          city_name: formData.city_name,
        };
      
      case 'images':
        return {
          images: formData.images,
          existing_images: formData.existing_images,
          images_to_delete: formData.images_to_delete,
          main_existing_image_id: formData.main_existing_image_id,
        };
      
      case 'metadata':
        return {
          license_plate: formData.license_plate,
          number_of_doors: formData.number_of_doors,
          number_of_seats: formData.number_of_seats,
          seller_type: formData.seller_type,
          exchange_status: formData.exchange_status,
          is_urgent: formData.is_urgent,
          is_highlighted: formData.is_highlighted,
        };
      
      case 'basic':
        return {
          title: formData.title,
          description: formData.description,
          additional_info: formData.additional_info,
        };
      
      default:
        return formData;
    }
  }, [formData]);

  // Функция для проверки валидности таба
  const isTabValid = useCallback((tabId: string): boolean => {
    const tabData = getTabData(tabId);
    
    switch (tabId) {
      case 'specs':
        return !!(tabData.brand && tabData.model && tabData.year);
      
      case 'pricing':
        return !!(tabData.price && tabData.currency && tabData.price > 0);
      
      case 'location':
        return !!(tabData.region && tabData.city);
      
      case 'contact':
        // Если используются контакты из профиля - таб валиден
        if (tabData.use_profile_contacts === true) {
          console.log('[useCarAdFormSync] Contact tab valid: using profile contacts');
          return true; // Предполагаем что контакты профиля всегда валидны
        }
        // Иначе проверяем наличие собственных контактов
        const hasOwnContacts = !!(tabData.contacts && Array.isArray(tabData.contacts) &&
                 tabData.contacts.some(contact => contact && contact.value && contact.value.trim() !== ''));
        console.log('[useCarAdFormSync] Contact tab validation:', {
          use_profile_contacts: tabData.use_profile_contacts,
          hasOwnContacts,
          contacts: tabData.contacts
        });
        return hasOwnContacts;
      
      case 'basic':
        return !!(tabData.title && tabData.description);
      
      default:
        return true; // Остальные табы не обязательны
    }
  }, [getTabData]);

  // Функция для получения процента заполнения
  const getCompletionPercentage = useCallback((): number => {
    const requiredTabs = ['specs', 'pricing', 'location', 'contact'];
    const validTabs = requiredTabs.filter(tabId => isTabValid(tabId));
    return Math.round((validTabs.length / requiredTabs.length) * 100);
  }, [isTabValid]);

  // Функция для получения недостающих полей
  const getMissingFields = useCallback((): string[] => {
    const missing = [];
    
    if (!isTabValid('specs')) missing.push(t('autoria.tabs.specs'));
    if (!isTabValid('pricing')) missing.push(t('autoria.tabs.pricing'));
    if (!isTabValid('location')) missing.push(t('autoria.tabs.location'));
    if (!isTabValid('contact')) missing.push(t('autoria.tabs.contact'));
    
    return missing;
  }, [isTabValid]);

  // Функция для проверки готовности формы к отправке
  const isFormValid = useCallback((): boolean => {
    return isTabValid('specs') && isTabValid('pricing') && isTabValid('location') && isTabValid('contact');
  }, [isTabValid]);

  return {
    formData,
    isDataReady,
    handleTabDataChange,
    getTabData,
    isTabValid,
    getCompletionPercentage,
    getMissingFields,
    isFormValid,
    setFormData,
  };
}
