"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Car,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  FileText,
  ArrowLeft,
  Save,
  Phone
} from 'lucide-react';

// Импорт компонентов форм для каждого таба
import BasicInfoForm from '@/components/AutoRia/Forms/BasicInfoForm';
import CarSpecsForm from '@/components/AutoRia/Forms/CarSpecsForm';
import PricingForm from '@/components/AutoRia/Forms/PricingForm';
import LocationForm from '@/components/AutoRia/Forms/LocationForm';
import { ImagesForm } from '@/components/AutoRia/Forms/ImagesForm';
import ContactForm from '@/components/AutoRia/Forms/ContactForm';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

export interface BaseAdFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CarAdFormData>;
  onSubmit: (data: Partial<CarAdFormData>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // For ValidationNotifications, AutoFillButton, etc.
}

const BaseAdForm: React.FC<BaseAdFormProps> = ({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  title,
  subtitle,
  children
}) => {
  const { t } = useI18n();

  // Конфигурация табов - точно как в CreateAdPage
  const tabs = [
    {
      id: 'basic',
      label: t('autoria.basicInfo'),
      icon: FileText,
      required: true,
      description: t('autoria.basicInfoDesc')
    },
    {
      id: 'specs',
      label: t('autoria.tabs.specs'),
      icon: Car,
      required: true,
      description: t('autoria.carSpecsDescription')
    },
    {
      id: 'pricing',
      label: t('autoria.tabs.pricing'),
      icon: DollarSign,
      required: true,
      description: t('autoria.pricingDesc')
    },
    {
      id: 'location',
      label: t('autoria.tabs.location'),
      icon: MapPin,
      required: true,
      description: t('autoria.locationDesc')
    },
    {
      id: 'contact',
      label: t('autoria.tabs.contact'),
      icon: Phone,
      required: true,
      description: t('autoria.contactDesc')
    },
    {
      id: 'images',
      label: t('autoria.images'),
      icon: ImageIcon,
      required: false,
      description: t('autoria.imagesDesc')
    }
  ];

  // State - точно как в CreateAdPage
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<CarAdFormData>>(initialData);
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Initialize form data when initialData changes
  useEffect(() => {
    setFormData(initialData);
    // Check which tabs are already completed based on initial data
    updateCompletedTabs(initialData);
  }, [initialData]);

  // Функции валидации - точно как в CreateAdPage
  const validateTab = (tabId: string, data: Partial<CarAdFormData>): string[] => {
    const errors: string[] = [];

    switch (tabId) {
      case 'basic':
        if (!data.title?.trim()) errors.push('Заголовок обязателен');
        if (!data.description?.trim()) errors.push('Описание обязательно');
        if (data.title && data.title.length < 10) errors.push('Заголовок должен содержать минимум 10 символов');
        if (data.description && data.description.length < 50) errors.push('Описание должно содержать минимум 50 символов');
        break;

      case 'specs':
        if (!data.brand) errors.push('Марка обязательна');
        if (!data.model) errors.push('Модель обязательна');
        if (!data.year) errors.push('Год выпуска обязателен');
        if (data.year && (data.year < 1900 || data.year > new Date().getFullYear() + 1)) {
          errors.push('Некорректный год выпуска');
        }
        break;

      case 'pricing':
        if (!data.price) errors.push('Цена обязательна');
        if (!data.currency) errors.push('Валюта обязательна');
        if (data.price && data.price <= 0) errors.push('Цена должна быть больше 0');
        break;

      case 'location':
        if (!data.region) errors.push('Область обязательна');
        if (!data.city) errors.push('Город обязателен');
        break;

      case 'contact':
        if (!data.contact_name?.trim()) errors.push('Имя контакта обязательно');
        if (!data.phone?.trim()) errors.push('Телефон обязателен');
        break;

      case 'images':
        // Images are optional
        break;
    }

    return errors;
  };

  // Update completed tabs based on form data
  const updateCompletedTabs = (data: Partial<CarAdFormData>) => {
    const completed = new Set<string>();
    const newErrors: Record<string, string[]> = {};

    tabs.forEach(tab => {
      const tabErrors = validateTab(tab.id, data);
      newErrors[tab.id] = tabErrors;

      if (tabErrors.length === 0 && tab.required) {
        completed.add(tab.id);
      } else if (!tab.required) {
        // Optional tabs are always considered completed
        completed.add(tab.id);
      }
    });

    setCompletedTabs(completed);
    setValidationErrors(newErrors);
  };

  // Get tab validation status for UI indicators - точно как в CreateAdPage
  const getTabValidationStatus = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.required) return 'optional';

    const tabErrors = validationErrors[tabId] || [];
    const hasData = Object.keys(formData).length > 0;

    if (tabErrors.length === 0 && hasData) return 'valid';
    if (tabErrors.length > 0 && hasData) return 'invalid';
    return 'empty';
  };

  // Update form data and validation
  const updateFormData = (tabId: string, data: Partial<CarAdFormData>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    
    // Update completed tabs
    updateCompletedTabs(newFormData);
    
    // Clear errors for this section
    setErrors(prev => ({ ...prev, [tabId]: [] }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Handle errors here if needed
    }
  };

  // Render tab indicator
  const renderTabIndicator = (tabId: string) => {
    const status = getTabValidationStatus(tabId);
    
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="ml-2 bg-green-500 text-white">✓</Badge>;
      case 'invalid':
        return <Badge variant="destructive" className="ml-2">!</Badge>;
      case 'empty':
        return <Badge variant="secondary" className="ml-2">○</Badge>;
      case 'optional':
        return <Badge variant="outline" className="ml-2">~</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
          </div>
          
          <div className="flex gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
            )}
            
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? t('common.creating') : t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? t('common.create') : t('common.save')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Additional components (ValidationNotifications, AutoFillButton, etc.) */}
        {children}
      </div>

      {/* Main Form */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tabs Navigation */}
            <div className="border-b bg-slate-50 px-6 py-4">
              <TabsList className="grid w-full grid-cols-6 gap-2">
                {TABS_CONFIG.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 text-xs sm:text-sm relative"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {renderTabIndicator(tab.id)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-6 min-h-0 flex-1">
              {TABS_CONFIG.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <div className="space-y-6 py-4">
                    {/* Render appropriate form component */}
                    {tab.id === 'basic' && (
                      <BasicInfoForm
                        data={formData}
                        onChange={(data) => updateFormData('basic', data)}
                        errors={errors.basic}
                      />
                    )}

                    {tab.id === 'specs' && (
                      <CarSpecsForm
                        data={formData}
                        onChange={(data) => updateFormData('specs', data)}
                        errors={errors.specs}
                      />
                    )}

                    {tab.id === 'pricing' && (
                      <PricingForm
                        data={formData}
                        onChange={(data) => updateFormData('pricing', data)}
                        errors={errors.pricing}
                      />
                    )}

                    {tab.id === 'location' && (
                      <LocationForm
                        data={formData}
                        onChange={(data) => updateFormData('location', data)}
                        errors={errors.location}
                      />
                    )}

                    {tab.id === 'contact' && (
                      <ContactForm
                        data={formData}
                        onChange={(data) => updateFormData('contact', data)}
                        errors={errors.contact}
                      />
                    )}

                    {tab.id === 'images' && (
                      <ImagesForm
                        data={formData}
                        onChange={(data) => updateFormData('images', data)}
                        errors={errors.images}
                      />
                    )}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaseAdForm;
