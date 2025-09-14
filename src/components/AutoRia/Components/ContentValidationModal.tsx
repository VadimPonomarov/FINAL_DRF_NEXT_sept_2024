"use client";

import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  if (!isOpen) return null;

  // Функция для замены неподходящего контента звездочками
  const censorContent = (text: string, inappropriateWords: string[] = []): string => {
    if (!inappropriateWords.length) return text;
    
    let censoredText = text;
    inappropriateWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const replacement = '*'.repeat(word.length);
      censoredText = censoredText.replace(regex, replacement);
    });
    
    return censoredText;
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
        return 'Контент одобрен';
      case 'rejected':
        return 'Контент отклонен';
      case 'needs_review':
        return 'Требует проверки';
      default:
        return 'Неизвестный статус';
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
                Результат валидации контента
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
                <h3 className="font-medium text-gray-900">Статус валидации</h3>
                {validationResult.confidence && (
                  <Badge variant="outline">
                    Уверенность: {Math.round(validationResult.confidence * 100)}%
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
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Нарушения:</h4>
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
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Неподходящие слова:</h4>
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
                <h3 className="text-lg font-medium text-gray-900">Исходный контент</h3>
                
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Заголовок</label>
                  <div className="p-3 bg-gray-50 border rounded-md">
                    <p className="text-sm text-gray-900">{formData.title}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Описание</label>
                  <div className="p-3 bg-gray-50 border rounded-md max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Censored Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Отцензурированный контент</h3>
                
                {/* Censored Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Заголовок</label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-gray-900">
                      {censorContent(formData.title, validationResult.inappropriate_words)}
                    </p>
                  </div>
                </div>

                {/* Censored Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Описание</label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {censorContent(formData.description, validationResult.inappropriate_words)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {validationResult.suggestions && validationResult.suggestions.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Рекомендации:</h4>
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
            Закрыть
          </Button>
          {validationResult.status === 'rejected' && onRetry && (
            <Button onClick={onRetry}>
              Исправить и повторить
            </Button>
          )}
          {validationResult.status === 'approved' && onAccept && (
            <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700">
              Принять и продолжить
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentValidationModal;
