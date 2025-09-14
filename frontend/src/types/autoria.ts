/**
 * TypeScript типы для системы объявлений AutoRia
 */

// Базовые типы
export type Currency = 'USD' | 'EUR' | 'UAH';
export type AccountType = 'basic' | 'premium';
export type AdStatus = 'draft' | 'pending' | 'active' | 'needs_review' | 'rejected' | 'sold' | 'archived';
export type UserRole = 'buyer' | 'seller' | 'manager' | 'admin';
// Удален неиспользуемый тип ContactType

// Интерфейс для создания/редактирования объявления (формат формы)
export interface CarAdFormData {
  // Основная информация (обязательные поля)
  title?: string;
  description?: string;
  model?: string; // CharField в модели
  price?: number;
  currency?: Currency;
  region?: string; // ID региона как строка
  city?: string; // ID города как строка
  region_name?: string; // Название региона для отображения
  city_name?: string; // Название города для отображения

  // Связанные модели (используем строки для ID)
  brand?: string; // ID марки как строка (алиас для mark)
  mark?: string; // ID марки как строка
  vehicle_type?: string; // ID типа транспорта

  // Названия для отображения в virtual-select
  brand_name?: string; // Название марки для отображения
  mark_name?: string; // Название марки для отображения
  vehicle_type_name?: string; // Название типа транспорта для отображения
  model_name?: string; // Название модели для отображения

  // Названия для отображения в virtual-select
  brand_name?: string; // Название марки для отображения
  mark_name?: string; // Название марки для отображения
  vehicle_type_name?: string; // Название типа транспорта для отображения

  // Дополнительная информация
  generation?: string;
  modification?: string;

  // ✅ СИНХРОНИЗАЦИЯ: Технические характеристики (соответствуют CarSpecificationModel)
  year?: number; // CarSpecificationModel.year
  mileage?: number; // Frontend поле, маппится в mileage_km на backend
  mileage_km?: number; // Backend поле CarSpecificationModel.mileage_km
  engine_volume?: number; // CarSpecificationModel.engine_volume (в литрах)
  engine_power?: number; // CarSpecificationModel.engine_power (в л.с.)
  fuel_type?: string; // CarSpecificationModel.fuel_type (enum)
  transmission?: string; // CarSpecificationModel.transmission_type (enum)
  transmission_type?: string; // Алиас для совместимости
  drive_type?: string; // CarSpecificationModel.drive_type (enum)
  body_type?: string; // CarSpecificationModel.body_type (enum)
  color?: string | number; // CarSpecificationModel.color (ForeignKey ID)
  color_name?: string; // Название цвета для отображения (из CarColorModel.name)
  steering_wheel?: string; // CarSpecificationModel.steering_wheel (enum)
  condition?: string; // CarSpecificationModel.condition (enum)
  vin_code?: string; // CarSpecificationModel.vin_code (max 17 chars)
  license_plate?: string; // CarSpecificationModel.license_plate (max 20 chars)
  number_of_doors?: number; // CarSpecificationModel.number_of_doors (2,3,4,5)
  number_of_seats?: number; // CarSpecificationModel.number_of_seats (1-20)

  // Тип продавца и обмен
  seller_type?: 'private' | 'dealer' | 'auto_salon';
  exchange_status?: 'no_exchange' | 'possible' | 'only_exchange';

  // Геокодирование
  geocode?: string;

  // Динамические поля (JSON field в модели)
  dynamic_fields?: {
    year?: number;
    mileage?: number;
    engine_volume?: number;
    engine_power?: number;
    fuel_type?: string;
    transmission?: string;
    drive_type?: string;
    body_type?: string;
    color?: string;
    steering_wheel?: string;
    condition?: string;
    vin_code?: string;
    license_plate?: string;
    number_of_doors?: number;
    number_of_seats?: number;
    [key: string]: any; // Для дополнительных динамических полей
  };

  // Изображения
  images?: string[];

  // Местоположение (ForeignKey relationships)
  region: number; // ForeignKey to RegionModel
  city: number; // ForeignKey to CityModel

  // Дополнительные поля
  seller_type?: string;
  exchange_status?: string;
  exchange_possible?: boolean; // Возможность обмена

  // Dynamic fields (JSON field для дополнительных характеристик)
  dynamic_fields?: Record<string, any>;

  // Контактная информация объявления
  contact_name?: string;
  additional_info?: string;
  contacts?: AdContact[]; // Массив контактов объявления
  use_profile_contacts?: boolean; // Использовать контакты из профиля (по умолчанию true)

  // Устаревшие поля (для обратной совместимости)
  phone?: string;

  // Изображения
  images?: File[];
  existing_images?: CarAdImage[]; // Для редактирования - существующие изображения
  images_to_delete?: number[]; // ID изображений для удаления
  main_existing_image_id?: number; // ID главного существующего изображения


  // Новые поля для формы изображений
  uploaded_images?: File[]; // Локально загруженные, до сохранения объявления
  generated_images?: Array<{
    id?: string | number;
    url: string;
    title?: string;
    isMain?: boolean;
    source?: 'uploaded' | 'generated' | 'existing';
    image_display_url?: string;
    image?: string;
  }>;
  main_image_index?: number; // Индекс главного изображения среди объединенного списка

  // Метаданные (CarMetadataModel)
  is_urgent?: boolean;
  is_highlighted?: boolean;

  // Дополнительные поля для совместимости с формами
  id?: number;
}

// 🚗 Интерфейс для объявления из backend API (CarAdSerializer)
export interface CarAd {
  id: number;
  title: string;
  description: string;

  // Связанные объекты (populated ForeignKeys)
  mark: {
    id: number;
    name: string;
  } | number; // Может быть объектом или ID
  model: string; // В нашей модели это CharField, не ForeignKey
  generation?: string;
  modification?: string;

  // ✅ СИНХРОНИЗАЦИЯ: Технические характеристики (из CarSpecificationModel + dynamic_fields)
  year?: number; // CarSpecificationModel.year или dynamic_fields.year
  mileage?: number; // Frontend поле
  mileage_km?: number; // CarSpecificationModel.mileage_km или dynamic_fields.mileage_km
  engine_volume?: number; // CarSpecificationModel.engine_volume
  engine_power?: number; // CarSpecificationModel.engine_power
  fuel_type?: string; // CarSpecificationModel.fuel_type (enum)
  transmission?: string; // Frontend поле
  transmission_type?: string; // CarSpecificationModel.transmission_type (enum)
  drive_type?: string; // CarSpecificationModel.drive_type (enum)
  body_type?: string; // CarSpecificationModel.body_type (enum)
  color?: {
    id: number;
    name: string;
    hex_code?: string;
  } | string | number; // CarSpecificationModel.color (ForeignKey) - может быть объектом, строкой или числом
  steering_wheel?: string; // CarSpecificationModel.steering_wheel (enum)
  condition?: string; // CarSpecificationModel.condition (enum)
  vin_code?: string; // CarSpecificationModel.vin_code (max 17 chars)
  license_plate?: string; // CarSpecificationModel.license_plate (max 20 chars)
  number_of_doors?: number; // CarSpecificationModel.number_of_doors (2,3,4,5)
  number_of_seats?: number; // CarSpecificationModel.number_of_seats (1-20)

  // Ценообразование
  price: number;
  currency: Currency;

  // Местоположение (могут быть объектами или строками/числами)
  region: {
    id: number;
    name: string;
  } | string | number;
  city: {
    id: number;
    name: string;
  } | string | number;

  // Статус и модерация
  status: AdStatus;
  is_validated: boolean;
  moderation_reason?: string;

  // Дополнительные поля
  seller_type: string;
  exchange_status: string;
  is_urgent: boolean;
  is_highlighted: boolean;

  // Метаданные
  views_count?: number;
  created_at: string;
  updated_at: string;

  // Dynamic fields (содержит дополнительные характеристики)
  dynamic_fields?: Record<string, any>;

  // Дополнительные поля для совместимости
  contacts?: Contact[];
  contact_name?: string;
  phone?: string;
  additional_info?: string;
  images?: CarAdImage[];

  // Поля, которые могут быть в разных местах
  brand?: string | number; // Алиас для mark
  vehicle_type?: string;
}

// 📈 Интерфейс для статистики объявления (backend statistics API)
export interface AdStatistics {
  ad_id: number;
  title: string;
  is_premium: boolean;
  views?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  pricing?: {
    your_price: {
      amount: number;
      currency: string;
    };
    region_average: {
      amount: number;
      currency: string;
      count: number;
      position_percentile: number;
    };
    ukraine_average: {
      amount: number;
      currency: string;
      count: number;
      position_percentile: number;
    };
  };
  recommendations?: Array<{
    type: 'price' | 'views' | 'description' | 'photos';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  last_updated: string;
}

// Интерфейс для поиска
export interface CarSearchFormData {
  vehicle_type?: string; // Тип транспортного средства
  brand?: string;
  model?: string;
  year_from?: number;
  year_to?: number;
  price_from?: number;
  price_to?: number;
  currency?: Currency;
  mileage_to?: number;
  fuel_type?: string;
  transmission?: string;
  region?: string;
  city?: string;
  status?: AdStatus; // Статус объявления
  sort_by?: 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'created_desc';
  page_size?: number; // Количество результатов на странице
}

// Удаляем дублирующий интерфейс - используем основной CarAd выше

// Интерфейс изображения
export interface CarAdImage {
  id: number;
  image: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

// Интерфейс для загрузки изображений
export interface ImageUploadFormData {
  images: FileList;
}

// Интерфейс аналитики (только для Premium)
export interface CarAdAnalytics {
  ad_id: number;
  title: string;
  is_premium: boolean;
  views?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  pricing?: {
    your_price: {
      amount: number;
      currency: Currency;
    };
    region_average: {
      amount: number;
      currency: Currency;
      count: number;
      position_percentile: number;
    };
    ukraine_average: {
      amount: number;
      currency: Currency;
      count: number;
      position_percentile: number;
    };
  };
  message?: string; // Для базовых аккаунтов
}

// Интерфейс профиля пользователя
export interface UserProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  region: string;
  city: string;
  account_type: AccountType;
  notifications_email: boolean;
  notifications_push: boolean;
}

// Интерфейс для модерации
export interface ModerationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  reason?: string;
  violations?: string[];
  censored_content?: {
    title?: string;
    description?: string;
  };
}

// Интерфейсы для справочных данных
export interface CarBrand {
  id: number;
  name: string;
  logo?: string;
  popular: boolean;
}

export interface CarModel {
  id: number;
  name: string;
  brand: number;
  popular: boolean;
}

export interface CarColor {
  id: number;
  name: string;
  hex_code?: string;
  popular: boolean;
}

export interface Region {
  id: number;
  name: string;
  cities: City[];
}

export interface City {
  id: number;
  name: string;
  region: number;
}

// Интерфейсы для валютной системы
export interface CurrencyRate {
  base_currency: Currency;
  target_currency: Currency;
  rate: number;
  updated_at: string;
  source: string;
}

export interface CurrencyConversion {
  amount: number;
  from_currency: Currency;
  to_currency: Currency;
  converted_amount: number;
  rate: number;
  rate_date: string;
}

// Интерфейсы для лимитов аккаунта
export interface AccountLimits {
  allowed: boolean;
  reason: string;
  account_type: AccountType;
  current_ads: number;
  max_ads: number | null;
  upgrade_message?: string;
  upgrade_url?: string;
}

// Интерфейсы для статистики
export interface PlatformStatistics {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_users: number;
  ads_by_brand: Array<{ brand: string; count: number }>;
  ads_by_region: Array<{ region: string; count: number }>;
  average_price_by_currency: Record<Currency, number>;
}

// Интерфейс для уведомлений
export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  ad_approved: boolean;
  ad_rejected: boolean;
  new_message: boolean;
  price_drop_alert: boolean;
}

// Интерфейс для сообщений
export interface ChatMessage {
  id: number;
  ad_id: number;
  sender: {
    id: number;
    name: string;
    account_type: AccountType;
  };
  message: string;
  created_at: string;
  is_read: boolean;
}

// Интерфейс для избранного
export interface FavoriteAd {
  id: number;
  ad: CarAd;
  created_at: string;
}

// API Response типы
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Типы для форм с валидацией
export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  errors?: FormValidationError[];
  message?: string;
}

// Контакт объявления
export interface AdContact {
  id?: number;
  type: string; // ContactTypeEnum
  value: string;
  is_visible: boolean;
  is_primary: boolean;
  note?: string;
}

// Экспорт всех типов
export type {
  ExtendedFormFieldConfig,
  GenericFormProps
};
