/**
 * Константы приложения, которые НЕ зависят от среды запуска
 * Эти значения жестко прописаны в коде и одинаковы для всех окружений
 *
 * Применяется для всех сервисов проекта:
 * - Frontend (Next.js)
 * - Backend (Django)
 * - Mailing (FastAPI)
 * - Service Discovery (Python)
 */

// =============================================================================
// ПРОТОКОЛЫ (всегда одинаковые)
// =============================================================================
export const PROTOCOLS = {
  FRONTEND: 'http',
  BACKEND: 'http',
  POSTGRES: 'postgresql',
  RABBITMQ: 'amqp',
  RABBITMQ_MANAGEMENT: 'http',
  FLOWER: 'http',
  MAILING: 'http',
  REDIS: 'redis',
  WEBSOCKET: 'ws',
  WEBSOCKET_SECURE: 'wss',
} as const;

// =============================================================================
// СТАНДАРТНЫЕ ПОРТЫ СЕРВИСОВ (всегда одинаковые)
// =============================================================================
export const PORTS = {
  FRONTEND: 3000,
  BACKEND: 8000,
  POSTGRES: 5432,
  RABBITMQ: 5672,
  RABBITMQ_MANAGEMENT: 15672,
  FLOWER: 5555,
  REDIS_INSIGHT: 5540,
  MAILING_LOCAL: 8001,
  MAILING_DOCKER: 8000,
  REDIS: 6379,
} as const;

// =============================================================================
// ВНЕШНИЕ СЕРВИСЫ (всегда одинаковые URL)
// =============================================================================
export const EXTERNAL_SERVICES = {
  DUMMY_JSON: 'https://dummyjson.com',
  GOOGLE_APIS: 'https://www.googleapis.com',
  GOOGLE_OAUTH: 'https://accounts.google.com',
} as const;

// =============================================================================
// НАСТРОЙКИ СЕРВЕРА (всегда одинаковые)
// =============================================================================
export const SERVER_CONFIG = {
  HOST: '0.0.0.0',
  PORT: 3000,
  LOGGING_ENABLED: true,
} as const;

// =============================================================================
// НАСТРОЙКИ АУТЕНТИФИКАЦІЇ (з автоматичним дешифруванням)
// =============================================================================
import { getDecryptedOAuthConfig } from '@/lib/crypto-utils';

// Логируем переменные для диагностики
console.log('[Constants] Raw environment variables:');
console.log(`  NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '[SET]' : '[EMPTY]'}`);
console.log(`  NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '[SET]' : '[EMPTY]'}`);

// Получаем дешифрованную конфигурацию
const decryptedConfig = getDecryptedOAuthConfig();

export const AUTH_CONFIG = {
  NEXTAUTH_SECRET: decryptedConfig.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: decryptedConfig.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: decryptedConfig.GOOGLE_CLIENT_SECRET,
  GOOGLE_API_KEY: decryptedConfig.GOOGLE_API_KEY,
} as const;

// Логируем финальную конфигурацию
console.log('[Constants] Final AUTH_CONFIG:');
console.log(`  NEXTAUTH_SECRET: ${AUTH_CONFIG.NEXTAUTH_SECRET ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_ID: ${AUTH_CONFIG.GOOGLE_CLIENT_ID ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_API_KEY: ${AUTH_CONFIG.GOOGLE_API_KEY ? '[SET]' : '[EMPTY]'}`);

// Логируем первые символы для проверки
console.log('[Constants] Values preview:');
console.log(`  GOOGLE_CLIENT_ID starts with: ${AUTH_CONFIG.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
console.log(`  GOOGLE_CLIENT_SECRET starts with: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET.substring(0, 15)}...`);
console.log(`  GOOGLE_CLIENT_SECRET length: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET.length}`);

// =============================================================================
// НАСТРОЙКИ ТАЙМАУТОВ И ЛИМИТОВ (всегда одинаковые)
// =============================================================================
export const TIMEOUTS = {
  API_REQUEST: 15000, // 15 секунд
  WEBSOCKET_CONNECT: 10000, // 10 секунд
  TOKEN_REFRESH: 30000, // 30 секунд
  REDIS_OPERATION: 5000, // 5 секунд
} as const;

export const LIMITS = {
  MAX_RETRY_ATTEMPTS: 3,
  MAX_TOKEN_REFRESH_ATTEMPTS: 3,
  MAX_WEBSOCKET_RECONNECT_ATTEMPTS: 5,
  REDIS_TTL_HOURS: 24,
} as const;

// =============================================================================
// НАСТРОЙКИ УВЕДОМЛЕНИЙ (всегда одинаковые)
// =============================================================================
export const TOAST_CONFIG = {
  DEFAULT_DURATION: 5000,
  SUCCESS_DURATION: 4000,
  ERROR_DURATION: 8000,
  WARNING_DURATION: 6000,
  INFO_DURATION: 3000,
} as const;

// =============================================================================
// ПУТИ API (всегда одинаковые)
// =============================================================================
export const API_PATHS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  CHAT: {
    WEBSOCKET: '/api/chat',
  },
  REDIS: '/api/redis',
  HEALTH: '/health',
} as const;

// =============================================================================
// НАСТРОЙКИ WEBSOCKET (всегда одинаковые)
// =============================================================================
export const WEBSOCKET_CONFIG = {
  RECONNECT_INTERVAL: 3000, // 3 секунды
  PING_INTERVAL: 30000, // 30 секунд
  PONG_TIMEOUT: 5000, // 5 секунд
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
} as const;

// =============================================================================
// НАСТРОЙКИ ЛОГИРОВАНИЯ (всегда одинаковые)
// =============================================================================
export const LOGGING_CONFIG = {
  ENABLED: true,
  LEVEL: 'info',
  WEBSOCKET_DEBUG: false,
  API_DEBUG: true,
} as const;

// =============================================================================
// ТИПЫ ДЛЯ TYPESCRIPT
// =============================================================================
export type Protocol = typeof PROTOCOLS[keyof typeof PROTOCOLS];
export type Port = typeof PORTS[keyof typeof PORTS];
export type ExternalService = typeof EXTERNAL_SERVICES[keyof typeof EXTERNAL_SERVICES];
export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];

// =============================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С КОНСТАНТАМИ
// =============================================================================

/**
 * Получает стандартный порт для сервиса
 */
export const getStandardPort = (service: keyof typeof PORTS): number => {
  return PORTS[service];
};

/**
 * Получает протокол для сервиса
 */
export const getProtocol = (service: keyof typeof PROTOCOLS): string => {
  return PROTOCOLS[service];
};

/**
 * Получает путь API
 */
export const getApiPath = (category: keyof typeof API_PATHS, endpoint?: string): string => {
  const basePath = API_PATHS[category];
  if (typeof basePath === 'string') {
    return endpoint ? `${basePath}${endpoint}` : basePath;
  }
  return basePath[endpoint as keyof typeof basePath] || '';
};

/**
 * Проверяет, является ли URL внешним сервисом
 */
export const isExternalService = (url: string): boolean => {
  return Object.values(EXTERNAL_SERVICES).some(service => url.startsWith(service));
};
