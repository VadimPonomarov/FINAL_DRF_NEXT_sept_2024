"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Car,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  ArrowRight,
  Save,
  BarChart3,
  Shield
} from 'lucide-react';
import Link from 'next/link';

// Импорт компонентов форм для каждого таба
import BasicInfoForm from '@/components/AutoRia/Forms/BasicInfoForm';
import CarSpecsForm from '@/components/AutoRia/Forms/CarSpecsForm';
import PricingForm from '@/components/AutoRia/Forms/PricingForm';
import LocationForm from '@/components/AutoRia/Forms/LocationForm';
import MetadataForm from '@/components/AutoRia/Forms/MetadataForm';
import ImagesForm from '@/components/AutoRia/Forms/ImagesForm';
import ContactForm from '@/components/AutoRia/Forms/ContactForm';
import PreviewForm from '@/components/AutoRia/Forms/PreviewForm';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoRiaFormPrefill } from '@/modules/autoria/shared/hooks/useAutoRiaFormPrefill';
import ValidationNotifications from '@/components/AutoRia/Components/ValidationNotifications';
import AutoFillButton from '@/components/AutoRia/Components/AutoFillButton';
import StatisticsTab from '@/components/AutoRia/Statistics/StatisticsTab';

interface UniversalAdFormProps {
  mode: 'create' | 'edit' | 'delete';
  initialData?: Partial<CarAdFormData>;
  onSubmit: (data: Partial<CarAdFormData>) => Promise<void>;
  onDelete?: (adId: number) => Promise<void>; // For delete mode
  onCancel?: () => void;
  isLoading?: boolean;
  adId?: number; // For edit/delete mode
  userPermissions?: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isOwner: boolean;
  };
}

const UniversalAdForm: React.FC<UniversalAdFormProps> = ({
  mode,
  initialData = {},
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
  adId,
  userPermissions = {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    isOwner: true
  }
}) => {
  const { t } = useI18n();

  // Debug logging
  console.log('🔧 [UniversalAdForm] Rendering with props:', {
    mode,
    adId,
    hasInitialData: Object.keys(initialData).length > 0,
    userPermissions,
    isLoading
  });

  // Auto-fill functionality
  const {
    applyAutoFill,
    isAutoFillAvailable,
    getAutoFillSummary,
    loading: userDataLoading
  } = useAutoRiaFormPrefill();

  // Конфигурация табов - точно как в CreateAdPage, но с правильным порядком
  const TABS_CONFIG = [
    {
      id: 'basic',
      label: t('autoria.basicInfo'),
      icon: <FileText className="h-4 w-4" />,
      description: t('autoria.basicInfoDesc'),
      required: true
    },
    {
      id: 'specs',
      label: t('autoria.tabs.specs'),
      icon: <Car className="h-4 w-4" />,
      description: t('autoria.carSpecsDescription'),
      required: true
    },
    {
      id: 'pricing',
      label: t('autoria.tabs.pricing'),
      icon: <DollarSign className="h-4 w-4" />,
      description: t('autoria.priceDesc'),
      required: true
    },
    {
      id: 'location',
      label: t('autoria.tabs.location'),
      icon: <MapPin className="h-4 w-4" />,
      description: t('autoria.locationDesc'),
      required: true
    },
    {
      id: 'contact',
      label: t('autoria.tabs.contact'),
      icon: <Settings className="h-4 w-4" />,
      description: t('autoria.contactDesc'),
      required: true
    },
    {
      id: 'images',
      label: t('autoria.tabs.images'),
      icon: <ImageIcon className="h-4 w-4" />,
      description: t('autoria.imagesDesc'),
      required: false
    }
  ];

  // State - точно как в CreateAdPage
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<CarAdFormData>>(initialData);
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [accountLimits, setAccountLimits] = useState<any>(null);

  // Состояние для валидации и уведомлений
  const [validationResult, setValidationResult] = useState<any>(null);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Состояние для режима удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form data when initialData changes
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData(initialData);
      // Check which tabs are already completed based on initial data
      updateCompletedTabs(initialData);
    }
  }, [initialData]);

  // Функции валидации - точно как в CreateAdPage
  const isTabValid = (tabId: string, data: Partial<CarAdFormData>) => {
    switch (tabId) {
      case 'basic':
        return !!(data.title && data.description);
      case 'specs':
        return !!(data.brand && data.model && data.year);
      case 'pricing':
        return !!(data.price && data.currency);
      case 'location':
        return !!(data.region && data.city);
      case 'contact':
        return !!(data.contact_name && data.phone);
      default:
        return true;
    }
  };

  // Обновление данных формы
  const updateFormData = (tabId: string, data: Partial<CarAdFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    
    // Отмечаем таб как завершенный если данные валидны
    if (isTabValid(tabId, { ...formData, ...data })) {
      setCompletedTabs(prev => new Set([...prev, tabId]));
    } else {
      setCompletedTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tabId);
        return newSet;
      });
    }
  };

  const updateCompletedTabs = (data: Partial<CarAdFormData>) => {
    const completed = new Set<string>();
    
    TABS_CONFIG.forEach(tab => {
      if (isTabValid(tab.id, data)) {
        completed.add(tab.id);
      }
    });
    
    setCompletedTabs(completed);
  };

  // Получение статуса валидации таба
  const getTabValidationStatus = (tabId: string) => {
    const tab = TABS_CONFIG.find(t => t.id === tabId);
    if (!tab || !tab.required) return 'optional';

    const isValid = isTabValid(tabId, formData);
    const hasData = Object.keys(formData).length > 0;

    if (isValid) return 'valid';
    if (hasData && !isValid) return 'invalid';
    return 'empty';
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

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setGeneralErrors([error instanceof Error ? error.message : 'Произошла ошибка']);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete || !adId) return;

    try {
      setIsDeleting(true);
      await onDelete(adId);
    } catch (error) {
      console.error('Delete error:', error);
      setGeneralErrors([error instanceof Error ? error.message : 'Ошибка удаления']);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Calculate progress
  const completedRequiredTabs = TABS_CONFIG.filter(tab => tab.required && completedTabs.has(tab.id)).length;
  const totalRequiredTabs = TABS_CONFIG.filter(tab => tab.required).length;
  const progress = totalRequiredTabs > 0 ? (completedRequiredTabs / totalRequiredTabs) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'create' && t('autoria.createAdTitle')}
              {mode === 'edit' && t('autoria.editAdTitle')}
              {mode === 'delete' && t('autoria.deleteAdTitle')}
            </h1>
            <p className="text-slate-600 mt-1">
              {mode === 'create' && t('autoria.createAdDesc')}
              {mode === 'edit' && t('autoria.editAdDesc')}
              {mode === 'delete' && t('autoria.deleteAdDesc')}
            </p>
          </div>
          
          <div className="flex gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isLoading || isDeleting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
            )}

            {/* Кнопка удаления для режима delete */}
            {mode === 'delete' && userPermissions.canDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.deleting')}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </>
                )}
              </Button>
            )}

            {/* Кнопка сохранения для режимов create/edit */}
            {(mode === 'create' || mode === 'edit') && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || (mode === 'create' && progress < 100) || (mode === 'edit' && !userPermissions.canEdit)}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === 'create' ? t('common.creating') : t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? t('common.create') : t('common.save')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>{t('autoria.progressFill')}</span>
            <span>{completedRequiredTabs} {t('autoria.of')} {totalRequiredTabs} {t('autoria.requiredSections')}</span>
          </div>
          <Progress value={progress} className="h-2" />
          {progress === 100 && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('autoria.readyToPublish')}
            </p>
          )}
        </div>

        {/* Validation Notifications */}
        <ValidationNotifications
          validationResult={validationResult}
          fieldErrors={errors}
          generalErrors={generalErrors}
          onRetry={() => {
            setIsValidating(true);
            setTimeout(() => setIsValidating(false), 2000);
          }}
          onApplySuggestions={(corrections) => {
            setFormData(prev => ({ ...prev, ...corrections }));
            setValidationResult(null);
          }}
          isLoading={isValidating}
        />

        {/* Auto Fill Button - только для создания */}
        {mode === 'create' && (
          <AutoFillButton
            onAutoFill={(data) => {
              setFormData(prev => ({ ...prev, ...data }));
            }}
            currentFormData={formData}
            className="mb-6"
          />
        )}
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
                    {tab.icon}
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
                    {/* Tab Header */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-900">{tab.label}</h2>
                      <p className="text-slate-600">{tab.description}</p>
                    </div>

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

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">{t('autoria.confirmDelete')}</h3>
            </div>

            <p className="text-slate-600 mb-6">
              {t('autoria.confirmDeleteDesc')}
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </Button>

              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.deleting')}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalAdForm;
