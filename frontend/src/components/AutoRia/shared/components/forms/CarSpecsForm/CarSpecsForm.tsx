"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GenericForm } from '@/components/Forms/GenericForm/GenericForm';
// import { carAdSchema } from '../schemas/autoria.schemas';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { ExtendedFormFieldConfig } from '@/components/Forms/GenericForm/GenericForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useReferenceData } from '@/modules/autoria/shared/hooks/useReferenceData';
import { useVirtualReferenceData } from '@/modules/autoria/shared/hooks/useVirtualReferenceData';
import DebugTranslations from '@/components/DebugTranslations';

interface CarSpecsFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const CarSpecsForm: React.FC<CarSpecsFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const {
    brands,
    models,
    colors,
    brandsLoading,
    modelsLoading,
    colorsLoading,
    brandsError,
    modelsError,
    colorsError,
    loadModels,
    clearModels
  } = useReferenceData();

  const { fetchBrands, fetchModels, fetchColors, fetchVehicleTypes } = useVirtualReferenceData();

  // Функция-заглушка для моделей - будет обновлена в GenericForm
  const fetchModelsWrapper = useCallback(async (search: string, page: number, pageSize: number) => {
    // Эта функция будет переопределена в GenericForm с актуальными значениями
    return {
      options: [],
      hasMore: false,
      total: 0,
    };
  }, []);

  // Debug logging
  console.log('[CarSpecsForm] Rendered with data:', {
    vehicle_type: data.vehicle_type,
    brand: data.brand,
    model: data.model,
    year: data.year,
    title: data.title,
    hasData: Object.keys(data).length > 0
  });
  console.log('[CarSpecsForm] Current data.brand:', data.brand);
  console.log('[CarSpecsForm] Brands:', Array.isArray(brands) ? brands.length : 'NOT_ARRAY', brands);
  console.log('[CarSpecsForm] Models:', Array.isArray(models) ? models.length : 'NOT_ARRAY', models);
  console.log('[CarSpecsForm] Colors:', Array.isArray(colors) ? colors.length : 'NOT_ARRAY', colors);

  // Логика загрузки моделей теперь в virtual-select fetchOptions

  // Опции для селектов
  const fuelTypeOptions = [
    { value: 'petrol', label: t('fuelTypes.petrol') },
    { value: 'diesel', label: t('fuelTypes.diesel') },
    { value: 'gas', label: t('fuelTypes.gas') },
    { value: 'hybrid', label: t('fuelTypes.hybrid') },
    { value: 'electric', label: t('fuelTypes.electric') }
  ];

  const transmissionOptions = [
    { value: 'manual', label: t('transmissions.manual') },
    { value: 'automatic', label: t('transmissions.automatic') },
    { value: 'robot', label: t('transmissions.robot') },
    { value: 'variator', label: t('transmissions.cvt') }
  ];

  const bodyTypeOptions = [
    { value: 'sedan', label: t('bodyTypes.sedan') },
    { value: 'hatchback', label: t('bodyTypes.hatchback') },
    { value: 'wagon', label: t('bodyTypes.wagon') },
    { value: 'suv', label: t('bodyTypes.suv') },
    { value: 'coupe', label: t('bodyTypes.coupe') },
    { value: 'convertible', label: t('bodyTypes.convertible') },
    { value: 'pickup', label: t('bodyTypes.pickup') },
    { value: 'van', label: t('bodyTypes.van') },
    { value: 'minivan', label: t('bodyTypes.minivan') }
  ];

  const conditionOptions = [
    { value: 'new', label: t('conditions.new') },
    { value: 'used', label: t('conditions.used') },
    { value: 'damaged', label: t('conditions.damaged') }
  ];

  // Конфигурация полей с мемоизацией
  const fields: ExtendedFormFieldConfig<Partial<CarAdFormData>>[] = useMemo(() => [
    {
      name: 'vehicle_type',
      label: t('vehicleType'),
      type: 'virtual-select',
      placeholder: t('selectVehicleType'),
      required: true,
      fetchOptions: fetchVehicleTypes,
      pageSize: 20,
      description: t('selectVehicleTypeFirst')
    },
    {
      name: 'brand',
      label: t('brand'),
      type: 'virtual-select',
      placeholder: !data.vehicle_type ? t('selectVehicleTypeFirst') : t('selectBrand'),
      required: true,
      fetchOptions: data.vehicle_type ?
        (search: string, page: number, pageSize: number) => fetchBrands(search, page, pageSize, data.vehicle_type) :
        async () => ({ options: [], hasMore: false, total: 0 }),
      pageSize: 50,
      disabled: !data.vehicle_type,
      key: `brand-${data.vehicle_type}`, // Перезагружаем при смене типа транспорта
      description: t('selectBrandFirst')
    },
    {
      name: 'model',
      label: t('model'),
      type: 'virtual-select',
      placeholder: !data.brand ? t('selectBrandFirst') : t('selectModel'),
      required: true,
      fetchOptions: data.brand ?
        (search: string, page: number, pageSize: number) => fetchModels(data.brand, search, page, pageSize) :
        async () => ({ options: [], hasMore: false, total: 0 }),
      pageSize: 50,
      disabled: !data.brand,
      key: `model-${data.brand}` // Перезагружаем компонент при смене бренда
    },
    {
      name: 'year',
      label: t('year'),
      type: 'number',
      placeholder: t('enterYear'),
      required: true,
      min: 1950,
      max: new Date().getFullYear() + 1
    },
    {
      name: 'mileage',
      label: t('mileage'),
      type: 'number',
      placeholder: t('enterMileage'),
      required: true,
      min: 0,
      max: 1000000
    },
    {
      name: 'engine_volume',
      label: t('engineVolume'),
      type: 'number',
      placeholder: t('enterVolume'),
      required: true,
      min: 0.1,
      max: 10.0
    },
    {
      name: 'fuel_type',
      label: t('fuelType'),
      type: 'select',
      placeholder: t('selectFuelType'),
      required: true,
      options: fuelTypeOptions
    },
    {
      name: 'transmission',
      label: t('transmission'),
      type: 'select',
      placeholder: t('selectTransmission'),
      required: true,
      options: transmissionOptions
    },
    {
      name: 'body_type',
      label: t('bodyType'),
      type: 'select',
      placeholder: t('selectBodyType'),
      required: true,
      options: bodyTypeOptions
    },
    {
      name: 'color',
      label: t('color'),
      type: 'virtual-select',
      placeholder: t('selectColor'),
      required: true,
      fetchOptions: fetchColors,
      pageSize: 30
    },
    {
      name: 'condition',
      label: t('condition'),
      type: 'select',
      placeholder: t('selectCondition'),
      required: true,
      options: conditionOptions
    },
    {
      name: 'vin_code',
      label: t('vinCode'),
      type: 'text',
      placeholder: t('enterVin'),
      required: false,
      description: t('vinDescription')
    },
    {
      name: 'exchange_possible',
      label: t('exchange'),
      type: 'checkbox',
      required: false
    }
  ], [data.vehicle_type, data.brand, t, fetchVehicleTypes, fetchBrands, fetchModels]);

  // Схема валидации для характеристик
  const specsSchema = null; // Временно отключена валидация

  const handleSubmit = (formData: Partial<CarAdFormData>) => {
    onChange(formData);
  };

  // Функция для обработки изменений в форме
  const handleFormChange = useCallback((formData: Partial<CarAdFormData>) => {
    console.log('[CarSpecsForm] Form data changed:', formData);

    // Если изменился vehicle_type, очищаем brand и model
    if (formData.vehicle_type && formData.vehicle_type !== data.vehicle_type) {
      console.log('[CarSpecsForm] Vehicle type changed to ID:', formData.vehicle_type);

      // Очищаем бренд и модель при смене типа транспорта
      if (formData.brand) {
        formData.brand = '';
        console.log('[CarSpecsForm] Cleared brand due to vehicle type change');
      }
      if (formData.model) {
        formData.model = '';
        console.log('[CarSpecsForm] Cleared model due to vehicle type change');
      }
    }

    // Если изменился brand, очищаем модель (virtual-select сам загрузит новые опции)
    if (formData.brand && formData.brand !== data.brand) {
      console.log('[CarSpecsForm] Brand changed to ID:', formData.brand);

      // Очищаем выбранную модель при смене бренда
      if (formData.model) {
        formData.model = '';
        console.log('[CarSpecsForm] Cleared model due to brand change');
      }
    }

    // Обновляем данные в родительском компоненте
    onChange(formData);
  }, [data.vehicle_type, data.brand, onChange]);



  return (
    <div className="space-y-8 p-4">
      {/* Debug Translations */}
      <DebugTranslations />

      {/* Заголовок секции */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('autoria.carSpecsTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('autoria.carSpecsDescription')}
        </p>
      </div>

      {/* Информационная панель */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('autoria.carSpecsDescription')}
        </AlertDescription>
      </Alert>

      {/* Форма */}
      <GenericForm
        schema={null}
        fields={fields}
        defaultValues={data || {}}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        submitText={t('autoria.continue')}
        showCard={false}
        resetOnSubmit={false}
      />

      {/* Показать ошибки если есть */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">❌ Ошибки валидации:</h4>
          <ul className="text-sm text-red-800 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CarSpecsForm;
