export enum AuthProvider {
    Select = "select",
    Dummy = "dummy",
    MyBackendDocs = "backend"
}

export enum ApiDomain {
    External = "external",  // Внешний бэкенд (Django)
    Internal = "internal"   // Внутренний API (Next.js)
}

// Упрощенная функция для получения Backend URL
const getBackendUrl = (): string => {
    // Простая логика: используем переменную окружения или fallback
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
};

// Inline constants (replaced @/config/constants)
const PROTOCOLS = {
  BACKEND: 'http',
  FRONTEND: 'http',
  REDIS: 'redis',
  FLOWER: 'http',
  RABBITMQ_MANAGEMENT: 'http',
  REDIS_INSIGHT: 'http'
};

const PORTS = {
  BACKEND: 8000,
  FRONTEND: 3000,
  REDIS: 6379,
  FLOWER: 5555,
  RABBITMQ_MANAGEMENT: 15672,
  REDIS_INSIGHT: 8001
};

const EXTERNAL_SERVICES = {
  GOOGLE_OAUTH: 'https://accounts.google.com',
  AUTORIA_API: 'https://developers.ria.com',
  DUMMY_JSON: 'https://dummyjson.com'
};

// Auth configuration with decryption
import { getDecryptedOAuthConfig, safeLogValue } from '@/lib/simple-crypto';

// Логируем переменные для диагностики
console.log('[Constants] Raw environment variables:');
console.log(`  ${safeLogValue('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET || '')}`);
console.log(`  ${safeLogValue('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID || '')}`);
console.log(`  ${safeLogValue('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET || '')}`);

// Получаем дешифрованную конфигурацию
const decryptedConfig = getDecryptedOAuthConfig();

export const AUTH_CONFIG = {
  NEXTAUTH_SECRET: decryptedConfig.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: decryptedConfig.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: decryptedConfig.GOOGLE_CLIENT_SECRET,
} as const;

// Логируем финальную конфигурацию
console.log('[Constants] Final AUTH_CONFIG:');
console.log(`  NEXTAUTH_SECRET: ${AUTH_CONFIG.NEXTAUTH_SECRET ? '[DECRYPTED]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_ID: ${AUTH_CONFIG.GOOGLE_CLIENT_ID ? '[DECRYPTED]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET ? '[DECRYPTED]' : '[EMPTY]'}`);

// Логируем первые символы для проверки
if (AUTH_CONFIG.GOOGLE_CLIENT_ID) {
  console.log(`  GOOGLE_CLIENT_ID preview: ${AUTH_CONFIG.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
}
if (AUTH_CONFIG.GOOGLE_CLIENT_SECRET) {
  console.log(`  GOOGLE_CLIENT_SECRET length: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET.length}`);
}

export const BaseUrl = {
    Backend: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || `${PROTOCOLS.BACKEND}://localhost:${PORTS.BACKEND}`,
    Dummy: EXTERNAL_SERVICES.DUMMY_JSON,
    Flower: process.env.NEXT_PUBLIC_FLOWER_URL || `${PROTOCOLS.FLOWER}://localhost:${PORTS.FLOWER}`,
    RedisInsight: process.env.NEXT_PUBLIC_REDIS_INSIGHT_URL || `${PROTOCOLS.REDIS_INSIGHT}://localhost:${PORTS.REDIS_INSIGHT}`,
    RabbitMQ: process.env.NEXT_PUBLIC_RABBITMQ_URL || `${PROTOCOLS.RABBITMQ_MANAGEMENT}://localhost:${PORTS.RABBITMQ_MANAGEMENT}`,
    // Внутренний API Next.js
    Internal: typeof window !== 'undefined'
        ? window.location.origin  // В браузере используем текущий origin
        : process.env.NEXTAUTH_URL || 'http://localhost:3000' // На сервере используем NEXTAUTH_URL
} as const;

// Экспортируем функцию для динамического получения Backend URL
export { getBackendUrl };

// Define the base URLs as string constants
export const API_URLS = {
    [AuthProvider.Select]: BaseUrl.Backend,
    [AuthProvider.Dummy]: BaseUrl.Dummy,
    [AuthProvider.MyBackendDocs]: BaseUrl.Backend
} as const;

export const API_ENDPOINTS = {
    auth: {
        login: "/api/auth/login",
        refresh: "/api/auth/refresh",
        register: "/api/users/create"
    },
    users: {
        profile: "/api/users/profile",
        list: "/api/users"
    },
    chat: {
        base: "/api/chat",
        messages: "/api/chat/messages"
    }
} as const;

export const HEADERS = {
    "Content-Type": "application/json"
} as const;

export const TOAST_DURATION = {
  SHORT: 1500,
  MEDIUM: 2500,
  LONG: 3500,
  ERROR: 5000
} as const;

// Re-export AuthProvider for convenience
// export { AuthProvider } from "@/shared/types/auth.interfaces";



