/**
 * Хук для мемоизации данных формы
 * Оптимизирует производительность за счет предотвращения лишних перерендеров
 */

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { CarAdFormData } from '@/types/autoria';

interface UseMemoizedFormDataProps {
  formData: Partial<CarAdFormData>;
  onDataChange?: (data: Partial<CarAdFormData>) => void;
}

export function useMemoizedFormData({ formData, onDataChange }: UseMemoizedFormDataProps) {
  // Кеш для предотвращения лишних вычислений
  const computationCache = useRef(new Map<string, any>());
  
  // 🧠 МЕМОИЗАЦИЯ: Основные поля формы
  const basicFields = useMemo(() => ({
    title: formData.title,
    description: formData.description,
    additional_info: formData.additional_info,
  }), [formData.title, formData.description, formData.additional_info]);

  // 🧠 МЕМОИЗАЦИЯ: Технические характеристики
  const specsFields = useMemo(() => ({
    vehicle_type: formData.vehicle_type,
    vehicle_type_name: formData.vehicle_type_name,
    brand: formData.brand,
    brand_name: formData.brand_name,
    mark: formData.mark,
    mark_name: formData.mark_name,
    model: formData.model,
    year: formData.year,
    mileage: formData.mileage,
    mileage_km: formData.mileage_km,
    engine_volume: formData.engine_volume,
    engine_power: formData.engine_power,
    fuel_type: formData.fuel_type,
    transmission: formData.transmission,
    transmission_type: formData.transmission_type,
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
  }), [
    formData.vehicle_type, formData.vehicle_type_name,
    formData.brand, formData.brand_name, formData.mark, formData.mark_name,
    formData.model, formData.year, formData.mileage, formData.mileage_km,
    formData.engine_volume, formData.engine_power, formData.fuel_type,
    formData.transmission, formData.transmission_type, formData.drive_type,
    formData.body_type, formData.color, formData.color_name,
    formData.steering_wheel, formData.condition, formData.vin_code,
    formData.license_plate, formData.number_of_doors, formData.number_of_seats,
    formData.generation, formData.modification
  ]);

  // 🧠 МЕМОИЗАЦИЯ: Ценообразование
  const pricingFields = useMemo(() => ({
    price: formData.price,
    currency: formData.currency,
  }), [formData.price, formData.currency]);

  // 🧠 МЕМОИЗАЦИЯ: Местоположение
  const locationFields = useMemo(() => ({
    region: formData.region,
    region_name: formData.region_name,
    city: formData.city,
    city_name: formData.city_name,
  }), [formData.region, formData.region_name, formData.city, formData.city_name]);

  // 🧠 МЕМОИЗАЦИЯ: Контакты
  const contactFields = useMemo(() => ({
    contacts: formData.contacts,
    contact_name: formData.contact_name,
    phone: formData.phone,
    use_profile_contacts: formData.use_profile_contacts,
  }), [formData.contacts, formData.contact_name, formData.phone, formData.use_profile_contacts]);

  // 🧠 МЕМОИЗАЦИЯ: Изображения
  const imageFields = useMemo(() => ({
    images: formData.images,
    existing_images: formData.existing_images,
    images_to_delete: formData.images_to_delete,
    main_existing_image_id: formData.main_existing_image_id,
    generated_images: formData.generated_images,
  }), [
    formData.images, formData.existing_images, formData.images_to_delete,
    formData.main_existing_image_id, formData.generated_images
  ]);

  // 🧠 МЕМОИЗАЦИЯ: Дополнительные поля
  const metadataFields = useMemo(() => ({
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
  }), [
    formData.seller_type, formData.exchange_status, formData.is_urgent,
    formData.is_highlighted, formData.status, formData.visibility_settings,
    formData.metadata, formData.tags, formData.dynamic_fields, formData.geocode
  ]);

  // 🧠 МЕМОИЗАЦИЯ: Полные данные формы
  const completeFormData = useMemo(() => ({
    ...basicFields,
    ...specsFields,
    ...pricingFields,
    ...locationFields,
    ...contactFields,
    ...imageFields,
    ...metadataFields,
    id: formData.id,
  }), [basicFields, specsFields, pricingFields, locationFields, contactFields, imageFields, metadataFields, formData.id]);

  // 🧠 МЕМОИЗАЦИЯ: Обработчик изменений данных
  const handleDataChange = useCallback((tabId: string, newData: Partial<CarAdFormData>) => {
    if (onDataChange) {
      onDataChange(newData);
    }
  }, [onDataChange]);

  // 🧠 МЕМОИЗАЦИЯ: Валидация обязательных полей
  const requiredFieldsValidation = useMemo(() => {
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

    return {
      isValid: missingFields.length === 0,
      missingFields,
      requiredFields
    };
  }, [completeFormData]);

  // 🧠 МЕМОИЗАЦИЯ: Статистика заполнения формы
  const completionStats = useMemo(() => {
    const totalFields = Object.keys(completeFormData).length;
    const filledFields = Object.values(completeFormData).filter(value => 
      value !== undefined && value !== null && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;

    return {
      totalFields,
      filledFields,
      completionPercentage: Math.round((filledFields / totalFields) * 100)
    };
  }, [completeFormData]);

  // Функция для очистки кеша
  const clearCache = useCallback(() => {
    computationCache.current.clear();
  }, []);

  return {
    // Мемоизированные группы полей
    basicFields,
    specsFields,
    pricingFields,
    locationFields,
    contactFields,
    imageFields,
    metadataFields,
    
    // Полные данные
    completeFormData,
    
    // Обработчики
    handleDataChange,
    
    // Валидация
    validation: requiredFieldsValidation,
    
    // Статистика
    stats: completionStats,
    
    // Утилиты
    clearCache
  };
}

/**
 * Хук для мемоизации вычислений
 */
export function useMemoizedComputation<T>(
  computeFn: () => T,
  dependencies: any[],
  cacheKey?: string
): T {
  return useMemo(() => {
    console.log(`[Memoization] Computing ${cacheKey || 'unnamed'} with deps:`, dependencies);
    return computeFn();
  }, dependencies);
}

/**
 * Хук для мемоизации асинхронных операций
 */
export function useMemoizedAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[],
  cacheKey?: string
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const memoizedFn = useCallback(asyncFn, dependencies);

  useEffect(() => {
    let cancelled = false;
    
    setLoading(true);
    setError(null);
    
    console.log(`[Async Memoization] Executing ${cacheKey || 'unnamed'} with deps:`, dependencies);
    
    memoizedFn()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [memoizedFn, cacheKey]);

  return { data, loading, error };
}
