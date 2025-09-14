"use client";

import React from 'react';
import Joi from 'joi';
import { GenericForm } from '@/components/Forms/GenericForm/GenericForm';
import { carAdSchema } from '../schemas/autoria.schemas';
import { CarAdFormData } from '@/types/autoria';
import { ExtendedFormFieldConfig } from '@/components/Forms/GenericForm/GenericForm';
import { useI18n } from '@/contexts/I18nContext';

interface MetadataFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const MetadataForm: React.FC<MetadataFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();

  // Конфигурация полей для дополнительных характеристик
  const fields: ExtendedFormFieldConfig<Partial<CarAdFormData>>[] = [
    {
      name: 'license_plate',
      label: t('licensePlate'),
      type: 'text',
      placeholder: t('enterLicensePlate'),
      required: false,
      description: t('licensePlateDescription')
    },
    {
      name: 'number_of_doors',
      label: t('numberOfDoors'),
      type: 'select',
      placeholder: t('selectDoors'),
      required: false,
      options: [
        { value: '2', label: `2 ${t('doors')}` },
        { value: '3', label: `3 ${t('doors')}` },
        { value: '4', label: `4 ${t('doors')}` },
        { value: '5', label: `5 ${t('doors')}` }
      ],
      description: t('doorsDescription')
    },
    {
      name: 'number_of_seats',
      label: t('numberOfSeats'),
      type: 'number',
      placeholder: t('enterSeats'),
      required: false,
      min: 1,
      max: 20,
      description: t('seatsDescription')
    },
    {
      name: 'steering_wheel',
      label: t('steeringWheel'),
      type: 'select',
      placeholder: t('selectSteeringWheel'),
      required: false,
      options: [
        { value: 'left', label: t('leftSteering') },
        { value: 'right', label: t('rightSteering') }
      ],
      description: t('steeringWheelDescription')
    },
    {
      name: 'drive_type',
      label: t('driveType'),
      type: 'select',
      placeholder: t('selectDriveType'),
      required: false,
      options: [
        { value: 'front', label: t('frontDrive') },
        { value: 'rear', label: t('rearDrive') },
        { value: 'all', label: t('allDrive') }
      ],
      description: t('driveTypeDescription')
    },
    {
      name: 'engine_power',
      label: t('enginePower'),
      type: 'number',
      placeholder: t('enterPower'),
      required: false,
      min: 1,
      max: 2000,
      description: t('enginePowerDescription')
    },
    {
      name: 'seller_type',
      label: t('sellerType'),
      type: 'select',
      placeholder: t('selectSellerType'),
      required: false,
      options: [
        { value: 'private', label: t('privateSeller') },
        { value: 'dealer', label: t('dealerSeller') },
        { value: 'company', label: t('companySeller') }
      ],
      description: t('sellerTypeDescription')
    },
    {
      name: 'exchange_status',
      label: t('exchangeStatus'),
      type: 'select',
      placeholder: t('selectExchangeStatus'),
      required: false,
      options: [
        { value: 'no_exchange', label: t('noExchange') },
        { value: 'possible', label: t('exchangePossible') },
        { value: 'only_exchange', label: t('onlyExchange') }
      ],
      description: t('exchangeStatusDescription')
    },
    {
      name: 'is_urgent',
      label: t('urgentSale'),
      type: 'checkbox',
      required: false,
      description: t('urgentSaleDescription')
    },
    {
      name: 'is_highlighted',
      label: t('highlightAd'),
      type: 'checkbox',
      required: false,
      description: t('highlightAdDescription')
    },
    {
      name: 'additional_info',
      label: t('additionalInfo'),
      type: 'textarea',
      placeholder: t('additionalInfoPlaceholder'),
      required: false,
      rows: 4,
      description: t('metadata.additionalInfoHelp', 'Additional information useful for buyers')
    }
  ];

  // Схема валидации для дополнительных полей
  const metadataSchema = Joi.object({
    license_plate: Joi.string().optional().allow(''),
    number_of_doors: Joi.number().integer().min(2).max(5).optional(),
    number_of_seats: Joi.number().integer().min(2).max(9).optional(),
    steering_wheel: Joi.string().valid('left', 'right').optional(),
    drive_type: Joi.string().valid('fwd', 'rwd', 'awd', '4wd').optional(),
    engine_power: Joi.number().min(50).max(2000).optional(),
    seller_type: Joi.string().valid('private', 'dealer', 'salon').optional(),
    exchange_status: Joi.string().valid('no_exchange', 'possible', 'only_exchange').optional(),
    is_urgent: Joi.boolean().optional(),
    is_highlighted: Joi.boolean().optional(),
    additional_info: Joi.string().max(500).optional().allow('')
  });

  const handleSubmit = (formData: Partial<CarAdFormData>) => {
    console.log('[MetadataForm] 📤 Submitting metadata:', formData);
    onChange(formData);
  };

  return (
    <div className="space-y-8 p-4">
      {/* Заголовок секции */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('autoria.metadataTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('autoria.metadataDescription')}
        </p>
      </div>

      {/* Отображение ошибок */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            {t('autoria.fixErrors', 'Fix the following errors:')}
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Форма с правильной структурой */}
      <GenericForm
        schema={metadataSchema}
        fields={fields}
        defaultValues={data || {}}
        onSubmit={handleSubmit}
        submitText={t('continue')}
        showCard={false}
        resetOnSubmit={false}
      />

      {/* Информационное сообщение */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {t('metadata.tipTitle', 'Tip')}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                {t('metadata.tipBody', 'The more details you provide, the higher the chance to find an interested buyer. All additional specs help buyers better understand your car.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataForm;
