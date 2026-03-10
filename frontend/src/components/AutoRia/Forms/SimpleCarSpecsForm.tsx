"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';


import { VirtualSelect } from '@/components/ui/virtual-select';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

interface SimpleCarSpecsFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

// 🧠 МЕМОИЗАЦИЯ: Компонент мемоизирован с React.memo
const SimpleCarSpecsForm: React.FC<SimpleCarSpecsFormProps> = memo(({ data, onChange, errors }) => {
  const { t } = useI18n();
  // Используем VirtualSelect с API запросами как в CarSpecsForm
  // Больше не используем старые хуки, работаем напрямую с API


  // Локальное состояние для предотвращения циклов
  const [localData, setLocalData] = useState<Partial<CarAdFormData>>(data);

  // Отладочная информация
  console.log('[SimpleCarSpecsForm] Current data:', {
    vehicle_type: localData.vehicle_type,
    vehicle_type_id: localData.vehicle_type_id,
    brand: localData.brand,
    brand_id: localData.brand_id,
    model: localData.model
  });

  // Синхронизируем локальное состояние с внешним только при изменении извне
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(localData)) {
      setLocalData(data);
    }
  }, [data]);

  // Обработчик изменения поля с каскадной логикой
  const handleFieldChange = useCallback((fieldName: keyof CarAdFormData, value: any, label?: string) => {
    const newData = { ...localData };

    // Каскадная логика: Тип → Марка → Модель
    if (fieldName === 'vehicle_type') {
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: vehicle_type должен быть ID!
      newData.vehicle_type = value; // ID для API (ИСПРАВЛЕНО!)
      newData.vehicle_type_name = label || value; // Название для отображения
      newData.vehicle_type_id = value; // ID для API (дублируем для совместимости)
      newData.brand = '';
      newData.brand_name = '';
      newData.brand_id = '';
      newData.mark = '';
      newData.mark_name = '';
      newData.model = '';
    } else if (fieldName === 'brand') {
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: brand должен быть ID, а не label!
      newData.brand = value; // ID для API (ИСПРАВЛЕНО!)
      newData.brand_name = label || value; // Название для отображения
      newData.brand_id = value; // ID для API (дублируем для совместимости)
      newData.mark = value; // Дублируем как mark для совместимости
      newData.mark_name = label || value; // Название марки
      newData.model = '';
    } else if (fieldName === 'model') {
      // Модель - просто название
      newData.model = label || value;
    } else {
      // Для остальных полей
      newData[fieldName] = value;
    }

    setLocalData(newData);

    // Уведомляем родительский компонент с задержкой
    setTimeout(() => {
      onChange(newData);
    }, 0);
  }, [localData, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localData);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('autoria.carSpecsDescription')}
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <Label htmlFor="vehicle_type">
            {t('vehicleType')} <span className="text-red-500">*</span>
          </Label>
          <VirtualSelect
            placeholder={t('selectVehicleType')}
            // Ensure value is always ID string; fall back to brand vehicle_type if present
            value={(localData.vehicle_type_id || localData.vehicle_type || '') as string}
            // Prefer explicit name field as initial label
            initialLabel={localData.vehicle_type_name || undefined}
            onValueChange={(value, label) => {
              console.log('🚗 Vehicle type selected:', { value, label });
              const newData = {
                ...localData,
                vehicle_type: value || '', // store ID
                vehicle_type_id: value || '',
                vehicle_type_name: label || '',
                // reset cascading fields
                brand: '',
                brand_id: '',
                brand_name: '',
                model: ''
              };
              setLocalData(newData);
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              console.log('🔍 Fetching vehicle types with search:', search);
              const params = new URLSearchParams();
              if (search) params.append('search', search);
              params.append('page_size', '100');

              const response = await fetch(`/api/public/reference/vehicle-types?${params}`);
              const data = await response.json();
              console.log('🔍 Vehicle types response:', data);

              // Обрабатываем ответ API
              const items = data.options || data.results || data || [];
              return items.map((item: any) => ({
                value: item.value || item.id?.toString() || '',
                label: item.label || item.name || ''
              }));
            }}
            allowClear={true}
            searchable={true}
          />
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <Label htmlFor="brand">
            {t('brand')} <span className="text-red-500">*</span>
          </Label>
          <VirtualSelect
            placeholder={t('selectBrand')}
            // Keep brand value as ID string
            value={(localData.brand_id || localData.brand || '') as string}
            // Try multiple sources for initial label to match DB value
            initialLabel={localData.brand_name || (localData as any).mark_name || undefined}
            onValueChange={(value, label) => {
              console.log('🚗 Brand selected:', { value, label });
              const newData = {
                ...localData,
                brand: value || '',
                brand_id: value || '',
                brand_name: label || '',
                model: ''
              };
              setLocalData(newData);
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              try {
                console.log('🔍 Fetching brands with search:', search);
                console.log('🔍 Current vehicle_type:', localData.vehicle_type);
                console.log('🔍 Current vehicle_type_name:', localData.vehicle_type_name);

                // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ВСЕГДА фильтруем по типу транспорта!
                // Каскадная фильтрация: Тип → Марка → Модель
                if (!localData.vehicle_type && !localData.vehicle_type_name) {
                  console.log('🔍 ❌ No vehicle type selected, returning empty array');
                  return [];
                }

                const params = new URLSearchParams();
                if (search) params.append('search', search);

                // ВСЕГДА добавляем фильтр по типу транспорта
                if (localData.vehicle_type) {
                  params.append('vehicle_type_id', String(localData.vehicle_type));
                  console.log('🔍 ✅ Added vehicle_type_id filter:', localData.vehicle_type);
                } else if (localData.vehicle_type_name) {
                  params.append('vehicle_type_name', String(localData.vehicle_type_name));
                  console.log('🔍 ✅ Added vehicle_type_name filter:', localData.vehicle_type_name);
                }

                params.append('page_size', '1000');

                const url = `/api/public/reference/brands?${params}`;
                console.log('🔍 Fetching brands URL:', url);

                const response = await fetch(url);
                console.log('🔍 Brands response status:', response.status);

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const options = data.options || [];
                console.log('🔍 ✅ Brands filtered by vehicle type, count:', options.length);

                return options;
              } catch (error) {
                console.error('🔍 Error fetching brands:', error);
                return [];
              }
            }}
            allowClear={true}
            searchable={true}
            // ✅ ИСПРАВЛЕНО: Марка доступна только если выбран тип транспорта (каскадная фильтрация)
            disabled={!localData.vehicle_type && !localData.vehicle_type_name}
            dependencies={[localData.vehicle_type, localData.vehicle_type_name]} // Перезагружать при смене типа транспорта
          />
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label htmlFor="model">
            {t('model')} <span className="text-red-500">*</span>
          </Label>
          <VirtualSelect
            placeholder={t('selectModel')}
            // model remains a name string in our schema; preserve initial label
            value={(localData.model || '') as string}
            initialLabel={localData.model || undefined}
            onValueChange={(value, label) => {
              console.log('🚗 Model selected:', { value, label });
              const newData = {
                ...localData,
                model: (label || value || '').toString()
              };
              setLocalData(newData);
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              console.log('🔍 Fetching models with search:', search);
              console.log('🔍 Current brand:', localData.brand);
              console.log('🔍 Current brand_name:', localData.brand_name);

              // Если марка не выбрана, возвращаем пустой массив
              if (!localData.brand && !localData.brand_name) {
                console.log('🔍 No brand selected, returning empty array');
                return [];
              }

              const params = new URLSearchParams();
              if (search) params.append('search', search);

              // Отладочная информация
              console.log('🔍 Current brand data:', {
                brand: localData.brand,
                brand_name: localData.brand_name,
                brandType: typeof localData.brand
              });

              // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Django ожидает mark_id, а не brand_id!
              // Используем ID марки если есть, иначе название
              if (localData.brand) {
                params.append('mark_id', localData.brand.toString()); // ИСПРАВЛЕНО: brand_id → mark_id
              } else if (localData.brand_name) {
                params.append('brand_name', localData.brand_name);
              } else {
                console.log('🔍 No brand data available for models fetch');
                return [];
              }

              params.append('page_size', '1000');

              const url = `/api/public/reference/models?${params}`;
              console.log('🔍 Fetching models URL:', url);

              try {
                const response = await fetch(url);
                console.log('🔍 Response status:', response.status);

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('🔍 Models response:', data);
                console.log('🔍 Models options count:', data.options?.length || 0);
                console.log('🔍 First model sample:', data.options?.[0]);

                const options = data.options || [];
                if (options.length === 0) {
                  console.log('🔍 No models found for brand:', localData.brand || localData.brand_name);
                }

                return options;
              } catch (error) {
                console.error('🔍 Error fetching models:', error);
                return [];
              }
            }}
            allowClear={true}
            searchable={true}
            disabled={!localData.brand && !localData.brand_name}
            dependencies={[localData.brand, localData.brand_name]} // Перезагружать при смене марки
          />
        </div>

        {/* Year */}
        <div className="space-y-2">
          <Label htmlFor="year">
            {t('year')} <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            value={localData.year || ''}
            onChange={(e) => handleFieldChange('year', parseInt(e.target.value) || '')}
            placeholder={t('enterYear')}
            min={1950}
            max={new Date().getFullYear() + 1}
          />
        </div>

        {/* Mileage */}
        <div className="space-y-2">
          <Label htmlFor="mileage">
            {t('mileage')} <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            value={localData.mileage || ''}
            onChange={(e) => handleFieldChange('mileage', parseInt(e.target.value) || '')}
            placeholder={t('enterMileage')}
            min={0}
            max={1000000}
          />
        </div>

        {/* Engine Volume */}
        <div className="space-y-2">
          <Label htmlFor="engine_volume">
            {t('engineVolume')}
          </Label>
          <Input
            type="number"
            step="0.1"
            value={localData.engine_volume || ''}
            onChange={(e) => handleFieldChange('engine_volume', parseFloat(e.target.value) || '')}
            placeholder={t('enterEngineVolume')}
            min={0.1}
            max={10}
          />
        </div>

        {/* Engine Power */}
        <div className="space-y-2">
          <Label htmlFor="engine_power">
            {t('enginePower')}
          </Label>
          <Input
            type="number"
            value={localData.engine_power || ''}
            onChange={(e) => handleFieldChange('engine_power', parseInt(e.target.value) || '')}
            placeholder={t('enterEnginePower')}
            min={1}
            max={2000}
          />
        </div>

        {/* Fuel Type */}
        <div className="space-y-2">
          <Label htmlFor="fuel_type">
            {t('fuelType')}
          </Label>
          <select
            value={localData.fuel_type || ''}
            onChange={(e) => handleFieldChange('fuel_type', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('selectFuelType')}</option>
            <option value="petrol">Бензин</option>
            <option value="diesel">Дизель</option>
            <option value="gas">Газ</option>
            <option value="hybrid">Гибрид</option>
            <option value="electric">Электро</option>
          </select>
        </div>

        {/* Transmission */}
        <div className="space-y-2">
          <Label htmlFor="transmission">
            {t('transmission')}
          </Label>
          <select
            value={localData.transmission || ''}
            onChange={(e) => handleFieldChange('transmission', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('selectTransmission')}</option>
            <option value="manual">Механическая</option>
            <option value="automatic">Автоматическая</option>
            <option value="robot">Робот</option>
            <option value="variator">Вариатор</option>
          </select>
        </div>

        {/* Body Type */}
        <div className="space-y-2">
          <Label htmlFor="body_type">
            {t('bodyType')}
          </Label>
          <select
            value={localData.body_type || ''}
            onChange={(e) => handleFieldChange('body_type', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('selectBodyType')}</option>
            <option value="sedan">Седан</option>
            <option value="hatchback">Хэтчбек</option>
            <option value="wagon">Универсал</option>
            <option value="suv">Внедорожник</option>
            <option value="coupe">Купе</option>
            <option value="convertible">Кабриолет</option>
            <option value="pickup">Пикап</option>
            <option value="van">Фургон</option>
            <option value="minivan">Минивэн</option>
          </select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label htmlFor="color">
            {t('color')}
          </Label>
          <VirtualSelect
            placeholder={t('selectColor')}
            value={String(localData.color || '')}
            onValueChange={(value, label) => {
              console.log('🎨 Color selected:', { value, label });
              const newData = {
                ...localData,
                color: label || value // Сохраняем название цвета
              };
              setLocalData(newData);
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              console.log('🔍 Fetching colors with search:', search);

              const params = new URLSearchParams();
              if (search) params.append('search', search);
              params.append('page_size', '1000'); // Загружаем все цвета

              const response = await fetch(`/api/public/reference/colors?${params}`);
              const data = await response.json();
              console.log('🔍 Colors response:', data);
              return data.options || [];
            }}
            allowClear={true}
            searchable={true}
          />
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label htmlFor="condition">
            {t('condition')}
          </Label>
          <select
            value={localData.condition || ''}
            onChange={(e) => handleFieldChange('condition', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('selectCondition')}</option>
            <option value="new">Новый</option>
            <option value="used">Б/у</option>
            <option value="damaged">Требует ремонта</option>
          </select>
        </div>

        {/* VIN Code */}
        <div className="space-y-2">
          <Label htmlFor="vin_code">
            {t('vinCode')}
          </Label>
          <Input
            type="text"
            value={localData.vin_code || ''}
            onChange={(e) => handleFieldChange('vin_code', e.target.value)}
            placeholder={t('enterVinCode')}
            maxLength={17}
          />
        </div>

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

        <Button type="submit" className="w-full">
          {t('autoria.continue')}
        </Button>
      </form>
    </div>
  );
});

// 🧠 МЕМОИЗАЦИЯ: Устанавливаем displayName для отладки
SimpleCarSpecsForm.displayName = 'SimpleCarSpecsForm';

export default SimpleCarSpecsForm;
