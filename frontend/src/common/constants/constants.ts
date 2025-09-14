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

import { EXTERNAL_SERVICES, PORTS, PROTOCOLS } from "@/config/constants";

export const BaseUrl = {
    Backend: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || `${PROTOCOLS.BACKEND}://localhost:${PORTS.BACKEND}`,
    Dummy: EXTERNAL_SERVICES.DUMMY_JSON,
    Flower: process.env.NEXT_PUBLIC_FLOWER_URL || `${PROTOCOLS.FLOWER}://localhost:${PORTS.FLOWER}`,
    RedisInsight: process.env.NEXT_PUBLIC_REDIS_INSIGHT_URL || `${PROTOCOLS.FLOWER}://localhost:${PORTS.REDIS_INSIGHT}`,
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
// export { AuthProvider } from "@/common/interfaces/auth.interfaces";



