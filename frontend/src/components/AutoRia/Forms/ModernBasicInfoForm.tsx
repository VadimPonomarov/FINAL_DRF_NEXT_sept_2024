"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Wand2, 
  RefreshCw,
  Sparkles,
  Bot,
  Lightbulb
} from 'lucide-react';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface ModernBasicInfoFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

// Примерные данные для быстрого заполнения
const SAMPLE_DATA_TEMPLATES = [
  {
    title: "BMW X5 2020 - премиум кроссовер в отличном состоянии",
    description: "Продается BMW X5 2020 года в идеальном состоянии. Один владелец, полная история обслуживания в официальном дилере. Автомобиль не участвовал в ДТП, все ТО пройдены вовремя. Комплектация: кожаный салон, панорамная крыша, система навигации, камеры кругового обзора, адаптивный круиз-контроль. Двигатель 3.0 л, 340 л.с., полный привод xDrive. Пробег 45 000 км. Цена договорная. Торг уместен."
  },
  {
    title: "Mercedes-Benz E-Class 2019 - бизнес седан премиум класса",
    description: "Продается Mercedes-Benz E-Class 2019 года. Автомобиль в отличном техническом состоянии, регулярное обслуживание у официального дилера. Комплектация Avantgarde: кожаный салон, климат-контроль, мультимедийная система MBUX, светодиодные фары, парктроник, камера заднего вида. Двигатель 2.0 л турбо, 245 л.с., задний привод. Пробег 62 000 км. Все документы в порядке."
  },
  {
    title: "Toyota Camry 2021 - надежный семейный седан",
    description: "Продается Toyota Camry 2021 года. Автомобиль практически новый, пробег всего 25 000 км. Полная комплектация: кожаный салон, система безопасности Toyota Safety Sense 2.0, беспроводная зарядка для телефона, подогрев сидений, климат-контроль. Гибридная силовая установка 2.5 л + электромотор, общая мощность 218 л.с. Очень экономичный расход топлива."
  }
];

const ModernBasicInfoForm: React.FC<ModernBasicInfoFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const toast = (opts: any) => console.log('[toast]', opts);
  const [activeTab, setActiveTab] = useState('form');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Функция для заполнения примерными данными
  const fillSampleData = () => {
    const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
    
    onChange({
      ...data,
      title: randomTemplate.title,
      description: randomTemplate.description
    });
  };

  // Функция проверки обязательных полей для генерации
  const validateRequiredFieldsForGeneration = () => {
    const requiredFields = [
      { key: 'brand', name: 'Марка автомобіля' },
      { key: 'model', name: 'Модель автомобіля' },
      { key: 'year', name: 'Рік випуску' },
      { key: 'price', name: 'Ціна' }
    ];

    const missingFields: string[] = [];
    const formDataAny = data as any;

    requiredFields.forEach(field => {
      if (!formDataAny[field.key] || formDataAny[field.key] === '') {
        missingFields.push(field.name);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // Функция генерации заголовка с помощью AI
  const generateTitle = async () => {
    const validation = validateRequiredFieldsForGeneration();
    if (!validation.isValid) {
      toast({ 
        title: '⚠️ ' + t('common.warning'), 
        description: `${t('ai.requiredFieldsTitle')}\n\n${validation.missingFields.join('\n')}\n\n${t('ai.pleaseGoToTabs')}`,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
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
        onChange({ ...data, title: result.title });
      } else {
        // Fallback к шаблону
        const fallbackTitle = `${carData.brand} ${carData.model} ${carData.year} - відмінний стан`;
        onChange({ ...data, title: fallbackTitle });
      }
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback к случайному шаблону
      const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
      onChange({ ...data, title: randomTemplate.title });
    } finally {
      setIsGenerating(false);
    }
  };

  // Функция генерации описания с помощью AI
  const generateDescription = async () => {
    const validation = validateRequiredFieldsForGeneration();
    if (!validation.isValid) {
      toast({ 
        title: '⚠️ ' + t('common.warning'), 
        description: `${t('ai.requiredFieldsDescription')}\n\n${validation.missingFields.join('\n')}\n\n${t('ai.pleaseGoToTabs')}`,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
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
        onChange({ ...data, description: result.description });
      } else {
        // Fallback к шаблону
        const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
        onChange({ ...data, description: randomTemplate.description });
      }
    } catch (error) {
      console.error('Error generating description:', error);
      // Fallback к случайному шаблону
      const randomTemplate = SAMPLE_DATA_TEMPLATES[Math.floor(Math.random() * SAMPLE_DATA_TEMPLATES.length)];
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
  };

  // Функция валидации контента
  const validateCurrentContent = async () => {
    if (!data.title || !data.description) {
      toast({ title: '⚠️ ' + t('common.warning'), description: t('basicInfo.fillTitleDescription'), variant: 'destructive' });
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

      // Создаем детальное сообщение
      let message = `Результат перевірки: ${result.result === 'approved' ? '✅ Схвалено' : '❌ Відхилено'}\n`;
      if (result.reason) {
        message += `\nПричина: ${result.reason}`;
      }

      if (result.inappropriate_words && result.inappropriate_words.length > 0) {
        message += `\n\n🚫 Знайдені проблемні слова: ${result.inappropriate_words.join(', ')}`;
        message += `\n\n📝 Відцензурований текст:`;
        if (result.censored_title !== data.title) {
          message += `\nЗаголовок: ${result.censored_title}`;
        }
        if (result.censored_description !== data.description) {
          message += `\nОпис: ${result.censored_description}`;
        }
        message += `\n\n💡 Замініть виділені слова на підходящі для публікації`;
      }

      if (result.suggestions && result.suggestions.length > 0) {
        message += `\n\nРекомендації:\n${result.suggestions.map((s: any) => `• ${s}`).join('\n')}`;
      }

      toast({ title: '✅ ' + t('common.success'), description: message });
    } catch (error) {
      console.error('Validation error:', error);
      toast({ title: '❌ ' + t('common.error'), description: t('basicInfo.validationError'), variant: 'destructive' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('basicInfo.formTab', 'Form')}
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            {t('basicInfo.toolsTab', 'Tools')}
          </TabsTrigger>
        </TabsList>

        {/* Form Tab */}
        <TabsContent value="form" className="space-y-6 mt-6">
          {/* Информационная панель */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    <Lightbulb className="h-4 w-4 inline mr-2" />
                    💡 {t('autoria.adTips', 'Ad Tips')}
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {t('autoria.tip1', 'Use a clear and informative title')}</li>
                    <li>• {t('autoria.tip2', 'List all important car features')}</li>
                    <li>• {t('autoria.tip3', "Describe the car's condition honestly and in detail")}</li>
                    <li>• {t('autoria.tip4', 'Add information about service history')}</li>
                  </ul>
                </div>
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
            </CardContent>
          </Card>

          {/* Форма с AI генерацией */}
          <div className="space-y-6">
            {/* Заголовок с кнопками генерации */}
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
                    onClick={generateTitle}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-1 border-2 border-purple-600 border-t-transparent rounded-full" />
                        {t('common.generating', 'Generating...')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
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
                placeholder={!data.title ? '🚨 ОБЯЗАТЕЛЬНОЕ ПОЛЕ - ЗАГОЛОВОК ОТСУТСТВУЕТ!' : t('enterTitle')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !data.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                maxLength={100}
              />
              {!data.title && (
                <p className="text-xs text-red-600 font-medium">
                  🚨 КРИТИЧЕСКАЯ ОШИБКА: Заголовок объявления отсутствует в БД!
                </p>
              )}
              <p className="text-xs text-gray-500">
                {t('basicInfo.titleLimit', { count: data.title?.length || 0 })}
              </p>
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
                  onClick={generateDescription}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-1 border-2 border-green-600 border-t-transparent rounded-full" />
                      {t('common.generating', 'Generating...')}
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-1" />
                      🤖 AI Опис
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
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">
                {t('basicInfo.descriptionLimit', { count: data.description?.length || 0 })}
              </p>
            </div>
          </div>

          {/* Предупреждения о модерации */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {t('basicInfo.moderationTitle', 'Automatic moderation')}
                  </h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <p>{t('basicInfo.moderationIntro', 'Your ad will be automatically checked for:')}</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>{t('basicInfo.moderationCheck1', 'Inappropriate language')}</li>
                      <li>{t('basicInfo.moderationCheck2', 'Suspicious content')}</li>
                      <li>{t('basicInfo.moderationCheck3', 'Compliance with platform rules')}</li>
                    </ul>
                  </div>
                </div>
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
                      {t('basicInfo.validating', 'Validating...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-2" />
                      {t('validation.checkNow', 'Check now')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Показать ошибки если есть */}
          {errors && errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">{t('autoria.validationErrors', 'Validation errors')}:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                {t('basicInfo.toolsTitle', 'Tools for content creation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={fillSampleData}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="font-medium">{t('basicInfo.samples', 'Sample ads')}</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">
                    {t('basicInfo.samplesDesc', 'Fill the form with a high-quality sample ad')}
                  </p>
                </Button>

                <Button
                  onClick={generateTitle}
                  disabled={isGenerating}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">{t('basicInfo.aiTitleButton', 'AI Title')}</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">
                    {t('basicInfo.aiTitleDesc', 'Generate a title based on car characteristics')}
                  </p>
                </Button>

                <Button
                  onClick={generateDescription}
                  disabled={isGenerating}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="font-medium">{t('basicInfo.aiDescriptionButton', 'AI Description')}</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">
                    {t('basicInfo.aiDescriptionDesc', 'Create a detailed description of the car')}
                  </p>
                </Button>

                <Button
                  onClick={validateCurrentContent}
                  disabled={isValidating || !data.title || !data.description}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">{t('basicInfo.contentCheck', 'Content check')}</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">
                    {t('basicInfo.contentCheckDesc', 'Check the text for compliance with the rules')}
                  </p>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernBasicInfoForm;
