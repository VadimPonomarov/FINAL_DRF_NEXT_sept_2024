"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, RotateCcw, Edit3 } from 'lucide-react';
import ContentValidationModal from './ContentValidationModal';
import { useI18n } from '@/contexts/I18nContext';

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  formData: {
    title: string;
    description: string;
  };
  expectedResult: {
    status: 'approved' | 'rejected' | 'needs_review';
    reason: string;
    violations?: string[];
    inappropriate_words?: string[];
    suggestions?: string[];
    confidence: number;
  };
}

const ValidationDemo: React.FC = () => {
  const { t } = useI18n();
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Демонстрационные сценарии
  const demoScenarios: DemoScenario[] = [
    {
      id: 'profanity-russian',
      name: t('validationDemo.scenarios.profanityRussian.title'),
      description: t('validationDemo.scenarios.profanityRussian.description'),
      formData: {
        title: 'Продам блять хорошую машину',
        description: 'Хуевая машина, но дешево продаю. Сука, надоела уже. Пиздец как срочно нужны деньги.'
      },
      expectedResult: {
        status: 'rejected',
        reason: 'Обнаружена нецензурная лексика в тексте объявления',
        violations: ['profanity', 'inappropriate_language'],
        inappropriate_words: ['блять', 'хуевая', 'сука', 'пиздец'],
        suggestions: [
          'Удалите нецензурную лексику из заголовка и описания',
          'Используйте вежливые формулировки',
          'Опишите преимущества автомобиля'
        ],
        confidence: 0.95
      }
    },
    {
      id: 'profanity-transliteration',
      name: t('validationDemo.scenarios.profanityTranslit.title'),
      description: t('validationDemo.scenarios.profanityTranslit.description'),
      formData: {
        title: 'Prodaju blyad mashinu',
        description: 'Pizdataya mashina, no nado prodavat. Hui znaet pochemu tak dorogie stali. Suka, vse dorogo.'
      },
      expectedResult: {
        status: 'rejected',
        reason: 'Обнаружена замаскированная нецензурная лексика',
        violations: ['profanity', 'evasion'],
        inappropriate_words: ['blyad', 'pizdataya', 'hui', 'suka'],
        suggestions: [
          'Не используйте транслитерацию для обхода фильтров',
          'Пишите на одном языке',
          'Используйте корректные формулировки'
        ],
        confidence: 0.88
      }
    },
    {
      id: 'off-topic',
      name: t('validationDemo.scenarios.nonAutomotive.title'),
      description: t('validationDemo.scenarios.nonAutomotive.description'),
      formData: {
        title: 'Продаю квартиру в центре города',
        description: 'Отличная квартира, 3 комнаты, евроремонт. Рядом школа и детский сад. Цена договорная.'
      },
      expectedResult: {
        status: 'rejected',
        reason: 'Контент не относится к продаже автомобилей',
        violations: ['off_topic', 'wrong_category'],
        inappropriate_words: [],
        suggestions: [
          'Используйте платформу для размещения автомобильных объявлений',
          'Опишите характеристики автомобиля',
          'Укажите марку, модель и год выпуска'
        ],
        confidence: 0.92
      }
    },
    {
      id: 'spam-content',
      name: t('validationDemo.scenarios.spamAdvertising.title'),
      description: t('validationDemo.scenarios.spamAdvertising.description'),
      formData: {
        title: 'СУПЕР СКИДКИ!!! ЗВОНИТЕ СЕЙЧАС!!!',
        description: 'ТОЛЬКО СЕГОДНЯ!!! СКИДКА 90%!!! ЗВОНИТЕ ПРЯМО СЕЙЧАС!!! +380123456789 ЛУЧШИЕ ЦЕНЫ В ГОРОДЕ!!! НЕ УПУСТИТЕ ШАНС!!!'
      },
      expectedResult: {
        status: 'rejected',
        reason: 'Обнаружены признаки спама и агрессивной рекламы',
        violations: ['spam', 'excessive_caps', 'aggressive_marketing'],
        inappropriate_words: [],
        suggestions: [
          'Уберите чрезмерное использование заглавных букв',
          'Удалите агрессивные рекламные призывы',
          'Опишите автомобиль в спокойном тоне'
        ],
        confidence: 0.89
      }
    },
    {
      id: 'good-content',
      name: t('validationDemo.scenarios.correctAd.title'),
      description: t('validationDemo.scenarios.correctAd.description'),
      formData: {
        title: 'Toyota Camry 2018, отличное состояние',
        description: 'Продаю Toyota Camry 2018 года выпуска. Пробег 45000 км. Двигатель 2.5л, автомат. Один владелец, регулярное ТО. Небольшие царапины на бампере. Цена 18000$, торг уместен.'
      },
      expectedResult: {
        status: 'approved',
        reason: 'Контент соответствует всем требованиям',
        violations: [],
        inappropriate_words: [],
        suggestions: [
          'Отличное объявление!',
          'Добавьте больше фотографий для привлечения покупателей'
        ],
        confidence: 0.98
      }
    }
  ];

  const startEditing = (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setEditableTitle(scenario.formData.title);
    setEditableDescription(scenario.formData.description);
    setIsEditing(true);
  };

  const runValidation = async (title?: string, description?: string) => {
    if (!selectedScenario) return;

    setIsLoading(true);

    const validationData = {
      title: title || selectedScenario.formData.title,
      description: description || selectedScenario.formData.description,
    };

    try {
      console.log('Sending validation request:', validationData);
      const response = await fetch('/api/autoria/moderation/check-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Validation result:', result);

      setCurrentResult({
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
      setIsModalOpen(true);
    } catch (error) {
      console.error('Validation error:', error);
      // Fallback to expected result if API fails
      setCurrentResult(selectedScenario.expectedResult);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
    setSelectedScenario(null);
    setEditableTitle('');
    setEditableDescription('');
  };

  const handleRunEditedValidation = () => {
    runValidation(editableTitle, editableDescription);
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedScenario(null);
    setCurrentResult(null);
    setEditableTitle('');
    setEditableDescription('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">{t('validationDemo.status.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">{t('validationDemo.status.rejected')}</Badge>;
      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('validationDemo.status.needsReview')}</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('validationDemo.title')}
        </h2>
        <p className="text-gray-600">
          {t('validationDemo.subtitle')}
        </p>
      </div>

      {/* Demo Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoScenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {scenario.name}
                </CardTitle>
                {getStatusBadge(scenario.expectedResult.status)}
              </div>
              <p className="text-xs text-gray-600">
                {scenario.description}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">{t('title')}:</div>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded truncate">
                    {scenario.formData.title}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">{t('description')}:</div>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded h-16 overflow-hidden">
                    {scenario.formData.description.substring(0, 100)}...
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setSelectedScenario(scenario);
                      runValidation();
                    }}
                    className="w-full"
                    size="sm"
                    disabled={isLoading}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {isLoading ? `${t('validating')}...` : t('validationDemo.buttons.quickValidation')}
                  </Button>

                  <Button
                    onClick={() => startEditing(scenario)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('validationDemo.buttons.editAndValidate')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Editor */}
      {isEditing && selectedScenario && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              {t('interactiveEditor.title')}: {selectedScenario.name}
            </h3>
            <Button
              onClick={handleCloseEditor}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800"
            >
              ✕ {t('interactiveEditor.close')}
            </Button>
          </div>

          <div className="space-y-4">
            {/* Editable Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-800">
                {t('interactiveEditor.adTitle')}:
              </label>
              <textarea
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder={t('interactiveEditor.titlePlaceholder')}
              />
            </div>

            {/* Editable Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-800">
                {t('interactiveEditor.adDescription')}:
              </label>
              <textarea
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                placeholder={t('interactiveEditor.descriptionPlaceholder')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleRunEditedValidation}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !editableTitle.trim() || !editableDescription.trim()}
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? `${t('interactiveEditor.validating')}...` : t('interactiveEditor.runValidation')}
              </Button>

              <Button
                onClick={() => {
                  setEditableTitle(selectedScenario.formData.title);
                  setEditableDescription(selectedScenario.formData.description);
                }}
                variant="outline"
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('interactiveEditor.resetToOriginal')}
              </Button>
            </div>

            {/* Character counters */}
            <div className="flex gap-4 text-xs text-blue-600">
              <span>{t('interactiveEditor.titleCharacters').replace('{count}', editableTitle.length.toString())}</span>
              <span>{t('interactiveEditor.descriptionCharacters').replace('{count}', editableDescription.length.toString())}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedScenario && currentResult && (
        <ContentValidationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          formData={{
            title: editableTitle || selectedScenario.formData.title,
            description: editableDescription || selectedScenario.formData.description
          }}
          validationResult={currentResult}
          onRetry={handleCloseModal}
          onAccept={handleCloseModal}
        />
      )}
    </div>
  );
};

export default ValidationDemo;
