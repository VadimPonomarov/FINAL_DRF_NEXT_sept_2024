"use client";

import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/contexts/I18nContext';

interface ValidationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  reason?: string;
  violations?: string[];
  censored_content?: {
    title?: string;
    description?: string;
  };
  inappropriate_words?: string[];
  suggestions?: string[];
  confidence?: number;
}

interface FormData {
  title: string;
  description: string;
  [key: string]: any;
}

interface ContentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormData;
  validationResult: ValidationResult;
  onRetry?: () => void;
  onAccept?: () => void;
}

const ContentValidationModal: React.FC<ContentValidationModalProps> = ({
  isOpen,
  onClose,
  formData,
  validationResult,
  onRetry,
  onAccept
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  // Функция для замены неподходящего контента звездочками с контекстом
  const censorContent = (text: string, inappropriateWords: string[] = []): string => {
    if (!inappropriateWords.length) return text;

    let censoredText = text;
    inappropriateWords.forEach(word => {
      // Экранируем специальные символы для регулярного выражения
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Создаем регулярное выражение для поиска слова с учетом границ
      const regex = new RegExp(`\\b${escapedWord}\\b|${escapedWord}`, 'gi');

      // Заменяем найденные слова на звездочки
      censoredText = censoredText.replace(regex, (match) => {
        return '*'.repeat(match.length);
      });
    });

    return censoredText;
  };

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
            className="bg-red-200 text-red-800 px-1 rounded font-mono"
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

  const getStatusIcon = () => {
    switch (validationResult.status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'needs_review':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (validationResult.status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'needs_review':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (validationResult.status) {
      case 'approved':
        return t('validationDemo.status.approved');
      case 'rejected':
        return t('contentValidationModal.contentRejected');
      case 'needs_review':
        return t('validationDemo.status.needsReview');
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('contentValidationModal.title')}
              </h2>
              <p className="text-sm text-gray-600">
                {getStatusText()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Status Summary */}
            <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{t('contentValidationModal.statusValidation')}</h3>
                {validationResult.confidence && (
                  <Badge variant="outline">
                    {t('contentValidationModal.confidence')}: {Math.round(validationResult.confidence * 100)}%
                  </Badge>
                )}
              </div>
              {validationResult.reason && (
                <p className="text-sm text-gray-700 mb-3">
                  {validationResult.reason}
                </p>
              )}
              
              {/* Violations */}
              {validationResult.violations && validationResult.violations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('contentValidationModal.violations')}:</h4>
                  <div className="flex flex-wrap gap-1">
                    {validationResult.violations.map((violation, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {violation}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Inappropriate Words */}
              {validationResult.inappropriate_words && validationResult.inappropriate_words.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('contentValidationModal.inappropriateWords')}:</h4>
                  <div className="flex flex-wrap gap-1">
                    {validationResult.inappropriate_words.map((word, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Original vs Censored Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('contentValidationModal.originalContent')}</h3>
                
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('title')}</label>
                  <div className="p-3 bg-gray-50 border rounded-md">
                    <p className="text-sm text-gray-900">{formData.title}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('description')}</label>
                  <div className="p-3 bg-gray-50 border rounded-md max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Censored Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('contentValidationModal.censoredContent')}</h3>
                
                {/* Censored Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('title')}
                    <span className="text-red-600 text-xs ml-1">(проблемные участки выделены)</span>
                  </label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-gray-900">
                      {renderCensoredContent(formData.title, validationResult.inappropriate_words)}
                    </p>
                  </div>
                </div>

                {/* Censored Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('description')}
                    <span className="text-red-600 text-xs ml-1">(проблемные участки выделены)</span>
                  </label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {renderCensoredContent(formData.description, validationResult.inappropriate_words)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {validationResult.suggestions && validationResult.suggestions.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 {t('contentValidationModal.suggestions')}:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {validationResult.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            {t('contentValidationModal.close')}
          </Button>
          {validationResult.status === 'rejected' && onRetry && (
            <Button onClick={onRetry}>
              {t('contentValidationModal.fixAndRetry')}
            </Button>
          )}
          {validationResult.status === 'approved' && onAccept && (
            <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700">
              {t('contentValidationModal.acceptAndContinue')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentValidationModal;
