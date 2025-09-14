"use client";

import React, { useCallback, useMemo } from 'react';
import { GenericForm } from '@/components/Forms/GenericForm/GenericForm';
// import { carAdSchema } from '../schemas/autoria.schemas';
import { CarAdFormData } from '@/types/autoria';
import { ExtendedFormFieldConfig } from '@/components/Forms/GenericForm/GenericForm';
import { useI18n } from '@/contexts/I18nContext';
import { useVirtualReferenceData } from '@/hooks/useVirtualReferenceData';

interface LocationFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const LocationForm: React.FC<LocationFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();

  console.log('[LocationForm] Rendered with data:', data);
  console.log('[LocationForm] Key location fields:', {
    region: data.region,
    city: data.city
  });

  // Используем хук для загрузки справочных данных
  const { fetchRegions, fetchCities } = useVirtualReferenceData();

  // Функция для загрузки городов - будет обрабатываться динамически в GenericForm
  const fetchCitiesForRegion = fetchCities;

  // Функции для получения названий по ID
  const fetchRegionName = React.useCallback(async (regionId: string | number) => {
    try {
      const response = await fetch(`/api/public/reference/regions?page_size=1000`);
      const responseData = await response.json();
      const region = responseData.options?.find((r: any) => r.value === regionId.toString());
      return region?.label || regionId.toString();
    } catch (error) {
      console.error('Error fetching region name:', error);
      return regionId.toString();
    }
  }, []);

  const fetchCityName = React.useCallback(async (cityId: string | number, regionId: string | number) => {
    try {
      const response = await fetch(`/api/public/reference/cities?region_id=${regionId}&page_size=1000`);
      const responseData = await response.json();
      const city = responseData.options?.find((c: any) => c.value === cityId.toString());
      return city?.label || cityId.toString();
    } catch (error) {
      console.error('Error fetching city name:', error);
      return cityId.toString();
    }
  }, []);

  // Состояние для названий полей
  const [regionLabel, setRegionLabel] = React.useState('');
  const [cityLabel, setCityLabel] = React.useState('');

  // Инициализация названий при загрузке данных
  React.useEffect(() => {
    const initializeLabels = async () => {
      if (data.region) {
        const regionValue = data.region.toString();

        // ПРИОРИТЕТ: сначала проверяем готовое название из данных формы
        if (data.region_name) {
          setRegionLabel(data.region_name);
        } else if (!isNaN(Number(regionValue))) {
          // Только если нет готового названия - загружаем по ID
          const regionName = await fetchRegionName(regionValue);
          setRegionLabel(regionName);
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
    }
    if (data.city_name) {
      setCityLabel(data.city_name);
    }

    // Затем запускаем асинхронную инициализацию для недостающих названий
    if (data.region || data.city) {
      initializeLabels();
    }
  }, [data.region, data.city, data.region_name, data.city_name, fetchRegionName, fetchCityName]);

  const fields: ExtendedFormFieldConfig<Pick<CarAdFormData, 'region' | 'city'>>[] = useMemo(() => [
    {
      name: 'region',
      label: t('region'),
      type: 'virtual-select',
      placeholder: t('selectRegion'),
      required: true,
      fetchOptions: fetchRegions,
      pageSize: 50,
      description: t('selectRegionFirst'),
      initialLabel: regionLabel
    },
    {
      name: 'city',
      label: t('city'),
      type: 'virtual-select',
      placeholder: !data.region ? t('selectRegionFirst') : t('selectCity'),
      required: true,
      fetchOptions: fetchCitiesForRegion,
      pageSize: 50,
      disabled: !data.region,
      key: `city-${data.region}`, // Перезагружаем при смене региона
      description: t('selectRegionFirst'),
      initialLabel: cityLabel
    }
  ], [data.region, t, fetchRegions, fetchCitiesForRegion, regionLabel, cityLabel]);

  const locationSchema = null; // Временно отключена валидация

  const handleSubmit = (formData: Pick<CarAdFormData, 'region' | 'city'>) => {
    onChange(formData);
  };

  // Функция для обработки изменений в форме
  const handleFormChange = useCallback((formData: Partial<CarAdFormData>) => {
    console.log('[LocationForm] Form data changed:', formData);

    // Если изменился регион, очищаем город
    if (formData.region && formData.region !== data.region) {
      console.log('[LocationForm] Region changed to ID:', formData.region);

      // Очищаем выбранный город при смене региона
      if (formData.city) {
        formData.city = '';
        console.log('[LocationForm] Cleared city due to region change');
      }
    }

    // Обновляем данные в родительском компоненте
    onChange(formData);
  }, [data.region, onChange]);

  return (
    <div className="space-y-8 p-4">
      <div className="space-y-2 mb-6">
        <h2 className="text-xl font-semibold text-slate-900">{t('autoria.locationTitle')}</h2>
        <p className="text-sm text-slate-600">{t('autoria.locationDesc')}</p>
      </div>
      <GenericForm
        schema={null}
        fields={fields}
        defaultValues={data}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        submitText={t('autoria.continue')}
        showCard={false}
        resetOnSubmit={false}
        className="space-y-8"
      />
    </div>
  );
};

export default LocationForm;
