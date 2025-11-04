"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

interface SimpleBasicInfoFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const SimpleBasicInfoForm: React.FC<SimpleBasicInfoFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();

  // Локальное состояние для предотвращения циклов
  const [localData, setLocalData] = useState<Partial<CarAdFormData>>(data);

  // Синхронизируем локальное состояние с внешним только при изменении извне
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(localData)) {
      setLocalData(data);
    }
  }, [data]);

  // Обработчик изменения поля
  const handleFieldChange = useCallback((fieldName: keyof CarAdFormData, value: any) => {
    const newData = { ...localData, [fieldName]: value };
    setLocalData(newData);
    
    // Уведомляем родительский компонент с задержкой
    setTimeout(() => {
      onChange(newData);
    }, 0);
  }, [localData, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localData);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          {t('autoria.basicInfoDescription')}
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            {t('title')} <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            value={localData.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder={t('enterTitle')}
            maxLength={100}
          />
          <p className="text-sm text-gray-600">
            {t('titleDescription')}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            {t('description')} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={localData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder={t('enterDescription')}
            rows={6}
            maxLength={2000}
          />
          <p className="text-sm text-gray-600">
            {t('descriptionDescription')}
          </p>
        </div>

        {/* Показать ошибки если есть */}
        {errors && errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">❌ Ошибки валидации:</h4>
            <ul className="text-sm text-red-800 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" className="w-full">
          {t('autoria.continue')}
        </Button>
      </form>
    </div>
  );
};

export default SimpleBasicInfoForm;
