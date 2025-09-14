"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  MapPin,
  DollarSign,
  FileText,
  Phone,
  Image as ImageIcon,
  Settings,
  CheckCircle,
  AlertCircle,
  Save,
  Loader2
} from 'lucide-react';

import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { useVirtualReferenceData } from '@/hooks/useVirtualReferenceData';

interface CRUDCarAdFormProps {
  mode: 'create' | 'edit';
  adId?: number;
  initialData?: Partial<CarAdFormData>;
  onSubmit?: (data: Partial<CarAdFormData>) => Promise<void>;
  onCancel?: () => void;
}

const CRUDCarAdForm: React.FC<CRUDCarAdFormProps> = ({
  mode,
  adId,
  initialData = {},
  onSubmit,
  onCancel
}) => {
  const { t } = useI18n();
  const { fetchBrands, fetchModels, fetchColors, fetchVehicleTypes, fetchRegions, fetchCities } = useVirtualReferenceData();

  // Состояние формы
  const [formData, setFormData] = useState<Partial<CarAdFormData>>(initialData);
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDataLoaded, setIsDataLoaded] = useState(mode === 'create');
  
  // Refs для предотвращения циклов
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка данных для редактирования
  useEffect(() => {
    if (mode === 'edit' && adId && !isDataLoaded) {
      loadAdData();
    }
  }, [mode, adId, isDataLoaded]);

  const loadAdData = async () => {
    if (!adId) return;
    
    try {
      setIsLoading(true);
      console.log('[CRUDCarAdForm] Loading ad data for ID:', adId);
      
      const adData = await CarAdsService.getCarAd(adId);
      console.log('[CRUDCarAdForm] Loaded ad data:', adData);
      
      // Преобразуем данные API в формат формы
      const mappedData = mapApiDataToFormData(adData);
      setFormData(mappedData);
      setIsDataLoaded(true);
      
    } catch (error) {
      console.error('[CRUDCarAdForm] Error loading ad data:', error);
      setErrors({ general: 'Ошибка загрузки данных объявления' });
    } finally {
      setIsLoading(false);
    }
  };

  // Преобразование данных API в формат формы
  const mapApiDataToFormData = (apiData: any): Partial<CarAdFormData> => {
    return {
      title: apiData.title || '',
      description: apiData.description || '',
      vehicle_type: apiData.vehicle_type || '',
      brand: apiData.brand || '',
      model: apiData.model || '',
      year: apiData.year || '',
      mileage: apiData.mileage || '',
      engine_volume: apiData.engine_volume || '',
      engine_power: apiData.engine_power || '',
      fuel_type: apiData.fuel_type || '',
      transmission: apiData.transmission || '',
      drive_type: apiData.drive_type || '',
      body_type: apiData.body_type || '',
      color: apiData.color || '',
      condition: apiData.condition || '',
      price: apiData.price || '',
      currency: apiData.currency || 'USD',
      region: apiData.region || '',
      city: apiData.city || '',
      contact_name: apiData.contact_name || '',
      phone: apiData.phone || '',
      vin_code: apiData.vin_code || '',
      license_plate: apiData.license_plate || '',
      seller_type: apiData.seller_type || 'private',
      exchange_status: (apiData.exchange_status === 'no' ? 'no_exchange' : (apiData.exchange_status || 'no_exchange')),
      is_urgent: apiData.is_urgent || false,
      is_highlighted: apiData.is_highlighted || false,
      images: apiData.images || [],
      existing_images: apiData.existing_images || [],
    };
  };

  // Преобразование данных формы в формат API
  const mapFormDataToApiData = (formData: Partial<CarAdFormData>) => {
    return {
      title: formData.title,
      description: formData.description,
      vehicle_type: formData.vehicle_type,
      brand: formData.brand,
      model: formData.model,
      year: formData.year ? parseInt(String(formData.year)) : null,
      mileage: formData.mileage ? parseInt(String(formData.mileage)) : null,
      engine_volume: formData.engine_volume ? parseFloat(String(formData.engine_volume)) : null,
      engine_power: formData.engine_power ? parseInt(String(formData.engine_power)) : null,
      fuel_type: formData.fuel_type,
      transmission: formData.transmission,
      drive_type: formData.drive_type,
      body_type: formData.body_type,
      color: formData.color,
      condition: formData.condition,
      price: formData.price ? parseFloat(String(formData.price)) : null,
      currency: formData.currency,
      region: formData.region,
      city: formData.city,
      contact_name: formData.contact_name,
      phone: formData.phone,
      vin_code: formData.vin_code,
      license_plate: formData.license_plate,
      seller_type: formData.seller_type,
      exchange_status: (() => {
        const raw = formData.exchange_status as any;
        if (!raw) return 'no_exchange';
        if (raw === 'no') return 'no_exchange';
        if (raw === 'possible_exchange') return 'possible';
        return raw;
      })(),
      is_urgent: formData.is_urgent,
      is_highlighted: formData.is_highlighted,
      images: formData.images,
      existing_images: formData.existing_images,
    };
  };

  // Обработчик изменения поля
  const handleFieldChange = useCallback((fieldName: keyof CarAdFormData, value: any) => {
    setFormData(prevData => {
      const newData = { ...prevData, [fieldName]: value };
      
      // Очищаем зависимые поля
      if (fieldName === 'vehicle_type') {
        newData.brand = '';
        newData.model = '';
      } else if (fieldName === 'brand') {
        newData.model = '';
      } else if (fieldName === 'region') {
        newData.city = '';
      }
      
      // Автосохранение с debounce
      if (mode === 'edit' && adId) {
        scheduleAutoSave(newData);
      }
      
      return newData;
    });
    
    // Очищаем ошибку для этого поля
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [mode, adId, errors]);

  // Автосохранение с debounce
  const scheduleAutoSave = useCallback((data: Partial<CarAdFormData>) => {
    const dataString = JSON.stringify(data);
    
    // Проверяем, изменились ли данные
    if (dataString === lastSavedDataRef.current) {
      return;
    }
    
    // Отменяем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[CRUDCarAdForm] Auto-saving data...');
        const apiData = mapFormDataToApiData(data);
        await CarAdsService.updateCarAd(adId!, apiData);
        lastSavedDataRef.current = dataString;
        console.log('[CRUDCarAdForm] Auto-save successful');
      } catch (error) {
        console.error('[CRUDCarAdForm] Auto-save failed:', error);
      }
    }, 2000); // Автосохранение через 2 секунды после последнего изменения
  }, [adId]);

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Базовая информация
    if (!formData.title?.trim()) {
      newErrors.title = 'Заголовок обязателен';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Описание обязательно';
    }
    
    // Характеристики
    if (!formData.vehicle_type) {
      newErrors.vehicle_type = 'Тип транспорта обязателен';
    }
    if (!formData.brand) {
      newErrors.brand = 'Марка обязательна';
    }
    if (!formData.model) {
      newErrors.model = 'Модель обязательна';
    }
    if (!formData.year) {
      newErrors.year = 'Год выпуска обязателен';
    }
    
    // Цена
    if (!formData.price) {
      newErrors.price = 'Цена обязательна';
    }
    if (!formData.currency) {
      newErrors.currency = 'Валюта обязательна';
    }
    
    // Локация
    if (!formData.region) {
      newErrors.region = 'Регион обязателен';
    }
    if (!formData.city) {
      newErrors.city = 'Город обязателен';
    }
    
    // Контакты
    if (!formData.contact_name?.trim()) {
      newErrors.contact_name = 'Имя контакта обязательно';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Телефон обязателен';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      const apiData = mapFormDataToApiData(formData);
      console.log('[CRUDCarAdForm] Submitting form data:', apiData);
      
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        if (mode === 'create') {
          await CarAdsService.createCarAd(apiData);
        } else if (mode === 'edit' && adId) {
          await CarAdsService.updateCarAd(adId, apiData);
        }
      }
      
      console.log('[CRUDCarAdForm] Form submitted successfully');
      
    } catch (error) {
      console.error('[CRUDCarAdForm] Form submission error:', error);
      setErrors({ general: 'Ошибка при сохранении объявления' });
    } finally {
      setIsSaving(false);
    }
  };

  // Функция для получения городов для выбранного региона
  const fetchCitiesForRegion = useCallback(async (
    search: string, 
    page: number, 
    pageSize: number
  ) => {
    if (!formData.region) {
      return { options: [], hasMore: false, total: 0 };
    }
    
    return fetchCities(formData.region, search, page, pageSize);
  }, [formData.region, fetchCities]);

  // Вычисление прогресса заполнения
  const getCompletionPercentage = (): number => {
    const requiredFields = [
      'title', 'description', 'vehicle_type', 'brand', 'model', 'year',
      'price', 'currency', 'region', 'city', 'contact_name', 'phone'
    ];
    
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof CarAdFormData];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  // Проверка валидности таба
  const isTabValid = (tabId: string): boolean => {
    switch (tabId) {
      case 'basic':
        return !!(formData.title && formData.description);
      case 'specs':
        return !!(formData.vehicle_type && formData.brand && formData.model && formData.year);
      case 'pricing':
        return !!(formData.price && formData.currency);
      case 'location':
        return !!(formData.region && formData.city);
      case 'contact':
        return !!(formData.contact_name && formData.phone);
      default:
        return true;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{t('autoria.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {mode === 'create' ? t('autoria.createAd') : t('autoria.editAd')}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-700">
                {t('autoria.completeness')}: {getCompletionPercentage()}%
              </span>
              {mode === 'edit' && (
                <Badge variant="outline" className="text-xs">
                  {t('autoria.autoSave')}
                </Badge>
              )}
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tabs Navigation */}
              <div className="border-b bg-white p-4">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.basicInfo')}</span>
                    {isTabValid('basic') && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </TabsTrigger>
                  <TabsTrigger value="specs" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.tabs.specs')}</span>
                    {isTabValid('specs') && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.tabs.pricing')}</span>
                    {isTabValid('pricing') && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </TabsTrigger>
                  <TabsTrigger value="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.tabs.location')}</span>
                    {isTabValid('location') && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.tabs.contact')}</span>
                    {isTabValid('contact') && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </TabsTrigger>
                  <TabsTrigger value="images" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('autoria.images')}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
