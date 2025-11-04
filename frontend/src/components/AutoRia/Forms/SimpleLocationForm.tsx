"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

import { useVirtualReferenceData } from '@/modules/autoria/shared/hooks/useVirtualReferenceData';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

interface SimpleLocationFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const SimpleLocationForm: React.FC<SimpleLocationFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();

  // Состояние для ID региона (для каскадной связи с городами)
  const [regionId, setRegionId] = useState('');

  // Состояние для названий (labels) для отображения
  const [regionLabel, setRegionLabel] = useState('');
  const [cityLabel, setCityLabel] = useState('');

  // Локальное состояние для предотвращения циклов
  const [localData, setLocalData] = useState<Partial<CarAdFormData>>(data);

  // Функция для получения названия региона по ID
  const fetchRegionName = useCallback(async (regionId: string | number) => {
    try {
      const response = await fetch(`/api/public/reference/regions?page_size=1000`);
      const data = await response.json();
      const region = data.options?.find((r: any) => r.value === regionId.toString());
      return region?.label || regionId.toString();
    } catch (error) {
      console.error('Error fetching region name:', error);
      return regionId.toString();
    }
  }, []);

  // Функция для получения названия города по ID
  const fetchCityName = useCallback(async (cityId: string | number, regionId: string | number) => {
    try {
      const response = await fetch(`/api/public/reference/cities?region_id=${regionId}&page_size=1000`);
      const data = await response.json();
      const city = data.options?.find((c: any) => c.value === cityId.toString());
      return city?.label || cityId.toString();
    } catch (error) {
      console.error('Error fetching city name:', error);
      return cityId.toString();
    }
  }, []);

  // Синхронизируем локальное состояние с внешним только при изменении извне
  useEffect(() => {
    const dataChanged = JSON.stringify(data) !== JSON.stringify(localData);
    if (dataChanged) {
      setLocalData(data);
    }
  }, [data]);

  // Отдельный эффект для инициализации названий
  useEffect(() => {
    console.log('[SimpleLocationForm] Initializing labels with data:', {
      region: data.region,
      region_name: data.region_name,
      city: data.city,
      city_name: data.city_name
    });

    const initializeLabels = async () => {
      if (data.region) {
        const regionValue = data.region.toString();

        // ПРИОРИТЕТ: сначала проверяем готовое название из данных формы
        if (data.region_name) {
          setRegionLabel(data.region_name);
          setRegionId(regionValue);
        } else if (!isNaN(Number(regionValue))) {
          // Только если нет готового названия - загружаем по ID
          const regionName = await fetchRegionName(regionValue);
          setRegionLabel(regionName);
          setRegionId(regionValue);
        } else {
          setRegionLabel(regionValue);
        }

        if (data.city) {
          const cityValue = data.city.toString();

          // ПРИОРИТЕТ: сначала проверяем готовое название из данных формы
          if (data.city_name) {
            setCityLabel(data.city_name);
          } else if (!isNaN(Number(cityValue))) {
            // Только если нет готового названия - загружаем по ID
            const cityName = await fetchCityName(cityValue, regionValue);
            setCityLabel(cityName);
          } else {
            setCityLabel(cityValue);
          }
        }
      } else {
        setRegionLabel('');
        setCityLabel('');
      }
    };

    // Если есть готовые названия - устанавливаем их сразу синхронно
    if (data.region_name) {
      setRegionLabel(data.region_name);
      if (data.region) {
        setRegionId(data.region.toString());
      }
    }
    if (data.city_name) {
      setCityLabel(data.city_name);
    }

    // Затем запускаем асинхронную инициализацию для недостающих названий
    if (data.region || data.city) {
      initializeLabels();
    }
  }, [data.region, data.city, data.region_name, data.city_name, fetchRegionName, fetchCityName]);

  // Обработчик изменения поля
  const handleFieldChange = useCallback((fieldName: keyof CarAdFormData, value: any) => {
    const newData = { ...localData, [fieldName]: value };
    
    // Очищаем зависимые поля
    if (fieldName === 'region') {
      newData.city = '';
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
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          {t('autoria.locationDescription')}
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Region */}
        <div className="space-y-2">
          <Label htmlFor="region">
            {t('region')} <span className="text-red-500">*</span>
          </Label>
          <VirtualSelect
            placeholder={t('selectRegion')}
            value={typeof localData.region === 'number' ? localData.region.toString() : localData.region}
            initialLabel={regionLabel}
            onValueChange={(value, label) => {
              console.log('🏠 Region selected:', { value, label });
              setRegionId(value || ''); // ID для каскадной связи с городами
              setRegionLabel(label || value || '');
              const newData = {
                ...localData,
                region: value, // Сохраняем ID региона
                region_name: label, // Сохраняем название региона
                city: '', // Сбрасываем город при смене региона
                city_name: '' // Сбрасываем название города
              };
              setLocalData(newData);
              setCityLabel(''); // Сбрасываем название города
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              console.log('🔍 Fetching regions with search:', search);

              const params = new URLSearchParams();
              if (search) params.append('search', search);
              params.append('page_size', '1000'); // Загружаем все данные

              const response = await fetch(`/api/public/reference/regions?${params}`);
              const data = await response.json();
              console.log('🔍 Regions response:', data);
              return data.options || [];
            }}
            allowClear={true}
            searchable={true}
          />

        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city">
            {t('city')} <span className="text-red-500">*</span>
          </Label>
          <VirtualSelect
            placeholder={regionId ? t('selectCity') : t('selectRegionFirst')}
            value={typeof localData.city === 'number' ? localData.city.toString() : localData.city}
            initialLabel={cityLabel}
            onValueChange={(value, label) => {
              console.log('🏠 City selected:', { value, label });
              setCityLabel(label || value || '');
              const newData = {
                ...localData,
                city: value, // Сохраняем ID города
                city_name: label // Сохраняем название города
              };
              setLocalData(newData);
              setTimeout(() => onChange(newData), 0);
            }}
            fetchOptions={async (search) => {
              console.log('🔍 Fetching cities with search:', search);
              console.log('🔍 Current regionId:', regionId);

              // Если регион не выбран, возвращаем пустой массив
              if (!regionId) {
                console.log('🔍 No region selected, returning empty array');
                return [];
              }

              const params = new URLSearchParams();
              if (search) params.append('search', search);
              params.append('region_id', regionId);
              params.append('page_size', '1000'); // Загружаем все данные

              const response = await fetch(`/api/public/reference/cities?${params}`);
              const data = await response.json();
              console.log('🔍 Cities response:', data);
              return data.options || [];
            }}
            allowClear={true}
            searchable={true}
            disabled={!regionId}
            dependencies={[regionId]} // Перезагружать при смене региона
          />
          {!regionId && (
            <p className="text-sm text-gray-600">{t('selectRegionFirst')}</p>
          )}
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
};

export default SimpleLocationForm;
