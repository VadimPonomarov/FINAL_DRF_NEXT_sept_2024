/**
 * Shared Types Index
 * Централизованный экспорт всех общих типов
 */

// Экспорт всех общих типов
export * from './common';

// Реэкспорт основных типов из других файлов для обратной совместимости
export type { CarAd, CarAdFormData } from '../autoria';
export type { User, Profile, Account, Address } from '../entities';
export type { Message } from '../enhanced-chat';

// Дополнительные утилитарные типы
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Типы для форм
export type FormState = 'idle' | 'loading' | 'success' | 'error';
export type ValidationState = 'valid' | 'invalid' | 'pending';

// Типы для API
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// Типы для UI состояний
export type LoadingState = boolean;
export type ErrorState = string | null;
export type SuccessState = boolean;

// Типы для размеров компонентов
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Типы для тем
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray';

// Типы для языков
export type SupportedLanguage = 'en' | 'ru' | 'uk';
export type TranslationKey = string;

// Типы для событий
export type EventHandler<T = any> = (event: T) => void;
export type ClickHandler = EventHandler<React.MouseEvent>;
export type ChangeHandler = EventHandler<React.ChangeEvent>;
export type SubmitHandler = EventHandler<React.FormEvent>;

// Типы для хуков
export type UseStateReturn<T> = [T, React.Dispatch<React.SetStateAction<T>>];
export type UseEffectDeps = React.DependencyList;

// Типы для контекстов
export interface ContextValue<T> {
  value: T;
  setValue: (value: T) => void;
}

// Типы для провайдеров
export interface ProviderProps {
  children: React.ReactNode;
}

// Типы для роутинга
export interface PageProps {
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
}

// Типы для метаданных
export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

// Типы для SEO
export interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

// Типы для аналитики
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

// Типы для уведомлений
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Типы для модальных окон
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ComponentSize;
}

// Типы для таблиц
export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  width?: number;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// Типы для фильтров
export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

export interface FilterGroup {
  key: string;
  title: string;
  options: FilterOption[];
  multiple?: boolean;
}

// Типы для поиска
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Типы для файлов
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Типы для валидации
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Типы для конфигурации
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

// Типы для логирования
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

// Типы для кэширования
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'ttl';
}

// Типы для WebSocket
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: any;
}

// Типы для геолокации
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationData {
  coordinates: Coordinates;
  address?: string;
  city?: string;
  country?: string;
}

// Типы для устройств
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OperatingSystem = 'ios' | 'android' | 'windows' | 'macos' | 'linux';

export interface DeviceInfo {
  type: DeviceType;
  os: OperatingSystem;
  browser: string;
  version: string;
  userAgent: string;
}

// Типы для производительности
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

// Типы для A/B тестирования
export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

export interface Experiment {
  id: string;
  name: string;
  variants: ExperimentVariant[];
  active: boolean;
}

// Типы для интернационализации
export interface TranslationFunction {
  (key: string, params?: Record<string, any>): string;
}

export interface LocaleData {
  code: string;
  name: string;
  flag: string;
  rtl?: boolean;
}

// Типы для доступности
export interface AccessibilityOptions {
  highContrast?: boolean;
  largeText?: boolean;
  reduceMotion?: boolean;
  screenReader?: boolean;
}

// Типы для безопасности
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'Referrer-Policy'?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Типы для мониторинга
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
}

// Экспорт утилитарных типов
export type { DeepPartial, Nullable, Optional };
export type { FormState, ValidationState, ApiStatus };
export type { ComponentSize, ComponentVariant, ThemeMode };
export type { EventHandler, ClickHandler, ChangeHandler, SubmitHandler };
export type { PageProps, PageMetadata, SEOData };
export type { LogLevel, DeviceType, OperatingSystem };
