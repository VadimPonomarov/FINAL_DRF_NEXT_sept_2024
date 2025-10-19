"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler, FieldValues, Path } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import Joi from 'joi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FormFieldsConfig, SelectOption } from '@/common/interfaces/forms.interfaces';
import {
  formContainerClasses,
  formClasses,
  formGroupClasses,
  labelClasses,
  inputClasses,
  errorMessageClasses,
  buttonClasses,
  fieldDescriptionClasses,
  cn
} from '../sharedFormStyles';

// Расширенные типы для поддержки различных типов полей
export interface ExtendedFormFieldConfig<T extends FieldValues> extends FormFieldsConfig<T> {
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'virtual-select' | 'checkbox' | 'file' | 'date';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean; // для select и file
  accept?: string; // для file
  min?: number | string; // для number и date
  max?: number | string; // для number и date
  rows?: number; // для textarea
  // Для virtual-select
  fetchOptions?: (search: string, page: number, pageSize: number) => Promise<{
    options: Array<{ value: string; label: string }>;
    hasMore: boolean;
    total: number;
  }>;
  pageSize?: number;
  initialLabel?: string; // Начальное название для отображения
}

export interface GenericFormProps<T extends FieldValues> {
  schema: Joi.ObjectSchema<T>;
  fields: ExtendedFormFieldConfig<T>[];
  defaultValues?: Partial<T>;
  onSubmit: SubmitHandler<T>;
  onChange?: (data: Partial<T>) => void;
  isLoading?: boolean;
  submitText?: string;
  title?: string;
  description?: string;
  className?: string;
  resetOnSubmit?: boolean;
  showCard?: boolean;
  successMessage?: string;
  errorMessage?: string;
  sections?: Array<{
    title: string;
    description?: string;
    fields: string[];
  }>;
}

export function GenericForm<T extends FieldValues>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  onChange,
  isLoading = false,
  submitText = 'Submit',
  title,
  description,
  className,
  resetOnSubmit = false,
  showCard = true,
  successMessage,
  errorMessage,
  sections
}: GenericFormProps<T>) {
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<T>({
    resolver: joiResolver(schema),
    defaultValues: defaultValues as any
  });

  // Обновляем значения формы при изменении defaultValues
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      console.log('[GenericForm] Updating form values:', defaultValues);
      console.log('[GenericForm] Current form values:', watch());

      // Сравниваем текущие значения с новыми
      const currentValues = watch();
      const hasChanges = Object.keys(defaultValues).some(key => {
        const newValue = defaultValues[key];
        const currentValue = currentValues[key];
        return newValue !== currentValue;
      });

      if (hasChanges) {
        console.log('[GenericForm] Values changed, updating form');

        // Используем reset для полного обновления формы
        reset(defaultValues as any);

        // Дополнительно устанавливаем значения для каждого поля
        Object.entries(defaultValues).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            console.log(`[GenericForm] Setting ${key} to:`, value);
            setValue(key as Path<T>, value as any, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false
            });
          }
        });

        // Вызываем onChange если он передан
        if (onChange) {
          console.log('[GenericForm] Calling onChange after reset');
          onChange(defaultValues);
        }
      }
    }
  }, [defaultValues, setValue, reset, watch, onChange]);

  const onFormSubmit: SubmitHandler<T> = async (data) => {
    try {
      await onSubmit(data);
      if (resetOnSubmit) {
        reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: ExtendedFormFieldConfig<T>) => {
    const fieldName = field.name as Path<T>;
    const error = errors[fieldName];
    const isRequired = field.required || false;

    const baseProps = {
      id: String(fieldName),
      disabled: field.disabled || isLoading,
      className: cn(inputClasses, error && 'border-destructive')
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...register(fieldName)}
            {...baseProps}
            placeholder={field.placeholder}
            rows={field.rows || 4}
          />
        );

      case 'select':
        // Дополнительная проверка и логирование для диагностики
        console.log(`[GenericForm] Select field ${fieldName}:`, {
          hasOptions: !!field.options,
          isArray: Array.isArray(field.options),
          optionsType: typeof field.options,
          optionsValue: field.options
        });

        const filteredOptions = Array.isArray(field.options)
          ? field.options.filter(option => option && option.value && option.value !== '')
          : [];
        return (
          <SearchableSelect
            options={filteredOptions}
            value={watch(fieldName) as string}
            onValueChange={(value) => setValue(fieldName, value as any)}
            placeholder={field.placeholder || t('common.selectOption', `Select ${field.label}`)}
            disabled={field.disabled || isLoading}
            className={cn(inputClasses, error && 'border-destructive')}
            searchPlaceholder={t('common.searchPlaceholder', `Search ${field.label?.toLowerCase()}...`)}
            emptyMessage={t('common.none', `${field.label} not found`)}
            loading={field.disabled && isLoading}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={String(fieldName)}
              {...register(fieldName)}
              disabled={field.disabled || isLoading}
            />
            <Label
              htmlFor={String(fieldName)}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </Label>
          </div>
        );

      case 'file':
        return (
          <Input
            {...register(fieldName)}
            {...baseProps}
            type="file"
            accept={field.accept}
            multiple={field.multiple}
          />
        );

      case 'number':
        return (
          <Input
            {...register(fieldName, { valueAsNumber: true })}
            {...baseProps}
            type="number"
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );

      case 'date':
        return (
          <Input
            {...register(fieldName)}
            {...baseProps}
            type="date"
            min={field.min}
            max={field.max}
          />
        );

      case 'virtual-select':
        if (!field.fetchOptions) {
          console.error(`Virtual select field ${fieldName} requires fetchOptions function`);
          return null;
        }

        // Для поля моделей нужно создать динамическую fetchOptions функцию
        let dynamicFetchOptions = field.fetchOptions;
        if (String(fieldName) === 'model') {
          const currentBrand = watch('brand' as Path<T>);
          console.log(`[GenericForm] Model field - current brand:`, currentBrand);

          if (currentBrand) {
            // Создаем новую функцию с актуальным значением brand
            dynamicFetchOptions = async (search: string, page: number, pageSize: number) => {
              console.log(`[GenericForm] Fetching models for brand:`, currentBrand);
              // ИСПРАВЛЕНО: brand_id → mark_id
              const response = await fetch(`/api/public/reference/models?mark_id=${currentBrand}&page=${page}&page_size=${pageSize}&search=${search}`);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const data = await response.json();
              return {
                options: data.options || [],
                hasMore: data.hasMore || false,
                total: data.total || 0,
              };
            };
          }
        }

        // Для поля городов нужно создать динамическую fetchOptions функцию
        if (String(fieldName) === 'city') {
          const currentRegion = watch('region' as Path<T>);
          console.log(`[GenericForm] City field - current region:`, currentRegion);

          if (currentRegion) {
            // Создаем новую функцию с актуальным значением region
            dynamicFetchOptions = async (search: string, page: number, pageSize: number) => {
              console.log(`[GenericForm] Fetching cities for region:`, currentRegion);
              return field.fetchOptions!(currentRegion, search, page, pageSize);
            };
          } else {
            // Если регион не выбран, возвращаем пустой результат
            dynamicFetchOptions = async () => ({ options: [], hasMore: false, total: 0 });
          }
        }

        // Определяем ключ для перезагрузки компонента при изменении зависимостей
        let componentKey = String(fieldName);
        if (String(fieldName) === 'model') {
          componentKey = `model-${watch('brand' as Path<T>)}`;
        } else if (String(fieldName) === 'city') {
          componentKey = `city-${watch('region' as Path<T>)}`;
        }

        // Определяем initialLabel на основе текущего значения
        let initialLabel = field.initialLabel;
        const currentValue = watch(fieldName) as string;

        // Если есть значение, но нет initialLabel, используем значение как label
        if (currentValue && !initialLabel) {
          initialLabel = currentValue;
        }

        return (
          <VirtualSelect
            key={componentKey}
            value={currentValue}
            initialLabel={initialLabel}
            onValueChange={(value, label) => {
              // Для VirtualSelect сохраняем label (название), а не ID
              const valueToSet = label || value;
              setValue(fieldName, valueToSet as any);

              // Если это поле brand, очищаем model
              if (String(fieldName) === 'brand') {
                setValue('model' as Path<T>, '' as any);
              }

              // Если это поле region, очищаем city
              if (String(fieldName) === 'region') {
                setValue('city' as Path<T>, '' as any);
              }

              // Вызываем onChange если он передан с debouncing
              if (onChange) {
                const currentValues = watch();
                const updatedValues = { ...currentValues, [fieldName]: value };
                console.log(`[GenericForm] Calling onChange with:`, updatedValues);

                // Используем setTimeout для предотвращения бесконечных циклов
                setTimeout(() => {
                  onChange(updatedValues);
                }, 0);
              }
            }}
            placeholder={field.placeholder || t('common.selectOption', `Select ${field.label}`)}
            searchPlaceholder={t('common.searchPlaceholder', `Search ${field.label?.toLowerCase()}...`)}
            emptyMessage={t('common.none', `${field.label} not found`)}
            loadingMessage={t('common.loading', 'Loading...')}
            countMessage={t('common.found', 'Found')}
            disabled={field.disabled || isLoading}
            className={cn(inputClasses, error && 'border-destructive')}
            loading={field.disabled && isLoading}
            fetchOptions={dynamicFetchOptions}
            pageSize={field.pageSize || 50}
          />
        );

      default:
        return (
          <Input
            {...register(fieldName)}
            {...baseProps}
            type={field.type}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className={cn(formContainerClasses, className)}>
      {title && (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className={formClasses}>
        {fields.map((field) => {
          const fieldName = field.name as Path<T>;
          const error = errors[fieldName];

          if (field.type === 'checkbox') {
            return (
              <div key={String(fieldName)} className={formGroupClasses}>
                {renderField(field)}
                {field.description && (
                  <p className={fieldDescriptionClasses}>
                    {field.description}
                  </p>
                )}
                {error && (
                  <p className={errorMessageClasses}>
                    {error.message as string}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={String(fieldName)} className={cn(
              formGroupClasses,
              field.type === 'virtual-select' ? 'virtual-select-container' : 'form-field-container'
            )}>
              <Label htmlFor={String(fieldName)} className={cn(labelClasses, 'field-label')}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
              {field.description && (
                <p className={cn(fieldDescriptionClasses, 'field-description')}>
                  {field.description}
                </p>
              )}
              {error && (
                <p className={errorMessageClasses}>
                  {error.message as string}
                </p>
              )}
            </div>
          );
        })}

        <Button
          type="submit"
          disabled={isLoading || isSubmitting}
          className={buttonClasses}
        >
          {(isLoading || isSubmitting) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {submitText}
        </Button>
      </form>
    </div>
  );
}
