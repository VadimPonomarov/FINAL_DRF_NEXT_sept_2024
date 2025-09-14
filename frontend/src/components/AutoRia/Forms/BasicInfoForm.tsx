"use client";

import React, { useState } from 'react';
import { GenericForm } from '@/components/Forms/GenericForm/GenericForm';
// // import { carAdSchema } from '../schemas/autoria.schemas';
import { CarAdFormData } from '@/types/autoria';
import { ExtendedFormFieldConfig } from '@/components/Forms/GenericForm/GenericForm';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube, FileText, AlertTriangle, CheckCircle, Wand2, RefreshCw } from 'lucide-react';
import ValidationDemo from '@/components/AutoRia/Components/ValidationDemo';
import ContentValidationModal from '@/components/AutoRia/Components/ContentValidationModal';

// Временная заглушка для ContentValidationModal
const ContentValidationModalStub = ({ isOpen, onClose, formData, validationResult, onRetry, onAccept, t }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <h3 className="text-lg font-medium mb-4">{t('validation.resultTitle', 'Validation Result')}</h3>
        <p className="text-gray-600 mb-4">
          {t('validation.status', 'Status')}: {validationResult?.status || t('validation.unknown', 'unknown')}
        </p>
        <p className="text-gray-600 mb-4">
          {validationResult?.reason || t('validation.finished', 'Check completed')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {t('common.close', 'Close')}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t('common.retry', 'Retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface BasicInfoFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

// Примерные данные для быстрого заполнения
const SAMPLE_DATA_TEMPLATES = [
  {
    title: "BMW X5 2020 - премиум кроссовер в отличном состоянии",
    description: "Продается BMW X5 2020 года в идеальном состоянии. Один владелец, полная история обслуживания в официальном дилере. Автомобиль не участвовал в ДТП, все ТО пройдены вовремя. Комплектация: кожаный салон, панорамная крыша, система навигации, камеры кругового обзора, адаптивный круиз-контроль. Двигатель 3.0 л, 340 л.с., полный привод xDrive. Пробег 45 000 км. Цена договорная. Торг уместен. Обмен не рассматриваю."
  },
  {
    title: "Mercedes-Benz E-Class 2019 - бизнес седан премиум класса",
    description: "Продается Mercedes-Benz E-Class 2019 года. Автомобиль в отличном техническом состоянии, регулярное обслуживание у официального дилера. Комплектация Avantgarde: кожаный салон, климат-контроль, мультимедийная система MBUX, светодиодные фары, парктроник, камера заднего вида. Двигатель 2.0 л турбо, 245 л.с., задний привод. Пробег 62 000 км. Все документы в порядке. Возможен обмен на авто меньшего класса с доплатой."
  },
  {
    title: "Toyota Camry 2021 - надежный семейный седан",
    description: "Продается Toyota Camry 2021 года. Автомобиль практически новый, пробег всего 25 000 км. Полная комплектация: кожаный салон, система безопасности Toyota Safety Sense 2.0, беспроводная зарядка для телефона, подогрев сидений, климат-контроль. Гибридная силовая установка 2.5 л + электромотор, общая мощность 218 л.с. Очень экономичный расход топлива. Один владелец, все ТО у дилера. Идеальное состояние."
  },
  {
    title: "Volkswagen Golf 2018 - компактный и экономичный хэтчбек",
    description: "Продается Volkswagen Golf 2018 года. Экономичный и надежный автомобиль для города и дальних поездок. Комплектация Comfortline: кондиционер, мультимедийная система с Android Auto/Apple CarPlay, парктроник, круиз-контроль. Двигатель 1.4 TSI, 125 л.с., механическая коробка передач. Пробег 78 000 км. Регулярное обслуживание, все документы в порядке. Отличный вариант для молодой семьи."
  },
  {
    title: "Ford Transit 2020 - коммерческий фургон для бизнеса",
    description: "Продается Ford Transit 2020 года. Отличное состояние, использовался для доставки товаров. Грузоподъемность 1.5 тонны, объем кузова 12 м³. Экономичный дизельный двигатель 2.0 л, 130 л.с. Механическая коробка передач, задний привод. Пробег 95 000 км. Регулярное ТО, все документы в порядке. Идеально подходит для малого бизнеса, доставки, переездов. Торг при осмотре."
  }
];

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('form');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Конфигурация полей для основной информации
  const fields: ExtendedFormFieldConfig<Pick<CarAdFormData, 'title' | 'description'>>[] = [
    {
      name: 'title',
      label: t('autoria.title'),
      type: 'text',
      placeholder: t('enterTitle'),
      required: true,
      description: t('titleDescription')
    },
    {
      name: 'description',
      label: t('description'),
      type: 'textarea',
      placeholder: t('enterDescription'),
      required: true,
      rows: 8,
      description: t('descriptionDescription')
    }
  ];

  // Схема валидации только для основной информации
  const basicInfoSchema = null; // Временно отключена валидация

  const handleSubmit = (formData: Pick<CarAdFormData, 'title' | 'description'>) => {
    onChange(formData);
  };

  // Функция для заполнения примерными данными
  const fillSampleData = () => {
    const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];

    // Заполняем поля через DOM для мгновенного отображения
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
    const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;

    if (titleInput) {
      titleInput.value = randomTemplate.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (descriptionTextarea) {
      descriptionTextarea.value = randomTemplate.description;
      descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Также обновляем состояние компонента
    onChange({
      ...data,
      title: randomTemplate.title,
      description: randomTemplate.description
    });
  };

  // Функция для валидации текущего контента формы
  const validateCurrentContent = async () => {
    if (!data.title || !data.description) {
      alert(t('basicInfo.fillTitleDescription', 'Please fill in title and description to validate'));

      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/autoria/moderation/check-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate content');
      }

      const result = await response.json();
      setValidationResult({
        status: result.result,
        reason: result.reason,
        violations: result.categories,
        inappropriate_words: result.inappropriate_words,
        suggestions: result.suggestions,
        confidence: result.confidence,
        censored_content: {
          title: result.censored_title,
          description: result.censored_description,
        }
      });
      setIsValidationModalOpen(true);
    } catch (error) {
      console.error('Validation error:', error);
      alert(t('basicInfo.validationError', 'Error validating content. Please try again.'));
    } finally {
      setIsValidating(false);
    }
  };

  // Функция проверки обязательных полей для генерации
  const validateRequiredFieldsForGeneration = () => {
    const requiredFields = [
      { key: 'brand', name: 'Марка автомобиля', tab: 'Car Specs' },
      { key: 'model', name: 'Модель автомобиля', tab: 'Car Specs' },
      { key: 'year', name: 'Год выпуска', tab: 'Metadata' },
      { key: 'price', name: 'Цена', tab: 'Pricing' }
    ];

    const missingFields: string[] = [];
    const formDataAny = data as any;

    requiredFields.forEach(field => {
      if (!formDataAny[field.key] || formDataAny[field.key] === '') {
        missingFields.push(`${field.name} (${field.tab})`);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // Функция генерации заголовка с помощью AI
  const generateTitle = async () => {
    // Проверяем обязательные поля
    const validation = validateRequiredFieldsForGeneration();
    if (!validation.isValid) {
      alert(`🚫 ${t('ai.requiredFieldsTitle', 'To generate the title, please fill the required fields:')}\n\n${validation.missingFields.join('\n')}\n\n${t('ai.pleaseGoToTabs', 'Please go to the corresponding tabs and fill these fields.')}`);
      return;
    }

    setIsGenerating(true);
    try {
      // Получаем данные из других табов
      const formDataAny = data as any;
      const carData = {
        brand: formDataAny.brand,
        model: formDataAny.model,
        year: formDataAny.year,
        price: formDataAny.price,
        currency: formDataAny.currency || 'USD',
        mileage: formDataAny.mileage,
        fuel_type: formDataAny.fuel_type,
        transmission: formDataAny.transmission
      };

      const response = await fetch('/api/autoria/ai/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      });

      if (response.ok) {
        const result = await response.json();
        const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = result.title;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        onChange({ ...data, title: result.title });
      } else {
        // Fallback к шаблону
        const fallbackTitle = `${carData.brand} ${carData.model} ${carData.year} - отличное состояние`;
        const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = fallbackTitle;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        onChange({ ...data, title: fallbackTitle });
      }
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback к случайному шаблону
      const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
      const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (titleInput) {
        titleInput.value = randomTemplate.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onChange({ ...data, title: randomTemplate.title });
    } finally {
      setIsGenerating(false);
    }
  };

  // Функция генерации описания с помощью AI
  const generateDescription = async () => {
    // Проверяем обязательные поля
    const validation = validateRequiredFieldsForGeneration();
    if (!validation.isValid) {
      alert(`🚫 Для генерации описания необходимо заполнить следующие обязательные поля:\n\n${validation.missingFields.join('\n')}\n\nПожалуйста, перейдите к соответствующим табам и заполните эти поля.`);
      return;
    }

    setIsGenerating(true);
    try {
      // Получаем данные из других табов
      const formDataAny = data as any;
      const carData = {
        brand: formDataAny.brand,
        model: formDataAny.model,
        year: formDataAny.year,
        price: formDataAny.price,
        currency: formDataAny.currency || 'USD',
        mileage: formDataAny.mileage,
        fuel_type: formDataAny.fuel_type,
        transmission: formDataAny.transmission,
        engine_volume: formDataAny.engine_volume,
        body_type: formDataAny.body_type,
        color: formDataAny.color,
        condition: formDataAny.condition
      };

      const response = await fetch('/api/autoria/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      });

      if (response.ok) {
        const result = await response.json();
        const descriptionTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (descriptionTextarea) {
          descriptionTextarea.value = result.description;
          descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        onChange({ ...data, description: result.description });
      } else {
        // Fallback к шаблону
        const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
        const descriptionTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (descriptionTextarea) {
          descriptionTextarea.value = randomTemplate.description;
          descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        onChange({ ...data, description: randomTemplate.description });
      }
    } catch (error) {
      console.error('Error generating description:', error);
      // Fallback к случайному шаблону
      const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
      const descriptionTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (descriptionTextarea) {
        descriptionTextarea.value = randomTemplate.description;
        descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onChange({ ...data, description: randomTemplate.description });
    } finally {
      setIsGenerating(false);
    }
  };

  // Функция очистки полей
  const resetFields = () => {
    onChange({
      ...data,
      title: '',
      description: ''
    });

    // Очищаем поля в DOM
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    const descriptionTextarea = document.querySelector('textarea') as HTMLTextAreaElement;

    if (titleInput) {
      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (descriptionTextarea) {
      descriptionTextarea.value = '';
      descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('autoria.basicInfoTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('autoria.basicInfoDesc')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('basicInfo.formTab')}
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            {t('basicInfo.demoTab')}
          </TabsTrigger>
        </TabsList>

        {/* Form Tab */}
        <TabsContent value="form" className="space-y-6 mt-6">
          {/* Информационная панель */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-blue-900">💡 {t('autoria.adTips', 'Ad Tips')}</h4>
              <Button
                type="button"
                onClick={fillSampleData}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {t('basicInfo.fillSample', 'Fill sample')}
              </Button>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {t('autoria.tip1')}</li>
              <li>• {t('autoria.tip2')}</li>
              <li>• {t('autoria.tip3')}</li>
              <li>• {t('autoria.tip4')}</li>
            </ul>
          </div>

          {/* Форма с AI генерацией */}
          <div className="space-y-6">
            {/* Заголовок с кнопками генерации и очистки */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {t('title')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100 disabled:opacity-50"
                    onClick={() => generateTitle()}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-1 border-2 border-purple-600 border-t-transparent rounded-full" />
                        {t('common.generating', 'Generating...')}
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-1" />
                        🪄 {t('basicInfo.aiTitleButton', 'AI Title')}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700 hover:from-red-100 hover:to-pink-100"
                    onClick={resetFields}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('common.clear', 'Clear')}
                  </Button>
                </div>
              </div>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                placeholder={t('enterTitle')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">{t('titleDescription')}</p>
            </div>

            {/* Описание с кнопкой генерации */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {t('description')} <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100 disabled:opacity-50"
                  onClick={() => generateDescription()}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-1 border-2 border-green-600 border-t-transparent rounded-full" />
                      {t('common.generating', 'Generating...')}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1" />
                      🤖 {t('basicInfo.aiDescriptionButton', 'AI Description')}
                    </>
                  )}
                </Button>
              </div>
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                placeholder={t('enterDescription')}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              />
              <p className="text-xs text-gray-500">{t('descriptionDescription')}</p>
            </div>

            {/* Кнопка продолжить */}
            <Button
              type="button"
              onClick={() => handleSubmit({ title: data.title || '', description: data.description || '' })}
              className="w-full"
            >
              {t('autoria.continue')}
            </Button>
          </div>

          {/* Предупреждения о модерации */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 mb-2">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  {t('validation.autoModeration')}
                </h4>
                <div className="text-sm text-yellow-800 space-y-2">
                  <p>{t('validation.yourAdWillBeChecked')}</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>{t('validation.checkProfanity')}</li>
                    <li>{t('validation.checkSuspiciousContent')}</li>
                    <li>{t('validation.checkPlatformCompliance')}</li>
                  </ul>
                  <p className="font-medium">
                    {t('validation.attemptsLeft')}
                  </p>
                </div>
              </div>
              <div className="ml-4">
                <Button
                  onClick={validateCurrentContent}
                  disabled={isValidating || !data.title || !data.description}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-yellow-50"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                      {t('validating')}...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-2" />
                      {t('validation.checkNow')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Показать ошибки если есть */}
          {errors && errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">❌ {t('autoria.validationErrors')}</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Счетчик символов */}
          <div className="flex justify-between text-sm text-slate-600">
            <div>
              {t('autoria.titleCounter')}: {data.title?.length || 0}/100 {t('autoria.characters')}
            </div>
            <div>
              {t('autoria.descriptionCounter')}: {data.description?.length || 0}/2000 {t('autoria.characters')}
            </div>
          </div>
        </TabsContent>

        {/* Demo Tab */}
        <TabsContent value="demo" className="mt-6">
          <ValidationDemo />
        </TabsContent>
      </Tabs>

      {/* Validation Modal */}
      {validationResult && (
        <ContentValidationModalStub
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          formData={{
            title: data.title || '',
            description: data.description || ''
          }}
          validationResult={validationResult}
          onRetry={() => {
            setIsValidationModalOpen(false);
            // Можно добавить логику для исправления
          }}
          onAccept={() => {
            setIsValidationModalOpen(false);
            // Можно добавить логику для принятия и продолжения
          }}
          t={t}
        />
      )}
    </div>
  );
};

export default BasicInfoForm;
