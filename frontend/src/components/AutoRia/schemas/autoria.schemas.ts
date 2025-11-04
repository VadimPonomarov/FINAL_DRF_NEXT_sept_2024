/**
 * Joi схемы валидации для форм AutoRia
 * Использует систему i18n для сообщений об ошибках
 */

import Joi from 'joi';
import { CarAdFormData, CarSearchFormData, UserProfileFormData, ImageUploadFormData } from '@/modules/autoria/shared/types/autoria';

// Общие валидаторы
const currentYear = new Date().getFullYear();
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

// Тип для функции перевода
type TranslationFunction = (key: string, params?: Record<string, any>) => string;

// Функция для создания схемы с переводами
export const createCarAdSchema = (t: TranslationFunction) => Joi.object<CarAdFormData>({
  // Основная информация
  title: Joi.string()
    .min(10)
    .max(100)
    .required()
    .messages({
      'string.empty': t('common.validation.requiredFields'),
      'string.min': `${t('autoria.title')} must be at least 10 characters`,
      'string.max': `${t('autoria.title')} must not exceed 100 characters`
    }),

  description: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.empty': t('common.validation.requiredFields'),
      'string.min': `${t('autoria.description')} must be at least 20 characters`,
      'string.max': `${t('autoria.description')} must not exceed 2000 characters`
    }),

  // Характеристики автомобиля
  vehicle_type: Joi.string()
    .required()
    .messages({
      'string.empty': t('autoria.selectVehicleType')
    }),

  brand: Joi.string()
    .required()
    .messages({
      'string.empty': `${t('autoria.brand')} is required`
    }),

  model: Joi.string()
    .required()
    .messages({
      'string.empty': `${t('autoria.model')} is required`
    }),

  year: Joi.number()
    .integer()
    .min(1950)
    .max(currentYear + 1)
    .required()
    .messages({
      'number.base': 'Year must be a number',
      'number.min': 'Year cannot be less than 1950',
      'number.max': `Year cannot be greater than ${currentYear + 1}`,
      'any.required': 'Year is required'
    }),

  mileage: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .required()
    .messages({
      'number.base': 'Mileage must be a number',
      'number.min': 'Mileage cannot be negative',
      'number.max': 'Mileage cannot exceed 1,000,000 km',
      'any.required': 'Mileage is required'
    }),

  engine_volume: Joi.number()
    .min(0.1)
    .max(10.0)
    .precision(1)
    .required()
    .messages({
      'number.base': 'Объем двигателя должен быть числом',
      'number.min': 'Объем двигателя не может быть меньше 0.1л',
      'number.max': 'Объем двигателя не может быть больше 10.0л',
      'any.required': 'Укажите объем двигателя'
    }),

  fuel_type: Joi.string()
    .valid('petrol', 'diesel', 'gas', 'hybrid', 'electric')
    .required()
    .messages({
      'any.only': 'Выберите тип топлива',
      'any.required': 'Укажите тип топлива'
    }),

  transmission: Joi.string()
    .valid('manual', 'automatic', 'robot', 'variator')
    .required()
    .messages({
      'any.only': 'Выберите тип коробки передач',
      'any.required': 'Укажите тип коробки передач'
    }),

  body_type: Joi.string()
    .valid('sedan', 'hatchback', 'wagon', 'suv', 'coupe', 'convertible', 'pickup', 'van', 'minivan')
    .required()
    .messages({
      'any.only': 'Выберите тип кузова',
      'any.required': 'Укажите тип кузова'
    }),

  color: Joi.string()
    .required()
    .messages({
      'string.empty': 'Выберите цвет автомобиля'
    }),

  // Цена
  price: Joi.number()
    .min(1)
    .max(10000000)
    .required()
    .messages({
      'number.base': 'Цена должна быть числом',
      'number.min': 'Цена должна быть больше 0',
      'number.max': 'Цена не может превышать 10,000,000',
      'any.required': 'Укажите цену'
    }),

  currency: Joi.string()
    .valid('USD', 'EUR', 'UAH')
    .required()
    .messages({
      'any.only': 'Выберите валюту',
      'any.required': 'Укажите валюту'
    }),

  // Местоположение
  region: Joi.string()
    .required()
    .messages({
      'string.empty': 'Выберите регион'
    }),

  city: Joi.string()
    .required()
    .messages({
      'string.empty': 'Выберите город'
    }),

  // Контактная информация
  phone: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Введите корректный номер телефона',
      'string.empty': 'Укажите номер телефона'
    }),

  contact_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Имя должно содержать минимум 2 символа',
      'string.max': 'Имя не должно превышать 50 символов',
      'string.empty': 'Укажите контактное имя'
    }),

  // Дополнительные поля
  vin_code: Joi.string()
    .length(17)
    .alphanum()
    .optional()
    .messages({
      'string.length': 'VIN код должен содержать 17 символов',
      'string.alphanum': 'VIN код должен содержать только буквы и цифры'
    }),

  condition: Joi.string()
    .valid('new', 'used', 'damaged')
    .required()
    .messages({
      'any.only': 'Выберите состояние автомобиля',
      'any.required': 'Укажите состояние автомобиля'
    }),

  exchange_possible: Joi.boolean()
    .default(false),

  additional_info: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Дополнительная информация не должна превышать 500 символов'
    })
});

// Схема для поиска автомобилей
export const carSearchSchema = Joi.object<CarSearchFormData>({
  brand: Joi.string().optional(),
  model: Joi.string().optional(),
  
  year_from: Joi.number()
    .integer()
    .min(1950)
    .max(currentYear + 1)
    .optional()
    .messages({
      'number.min': 'Год не может быть меньше 1950',
      'number.max': `Год не может быть больше ${currentYear + 1}`
    }),

  year_to: Joi.number()
    .integer()
    .min(1950)
    .max(currentYear + 1)
    .optional()
    .when('year_from', {
      is: Joi.exist(),
      then: Joi.number().min(Joi.ref('year_from')).messages({
        'number.min': 'Год "до" должен быть больше года "от"'
      })
    }),

  price_from: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Цена не может быть отрицательной'
    }),

  price_to: Joi.number()
    .min(0)
    .optional()
    .when('price_from', {
      is: Joi.exist(),
      then: Joi.number().min(Joi.ref('price_from')).messages({
        'number.min': 'Цена "до" должна быть больше цены "от"'
      })
    }),

  currency: Joi.string()
    .valid('USD', 'EUR', 'UAH')
    .optional(),

  mileage_to: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Пробег не может быть отрицательным',
      'number.max': 'Пробег не может превышать 1,000,000 км'
    }),

  fuel_type: Joi.string()
    .valid('petrol', 'diesel', 'gas', 'hybrid', 'electric')
    .optional(),

  transmission: Joi.string()
    .valid('manual', 'automatic', 'robot', 'variator')
    .optional(),

  region: Joi.string().optional(),
  city: Joi.string().optional(),

  sort_by: Joi.string()
    .valid('price_asc', 'price_desc', 'year_desc', 'mileage_asc', 'created_desc')
    .default('created_desc')
});

// Схема для профиля пользователя
export const userProfileSchema = Joi.object<UserProfileFormData>({
  first_name: Joi.string()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.min': 'Имя должно содержать минимум 2 символа',
      'string.max': 'Имя не должно превышать 30 символов',
      'string.empty': 'Укажите имя'
    }),

  last_name: Joi.string()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.min': 'Фамилия должна содержать минимум 2 символа',
      'string.max': 'Фамилия не должна превышать 30 символов',
      'string.empty': 'Укажите фамилию'
    }),

  phone: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Введите корректный номер телефона',
      'string.empty': 'Укажите номер телефона'
    }),

  region: Joi.string()
    .required()
    .messages({
      'string.empty': 'Выберите регион'
    }),

  city: Joi.string()
    .required()
    .messages({
      'string.empty': 'Выберите город'
    }),

  account_type: Joi.string()
    .valid('basic', 'premium')
    .default('basic'),

  notifications_email: Joi.boolean().default(true),
  notifications_push: Joi.boolean().default(true)
});

// Схема для загрузки изображений
export const imageUploadSchema = Joi.object<ImageUploadFormData>({
  images: Joi.any()
    .required()
    .messages({
      'any.required': 'Выберите изображения для загрузки'
    })
});

// Все схемы уже экспортированы выше с помощью export const
