"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, RotateCcw } from 'lucide-react';
import ContentValidationModal from './ContentValidationModal';

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
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Демонстрационные сценарии
  const demoScenarios: DemoScenario[] = [
    {
      id: 'profanity-russian',
      name: 'Нецензурная лексика (русский)',
      description: 'Тест обнаружения мата на русском языке',
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
      name: 'Мат в транслитерации',
      description: 'Тест обнаружения замаскированного мата',
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
      name: 'Не автомобильная тематика',
      description: 'Тест обнаружения контента не связанного с продажей авто',
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
      name: 'Спам и реклама',
      description: 'Тест обнаружения спама и рекламного контента',
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
      name: 'Корректное объявление',
      description: 'Пример хорошего объявления без нарушений',
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
    },
    {
      id: 'mixed-issues',
      name: 'Смешанные проблемы',
      description: 'Объявление с несколькими типами нарушений',
      formData: {
        title: 'Срочно!!! Продаю говно-тачку дешево',
        description: 'Машина конечно херовая, но ездит. Нужны деньги блять срочно. Может кому пригодится эта хрень. Звоните, договоримся.'
      },
      expectedResult: {
        status: 'rejected',
        reason: 'Множественные нарушения: нецензурная лексика и неуважительное описание товара',
        violations: ['profanity', 'inappropriate_language', 'negative_description'],
        inappropriate_words: ['говно', 'херовая', 'блять', 'хрень'],
        suggestions: [
          'Удалите всю нецензурную лексику',
          'Опишите автомобиль в позитивном ключе',
          'Укажите конкретные характеристики',
          'Избегайте негативных характеристик'
        ],
        confidence: 0.94
      }
    }
  ];

  const runValidation = async (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setIsLoading(true);

    try {
      const response = await fetch('/api/autoria/moderation/check-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenario.formData.title,
          description: scenario.formData.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate content');
      }

      const result = await response.json();
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
      setCurrentResult(scenario.expectedResult);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedScenario(null);
    setCurrentResult(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Одобрено</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Отклонено</Badge>;
      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Требует проверки</Badge>;
      default:
        return <Badge variant="secondary">Неизвестно</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Демонстрация системы валидации контента
        </h2>
        <p className="text-gray-600">
          Выберите сценарий для тестирования различных типов контента
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
                  <div className="text-xs font-medium text-gray-700">Заголовок:</div>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded truncate">
                    {scenario.formData.title}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Описание:</div>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded h-16 overflow-hidden">
                    {scenario.formData.description.substring(0, 100)}...
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => runValidation(scenario)}
                  className="w-full"
                  size="sm"
                  disabled={isLoading}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {isLoading ? 'Проверка...' : 'Запустить валидацию'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Panel */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">
                Как работает система валидации
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Проверка на нецензурную лексику (русский, украинский, английский)</li>
                <li>• Обнаружение замаскированного мата в транслитерации</li>
                <li>• Проверка соответствия автомобильной тематике</li>
                <li>• Выявление спама и агрессивной рекламы</li>
                <li>• Анализ качества и полноты описания</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Modal */}
      {selectedScenario && currentResult && (
        <ContentValidationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          formData={selectedScenario.formData}
          validationResult={currentResult}
          onRetry={() => {
            console.log('Retry validation');
            handleCloseModal();
          }}
          onAccept={() => {
            console.log('Accept and continue');
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
};

export default ValidationDemo;
