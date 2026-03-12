/**
 * Строгие типы без any для проекта AutoRia
 * Соответствует правилам строгой типизации
 */

// ============================================================================
// БАЗОВЫЕ ТИПЫ
// ============================================================================

export type Currency = 'USD' | 'EUR' | 'UAH';
export type AdStatus = 'draft' | 'pending' | 'active' | 'needs_review' | 'rejected' | 'blocked' | 'sold' | 'archived' | 'paused';
export type AccountTypeEnum = 'basic' | 'premium' | 'business';
export type ModerationLevelEnum = 'none' | 'basic' | 'strict';
export type RoleEnum = 'user' | 'moderator' | 'admin';
export type GenderEnum = 'male' | 'female' | 'other' | 'neutral';
export type SellerType = 'private' | 'dealer' | 'auto_salon';
export type ExchangeStatus = 'no_exchange' | 'possible' | 'only_exchange';

// ============================================================================
// REFERENCE TYPES (справочники)
// ============================================================================

export interface ReferenceItem {
  id: number;
  name: string;
  slug?: string;
}

export interface VehicleType extends ReferenceItem {
  icon?: string;
}

export interface Brand extends ReferenceItem {
  logo?: string;
  country?: string;
}

export interface Model extends ReferenceItem {
  brand_id: number;
}

export interface Region extends ReferenceItem {
  country_code?: string;
}

export interface City extends ReferenceItem {
  region_id: number;
}

// ============================================================================
// IMAGE TYPES
// ============================================================================

export interface CarAdImage {
  id: number;
  image: string;
  image_url?: string;
  image_display_url?: string;
  url?: string;
  is_main: boolean;
  is_primary?: boolean;
  caption?: string;
  order: number;
  created_at: string;
}

export interface GeneratedImage {
  id: string | number;
  url: string;
  title?: string;
  isMain?: boolean;
  source: 'uploaded' | 'generated' | 'existing';
  image_display_url?: string;
  image?: string;
}

// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface Contact {
  id?: number;
  type: string;
  value: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

export interface AdContact {
  id?: number;
  type: string;
  value: string;
  is_visible: boolean;
  is_primary: boolean;
  note?: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
  role?: RoleEnum;
  account_type?: AccountTypeEnum;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: number;
  user: number;
  gender?: GenderEnum;
  birth_date?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
}

// ============================================================================
// CAR AD FORM DATA
// ============================================================================

export interface CarAdFormData {
  // Основная информация
  id?: number;
  title?: string;
  description?: string;
  
  // Транспортное средство
  vehicle_type?: string | number;
  vehicle_type_name?: string;
  brand?: string | number;
  brand_name?: string;
  mark?: string | number;
  mark_name?: string;
  model?: string | number;
  model_name?: string;
  generation?: string;
  modification?: string;
  
  // Технические характеристики
  year?: number;
  mileage?: number;
  mileage_km?: number;
  engine_volume?: number;
  engine_power?: number;
  fuel_type?: string;
  transmission?: string;
  transmission_type?: string;
  drive_type?: string;
  body_type?: string;
  color?: string | number;
  color_name?: string;
  steering_wheel?: string;
  condition?: string;
  vin_code?: string;
  license_plate?: string;
  number_of_doors?: number;
  number_of_seats?: number;
  
  // Цена и валюта
  price?: number;
  currency?: Currency;
  
  // Местоположение
  region?: string | number;
  region_name?: string;
  city?: string | number;
  city_name?: string;
  geocode?: string;
  
  // Продавец и обмен
  seller_type?: SellerType;
  exchange_status?: ExchangeStatus;
  exchange_possible?: boolean;
  
  // Изображения
  images?: File[] | string[] | CarAdImage[];
  existing_images?: CarAdImage[];
  images_to_delete?: number[];
  main_existing_image_id?: number;
  uploaded_images?: File[];
  generated_images?: GeneratedImage[];
  
  // Контакты
  contacts?: AdContact[];
  
  // Статус
  status?: AdStatus;
}

// ============================================================================
// CAR AD (полная модель объявления)
// ============================================================================

export interface CarAd {
  id: number;
  title: string;
  description: string;
  
  // Транспортное средство
  vehicle_type: number | VehicleType;
  brand: number | Brand;
  mark: number | Brand;
  model: string | Model;
  brand_name?: string;
  mark_name?: string;
  model_name?: string;
  vehicle_type_name?: string;
  generation?: string;
  modification?: string;
  
  // Технические характеристики
  year?: number;
  mileage?: number;
  mileage_km?: number;
  engine_volume?: number;
  engine_power?: number;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  body_type?: string;
  color?: string | number;
  color_name?: string;
  steering_wheel?: string;
  condition?: string;
  vin_code?: string;
  license_plate?: string;
  number_of_doors?: number;
  number_of_seats?: number;
  
  // Динамические поля (для совместимости с различными источниками данных)
  dynamic_fields?: {
    year?: number;
    mileage?: number;
    mileage_km?: number;
    fuel_type?: string;
    transmission?: string;
    engine_volume?: number;
    engine_power?: number;
    drive_type?: string;
    body_type?: string;
    color?: string;
    steering_wheel?: string;
    condition?: string;
    [key: string]: any;
  };
  
  // Цена
  price: number;
  currency: Currency;
  // Дополнительные поля цены (рассчитываются на backend)
  price_usd?: number;
  price_eur?: number;
  price_uah?: number;
  
  // Местоположение
  region: number | Region;
  city: number | City;
  region_name?: string;
  city_name?: string;
  
  // Продавец
  seller_type?: SellerType;
  exchange_possible?: boolean;
  
  // Изображения
  images: CarAdImage[];
  main_image?: CarAdImage;
  
  // Контакты
  contacts?: AdContact[];
  
  // Владелец
  user?: User;
  user_id?: number;
  
  // Статус и даты
  status: AdStatus;
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Статистика
  views_count?: number;
  favorites_count?: number;
  
  // Статусы пользователя
  is_favorite?: boolean;
  phone_views_count?: number;
  
  // Дополнительные статусы
  is_validated?: boolean;
  exchange_status?: string;
  is_urgent?: boolean;
  is_highlighted?: boolean;
  is_premium?: boolean;
  is_vip?: boolean;
}

// ============================================================================
// FORM FIELD CONFIG
// ============================================================================

export interface BaseFormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'virtual-select' | 'file' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  className?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectFieldConfig extends BaseFormFieldConfig {
  type: 'select';
  options: SelectOption[];
}

export interface VirtualSelectFieldConfig extends BaseFormFieldConfig {
  type: 'virtual-select';
  fetchOptions: (search: string) => Promise<ReferenceItem[]>;
  pageSize?: number;
  initialLabel?: string;
  key?: string;
}

export type FormFieldConfig = BaseFormFieldConfig | SelectFieldConfig | VirtualSelectFieldConfig;

// ============================================================================
// AUTO FILL TYPES
// ============================================================================

export interface AutoFillSummary {
  availableFields: string[];
  totalFields: number;
  filledFields: number;
}

export interface AutoFillButtonProps {
  onAutoFill: (currentFormData: Partial<CarAdFormData>, options?: {
    overwriteExisting?: boolean;
    fieldsToFill?: string[];
  }) => Partial<CarAdFormData>;
  isAvailable: boolean;
  isLoading: boolean;
  summary: AutoFillSummary;
  className?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}
