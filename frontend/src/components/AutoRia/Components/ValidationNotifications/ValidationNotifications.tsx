"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  MessageSquare,
  Lightbulb
} from 'lucide-react';

// Типы для валидационных ошибок от backend
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'needs_review' | 'pending';
  reason?: string;
  violations?: string[];
  suggestions?: string[];
  attempts?: number;
  max_attempts?: number;
  inappropriate_words?: string[];
  censored_content?: {
    title?: string;
    description?: string;
  };
}

export interface LLMValidationResult {
  is_valid: boolean;
  errors: Record<string, string[]>;
  corrections: Record<string, string>;
  moderation?: ModerationResult;
}

export interface ValidationNotificationsProps {
  validationResult?: LLMValidationResult;
  fieldErrors?: Record<string, string[]>;
  generalErrors?: string[];
  onRetry?: () => void;
  onApplySuggestions?: (corrections: Record<string, string>) => void;
  isLoading?: boolean;
}

const ValidationNotifications: React.FC<ValidationNotificationsProps> = ({
  validationResult,
  fieldErrors = {},
  generalErrors = [],
  onRetry,
  onApplySuggestions,
  isLoading = false
}) => {
  const { t } = useI18n();

  // Функция для создания JSX с выделением проблемных участков
  const renderCensoredContent = (text: string, inappropriateWords: string[] = []): JSX.Element => {
    if (!inappropriateWords.length) {
      return <span>{text}</span>;
    }

    let parts: JSX.Element[] = [];
    let lastIndex = 0;
    let partKey = 0;

    inappropriateWords.forEach(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b|${escapedWord}`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Добавляем текст до совпадения
        if (match.index > lastIndex) {
          parts.push(
            <span key={partKey++}>
              {text.substring(lastIndex, match.index)}
            </span>
          );
        }

        // Добавляем замаскированное слово с выделением
        parts.push(
          <span
            key={partKey++}
            className="bg-red-200 text-red-800 px-1 rounded font-mono text-xs"
            title={`Проблемное слово: ${match[0]}`}
          >
            {'*'.repeat(match[0].length)}
          </span>
        );

        lastIndex = match.index + match[0].length;
      }
    });

    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      parts.push(
        <span key={partKey++}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  // Объединяем все ошибки
  const allErrors = {
    ...fieldErrors,
    ...(validationResult?.errors || {})
  };

  const hasErrors = Object.keys(allErrors).length > 0 || generalErrors.length > 0;
  const moderation = validationResult?.moderation;

  if (!hasErrors && !moderation) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Общие ошибки */}
      {generalErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{t('autoria.fixFollowingErrors')}</p>
              <ul className="list-disc list-inside space-y-1">
                {generalErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ошибки валидации полей */}
      {Object.keys(allErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{t('autoria.formFieldErrors')}</p>
              <div className="space-y-2">
                {Object.entries(allErrors).map(([field, errors]) => (
                  <div key={field} className="bg-red-50 p-3 rounded-md">
                    <p className="font-medium text-red-800 capitalize">{field}:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Результат модерации */}
      {moderation && (
        <div className="space-y-3">
          {/* Статус модерации */}
          {moderation.status === 'approved' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('autoria.adApproved')}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {t('autoria.approved')}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {moderation.status === 'rejected' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('autoria.adRejected')}</span>
                    <Badge variant="destructive">
                      {t('autoria.rejected')} ({moderation.attempts}/{moderation.max_attempts})
                    </Badge>
                  </div>
                  
                  {moderation.reason && (
                    <p className="text-sm">{moderation.reason}</p>
                  )}

                  {/* Отображение проблемных участков текста */}
                  {moderation.inappropriate_words && moderation.inappropriate_words.length > 0 && moderation.censored_content && (
                    <div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="font-medium text-sm text-red-800 mb-2">
                        🚫 Проблемные участки текста (выделены красным):
                      </p>

                      {moderation.censored_content.title && (
                        <div>
                          <p className="text-xs font-medium text-red-700 mb-1">Заголовок:</p>
                          <p className="text-sm">
                            {renderCensoredContent(moderation.censored_content.title, moderation.inappropriate_words)}
                          </p>
                        </div>
                      )}

                      {moderation.censored_content.description && (
                        <div>
                          <p className="text-xs font-medium text-red-700 mb-1">Описание:</p>
                          <p className="text-sm whitespace-pre-wrap">
                            {renderCensoredContent(moderation.censored_content.description, moderation.inappropriate_words)}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-red-600 italic">
                        Замените выделенные слова на подходящие для публикации
                      </p>
                    </div>
                  )}

                  {moderation.violations && moderation.violations.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">{t('autoria.violations')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {moderation.violations.map((violation, index) => (
                          <li key={index} className="text-sm">{violation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {onRetry && (
                    <Button 
                      onClick={onRetry} 
                      disabled={isLoading}
                      size="sm"
                      className="mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('autoria.retry')}...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t('autoria.retry')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {moderation.status === 'needs_review' && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('autoria.needsManualReview')}</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {t('autoria.underReview')}
                  </Badge>
                </div>
                <p className="text-sm mt-2">
                  {t('autoria.manualReviewDesc')}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {moderation.status === 'pending' && (
            <Alert className="border-blue-200 bg-blue-50">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('autoria.moderationInProgress')}</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {t('autoria.beingChecked')}
                  </Badge>
                </div>
                <p className="text-sm mt-2">
                  {t('autoria.autoModerationDesc')}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Предложения по исправлению */}
      {validationResult?.corrections && Object.keys(validationResult.corrections).length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <p className="font-medium">{t('autoria.recommendations')}</p>
              <div className="space-y-2">
                {Object.entries(validationResult.corrections).map(([field, suggestion]) => (
                  <div key={field} className="bg-blue-100 p-3 rounded-md">
                    <p className="font-medium capitalize">{field}:</p>
                    <p className="text-sm mt-1">{suggestion}</p>
                  </div>
                ))}
              </div>
              
              {onApplySuggestions && (
                <Button 
                  onClick={() => onApplySuggestions(validationResult.corrections)}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {t('autoria.applySuggestions')}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Предложения модерации */}
      {moderation?.suggestions && moderation.suggestions.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">{t('autoria.recommendations')}</p>
              <ul className="list-disc list-inside space-y-1">
                {moderation.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm">{suggestion}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ValidationNotifications;
