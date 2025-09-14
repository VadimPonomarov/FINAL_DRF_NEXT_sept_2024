"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Shield,
  Plus,
  Edit,
  Zap,
  RotateCcw,
  Phone,
  Eye,
  Trash2,
  ChevronRight
} from 'lucide-react';

// Импорт утилит для мокковых данных
import { generateFullMockData } from '@/utils/mockData';

// Импорт упрощенных компонентов форм
import SimpleCarSpecsForm from '@/components/AutoRia/Forms/SimpleCarSpecsForm';
import SimpleLocationForm from '@/components/AutoRia/Forms/SimpleLocationForm';
import AdContactsForm from '@/components/AutoRia/Forms/AdContactsForm';
import ImagesForm from '@/components/AutoRia/Forms/ImagesForm';
import ModernBasicInfoForm from '@/components/AutoRia/Forms/ModernBasicInfoForm';
import AdditionalInfoForm from '@/components/AutoRia/Forms/AdditionalInfoForm';

import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoRiaFormPrefill } from '@/hooks/useAutoRiaFormPrefill';
import { useCarAdFormSync } from '@/hooks/useCarAdFormSync';
import { useProfileContacts } from '@/hooks/useProfileContacts';
import ValidationNotifications from '@/components/AutoRia/Components/ValidationNotifications';
import AutoFillButton from '@/components/AutoRia/Components/AutoFillButton';
import StatisticsTab from '@/components/AutoRia/Statistics/StatisticsTab';
import styles from './CarAdForm.module.css';

interface CarAdFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CarAdFormData>;
  onSubmit: (data: Partial<CarAdFormData>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;  // Новый callback для удаления
  isLoading?: boolean;
  adId?: number;
}

const CarAdForm: React.FC<CarAdFormProps> = ({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  isLoading = false,
  adId
}) => {
  const { t } = useI18n();
  const { toast } = useToast();

  console.log(`CarAdForm rendered in ${mode} mode`, { adId, hasInitialData: Object.keys(initialData).length > 0 });
  
  const {
    applyAutoFill,
    isAutoFillAvailable,
    getAutoFillSummary,
    loading: userDataLoading
  } = useAutoRiaFormPrefill();

  // Используем новый хук для синхронизации данных
  const {
    formData,
    isDataReady,
    handleTabDataChange,
    getTabData,
    isTabValid,
    getCompletionPercentage,
    getMissingFields,
    isFormValid,
    setFormData
  } = useCarAdFormSync({
    initialData
    // Убираем onDataChange чтобы избежать бесконечных циклов
  });

  // Загружаем контакты из профиля
  const { contacts: profileContacts, loading: profileContactsLoading } = useProfileContacts();

  // Конфигурация табов - описание перед изображениями для генератора
  const TABS_CONFIG = [
    {
      id: 'specs',
      label: t('autoria.tabs.specs'),
      icon: <Car className="h-4 w-4" />,
      description: t('autoria.tabs.specsDesc'),
      required: true
    },
    {
      id: 'pricing',
      label: t('autoria.tabs.pricing'),
      icon: <DollarSign className="h-4 w-4" />,
      description: t('autoria.tabs.pricingDesc'),
      required: true
    },
    {
      id: 'location',
      label: t('autoria.tabs.location'),
      icon: <MapPin className="h-4 w-4" />,
      description: t('autoria.tabs.locationDesc'),
      required: true
    },
    {
      id: 'contact',
      label: t('autoria.tabs.contact'),
      icon: <Phone className="h-4 w-4" />,
      description: t('autoria.tabs.contactDesc'),
      required: true
    },
    {
      id: 'basic',
      label: t('autoria.form.tabs.basic.label'),
      icon: <FileText className="h-4 w-4" />,
      description: t('autoria.form.tabs.basic.description'),
      required: false
    },
    {
      id: 'images',
      label: t('autoria.form.tabs.images.label'),
      icon: <ImageIcon className="h-4 w-4" />,
      description: t('autoria.form.tabs.images.description'),
      required: false
    },
    {
      id: 'additional',
      label: t('autoria.form.tabs.additional.label'),
      icon: <Settings className="h-4 w-4" />,
      description: t('autoria.form.tabs.additional.description'),
      required: false
    },
    {
      id: 'preview',
      label: t('autoria.form.tabs.preview.label'),
      icon: <Info className="h-4 w-4" />,
      description: t('autoria.form.tabs.preview.description'),
      required: false
    },
    {
      id: 'statistics',
      label: t('autoria.tabs.statistics'),
      icon: <BarChart3 className="h-4 w-4" />,
      description: t('autoria.tabs.statisticsDesc'),
      required: false
    }
  ];

  // State для UI
  const [activeTab, setActiveTab] = useState('specs');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  // Используем обработчик из хука синхронизации
  const handleFormDataChange = handleTabDataChange;

  // Функция проверки валидности формы теперь в хуке useCarAdFormSync

  // Функция получения процента заполнения теперь в хуке useCarAdFormSync

  // Функция получения недостающих полей теперь в хуке useCarAdFormSync

  // Генерация мокковых данных для тестирования (с поддержкой каскадных селектов)
  const handleGenerateMockData = async () => {
    try {
      console.log('[CarAdForm] 🎲 Starting cascading mock data generation...');

      const mockData = await generateFullMockData();
      console.log('[CarAdForm] 🎭 Generated cascading mock data:', mockData);

      // Обновляем formData через хук с принудительным обновлением
      setFormData(prevData => {
        const newData = {
          ...prevData,
          ...mockData
        };

        console.log('[CarAdForm] 🔄 Updating form data:', {
          vehicle_type: newData.vehicle_type,
          vehicle_type_name: newData.vehicle_type_name,
          brand: newData.brand,
          brand_name: newData.brand_name,
          model: newData.model,
          region: newData.region,
          region_name: newData.region_name,
          city: newData.city,
          city_name: newData.city_name
        });

        return newData;
      });

      // Принудительно обновляем компоненты через handleTabDataChange
      setTimeout(() => {
        console.log('[CarAdForm] 🔄 Force updating tab components...');
        handleTabDataChange('specs', mockData);
        handleTabDataChange('location', mockData);
        handleTabDataChange('pricing', mockData);
        handleTabDataChange('contact', mockData);
      }, 100);

      // Показываем уведомление
      console.log('[CarAdForm] ✅ Cascading mock data applied successfully');

    } catch (error) {
      console.error('[CarAdForm] ❌ Error generating mock data:', error);
      alert(`Ошибка при генерации данных: ${error.message || error}`);
    }
  };



  // Функция очистки всей формы
  const handleResetForm = () => {
    console.log('[CarAdForm] 🗑️ Resetting form data');
    setFormData({});
  };

  // Обработчик отправки формы
  // 🧠 МЕМОИЗАЦИЯ: handleSubmit мемоизирован
  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) {
      setGeneralErrors(['Заповніть всі обов\'язкові поля']);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setGeneralErrors(['Не удалось сохранить объявление']);
    }
  }, [formData, isFormValid, onSubmit]);

  // Обработчик удаления объявления
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    // Показываем подтверждение удаления через стандартный confirm
    const confirmed = window.confirm(
      'Ви впевнені, що хочете видалити це оголошення?\n\nЦю дію неможливо скасувати.'
    );

    if (!confirmed) return;

    try {
      await onDelete();
      // Уведомление об успехе будет показано в EditAdPage
    } catch (error) {
      console.error('Error deleting ad:', error);
      // Ошибка будет обработана в EditAdPage
    }
  }, [onDelete]);

  // 🧠 МЕМОИЗАЦИЯ: Заголовки мемоизированы
  const title = useMemo(() => {
    return mode === 'create'
      ? (t('autoria.createAdTitle') || 'Створити оголошення')
      : (t('autoria.editAdTitle') || 'Редагувати оголошення');
  }, [mode, t]);

  const getTitle = () => title;

  const getDescription = () => {
    return mode === 'create'
      ? (t('autoria.createAdDesc') || 'Створіть оголошення про продаж автомобіля')
      : (t('autoria.editAdDesc') || 'Внесіть зміни у ваше оголошення');
  };

  const getSubmitButtonText = () => {
    if (isLoading) {
      return mode === 'create'
        ? (t('autoria.creating') || 'Створення...')
        : (t('autoria.saving') || 'Збереження...');
    }
    return mode === 'create'
      ? (t('autoria.createAd') || 'Створити оголошення')
      : (t('autoria.saveChanges') || 'Зберегти зміни');
  };

  const getSubmitButtonIcon = () => {
    return mode === 'create' ? <Plus className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />;
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              {getTitle()}
            </h1>
            <p className={styles.description}>
              {getDescription()}
            </p>
          </div>
          <div className={styles.headerActions}>
            {/* Кнопки для тестирования */}
            {true && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMockData}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  title="Швидка генерація даних"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  ⚡ Quick
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  title="Очистити форму"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  🗑️ Reset
                </Button>
              </>
            )}

            {/* Кнопка быстрого просмотра объявления */}
            {mode === 'edit' && adId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/autoria/ads/view/${adId}`, '_blank')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                title="Швидкий перегляд оголошення"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className={!isFormValid() ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isLoading ? (
                <>
                  <div className={styles.loadingSpinner}></div>
                  {getSubmitButtonText()}
                </>
              ) : (
                <>
                  {getSubmitButtonIcon()}
                  {getSubmitButtonText()}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {mode === 'create' ? t('autoria.back') : t('common.cancel')}
            </Button>

            {/* Кнопка удаления - только в режиме редактирования */}
            {mode === 'edit' && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Видалити
              </Button>
            )}
          </div>
        </div>

        {/* Progress and Form Status */}
        <Card className={styles.progressCard}>
          <CardContent className="p-6">
            <div className={styles.progressHeader}>
              <div>
                <span className={styles.progressLabel}>{t('autoria.progressFill')}</span>
                <div className={styles.progressSubtext}>
                  {t('autoria.completed')}: {getCompletionPercentage()}%
                </div>
              </div>
              <div className={styles.progressRight}>
                <span className={styles.progressPercentage}>{getCompletionPercentage()}%</span>
                {isFormValid() ? (
                  <div className={styles.progressReady}>✓ {t('autoria.readyToPublish')}</div>
                ) : (
                  <div className="text-xs text-orange-600 mt-1">
                    {t('autoria.needToFill')}: {getMissingFields().join(', ')}
                  </div>
                )}
              </div>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2 mt-4" />
          </CardContent>
        </Card>

        {/* Автозаполнение только для режима создания */}
        {mode === 'create' && (
          <AutoFillButton
            onAutoFill={applyAutoFill}
            isAvailable={isAutoFillAvailable}
            isLoading={userDataLoading}
            summary={getAutoFillSummary()}
            className="mb-6"
          />
        )}

        {/* Main Form */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tabs Navigation - как в оригинале */}
              <div className="border-b bg-white p-4">
                <div className="flex gap-2 justify-start overflow-x-auto">
                  {TABS_CONFIG.filter(tab => tab.id !== 'preview' && tab.id !== 'statistics').map((tab) => {
                    const isActive = activeTab === tab.id;

                    // Проверяем валидность таба
                    let isTabValid = true;
                    if (tab.required) {
                      switch (tab.id) {
                        case 'specs':
                          isTabValid = !!(formData.brand && formData.model && formData.year);
                          break;
                        case 'pricing':
                          isTabValid = !!(formData.price && formData.currency);
                          break;
                        case 'location':
                          isTabValid = !!(formData.region && formData.city);
                          break;
                        case 'contact':
                          // Проверяем связь с профилем, массив contacts или старые поля для обратной совместимости
                          isTabValid = !!(
                            formData.use_profile_contacts || // Если связано с профилем - валидно
                            (formData.contacts && Array.isArray(formData.contacts) &&
                              formData.contacts.some(contact => contact && contact.value && contact.value.trim() !== '')) ||
                            (formData.phone && formData.phone.trim() !== '')
                          );
                          break;
                      }
                    }

                    const buttonClass = "relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap " +
                      (isActive
                        ? "bg-orange-100 text-orange-600 border-orange-300"
                        : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200");

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={buttonClass}
                      >
                        {tab.icon}
                        <span className="text-sm font-medium">{tab.label}</span>
                        {tab.required && (
                          <>
                            {isTabValid ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Контент табов с отступами */}
              <TabsContent value="specs" className="p-6">
                <SimpleCarSpecsForm
                  data={getTabData('specs')}
                  onChange={(data) => handleFormDataChange('specs', data)}
                  errors={[]}
                />
              </TabsContent>

              <TabsContent value="pricing" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('autoria.tabs.pricing')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {t('price')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) => handleFormDataChange('pricing', { price: parseFloat(e.target.value) || '' })}
                        placeholder={t('enterPrice')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {t('currency')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.currency || 'USD'}
                        onChange={(e) => handleFormDataChange('pricing', { currency: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="UAH">UAH</option>
                      </select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="p-6">
                <SimpleLocationForm
                  data={getTabData('location')}
                  onChange={(data) => handleFormDataChange('location', data)}
                  errors={[]}
                />
              </TabsContent>

              <TabsContent value="contact" className="p-6">
                <AdContactsForm
                  data={getTabData('contact')}
                  onChange={(data) => handleFormDataChange('contact', data)}
                  errors={[]}
                  profileContacts={profileContacts}
                />
              </TabsContent>

              <TabsContent value="basic" className="p-6">
                <ModernBasicInfoForm
                  data={getTabData('basic')}
                  onChange={(data) => handleFormDataChange('basic', data)}
                  errors={[]}
                />
              </TabsContent>

              <TabsContent value="images" className="p-6">
                <ImagesForm
                  data={{
                    ...getTabData('images'),
                    // Передаем нужные поля из других табов для генерации, включая описание
                    brand: formData.brand,
                    brand_name: formData.brand_name,
                    model: formData.model,
                    year: formData.year,
                    color: formData.color,
                    condition: formData.condition,
                    title: formData.title,
                    description: formData.description // Теперь описание доступно для генератора
                  }}
                  onChange={(data) => handleFormDataChange('images', data)}
                  errors={[]}
                  adId={adId}
                />
              </TabsContent>

              <TabsContent value="additional" className="p-6">
                <AdditionalInfoForm
                  data={getTabData('additional')}
                  onChange={(data) => handleFormDataChange('additional', data)}
                  errors={[]}
                />
              </TabsContent>

              <TabsContent value="metadata" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('autoria.additionalInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {t('vinCode')}
                      </label>
                      <input
                        type="text"
                        value={formData.vin_code || ''}
                        onChange={(e) => handleFormDataChange('metadata', { vin_code: e.target.value })}
                        placeholder={t('enterVinCode')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        maxLength={17}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {t('licensePlate')}
                      </label>
                      <input
                        type="text"
                        value={formData.license_plate || ''}
                        onChange={(e) => handleFormDataChange('metadata', { license_plate: e.target.value })}
                        placeholder={t('enterLicensePlate')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('autoria.preview')}</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold">{formData.title || t('autoria.noTitle')}</h4>
                    <p className="text-gray-600 mt-2">{formData.description || t('autoria.noDescription')}</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div><strong>{t('brand')}:</strong> {formData.brand || '-'}</div>
                      <div><strong>{t('model')}:</strong> {formData.model || '-'}</div>
                      <div><strong>{t('year')}:</strong> {formData.year || '-'}</div>
                      <div><strong>{t('price')}:</strong> {formData.price ? `${formData.price} ${formData.currency}` : '-'}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="statistics" className="p-6">
                <StatisticsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CarAdForm;
