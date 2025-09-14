/**
 * Shared Common Types
 * Централизованные общие типы для всего проекта
 */

// Базовые типы
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Общие пропсы для компонентов
export interface IProps {
  children?: React.ReactNode;
  className?: string;
}

// Пагинация
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API ответы
export interface ApiResponse<T = any> {
  data?: T;
  status?: number;
  message?: string;
  error?: string | {
    message: string;
    code?: string;
    [key: string]: unknown;
  };
}

// Опции для селектов
export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Результат загрузки данных
export interface FetchResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

// Пользователь (базовый)
export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

// Роли пользователей
export type UserRole = 'buyer' | 'seller' | 'manager' | 'admin';

// Типы аккаунтов
export enum AccountTypeEnum {
  BASIC = 'basic',
  PREMIUM = 'premium',
  DEALER = 'dealer'
}

// Валюты
export type Currency = 'USD' | 'EUR' | 'UAH';

// Роли сообщений в чате
export type MessageRole = 'user' | 'assistant' | 'system';

// Типы сообщений
export type MessageType = 'chat_message' | 'system_message' | 'error_message' | 'response_end' | 'file_message';

// Базовое сообщение
export interface BaseMessage {
  id?: string;
  type: MessageType;
  timestamp: string;
  chunk_id?: string;
  content?: string;
}

// Сообщение чата
export interface ChatMessage extends BaseMessage {
  role: MessageRole;
  message?: string;
  user_name?: string;
  files?: FileAttachment[];
}

// Вложение файла
export interface FileAttachment {
  file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

// WebSocket сообщение
export interface WebSocketMessage {
  id?: string;
  type: MessageType;
  message?: string;
  content?: string;
  role?: MessageRole;
  user_name?: string;
  timestamp?: string;
  chunk_id?: string;
  files?: FileAttachment[];
}

// Параметры роута
export interface RouteParams {
  params: {
    id: string;
    [key: string]: string;
  };
}

// Конфигурация сервиса
export interface ServiceConfig {
  name: string;
  url: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
}

// Статистика объявлений
export interface AdStatistics {
  total_views: number;
  unique_views: number;
  contacts_shown: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
}

// Результат модерации
export interface ModerationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  reason?: string;
  moderator_notes?: string;
  moderated_at: string;
  moderated_by?: number;
}

// Курс валют
export interface CurrencyRate {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  updated_at: string;
}

// Регион
export interface Region {
  id: number;
  name: string;
  code: string;
  country?: string;
}

// Город
export interface City {
  id: number;
  name: string;
  region_id: number;
  region?: Region;
}

// Модель автомобиля
export interface CarModel {
  id: number;
  name: string;
  brand_id: number;
  brand_name?: string;
}

// Профиль пользователя
export interface UserProfile {
  id: number;
  user_id: number;
  name: string;
  surname: string;
  age?: number;
  avatar?: string;
  avatar_url?: string;
}

// Элемент справочника
export interface ReferenceItem {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
}

// Контекст типы для провайдеров
export interface AuthResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    email: string;
  };
}

// Пропсы для кнопок
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

// Пропсы для виртуального селекта
export interface VirtualSelectProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Пропсы для сообщений чата
export interface ChatMessageProps {
  message: ChatMessage;
  isUser?: boolean;
  showAvatar?: boolean;
  className?: string;
}

// Пропсы для заголовка чата
export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}

// Пропсы для ввода чата
export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Пропсы для кнопки отправки
export interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Данные геокодирования
export interface GeocodedData {
  formatted_address: string;
  latitude: number;
  longitude: number;
  components: {
    country?: string;
    region?: string;
    city?: string;
    street?: string;
  };
}

// Данные карт
export interface MapsData {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

// Статистика платформы
export interface PlatformStats {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_users: number;
}

// Статистика дашборда
export interface DashboardStats {
  my_ads: number;
  active_ads: number;
  views_today: number;
  messages_count: number;
}

// Опции генерации изображений
export interface ImageGenerationOptions {
  style: string;
  quality: 'low' | 'medium' | 'high';
  count: number;
}

// Тип изображения
export type ImageType = 'front' | 'back' | 'side' | 'interior' | 'engine' | 'custom';

// Позиция фильтра
export type FilterPosition = 'left' | 'right' | 'top' | 'bottom';

// Размер фильтра
export type FilterSize = 'small' | 'medium' | 'large';
