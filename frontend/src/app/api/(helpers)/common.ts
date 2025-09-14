import { getAuthorizationHeaders } from "@/common/constants/headers";
import { API_URLS, AuthProvider } from "@/common/constants/constants";
import { AuthResponse } from "@/common/interfaces/auth.interfaces";
import { getRedisData } from "@/services/redis/redisService.ts";

import { ErrorHandlerOptions, handleApiError } from "./errorHandler";
import { ServerErrorHandlerOptions, handleServerApiError } from "./serverErrorHandler";

// Новые интерфейсы для работы с доменами
export interface FetchWithDomainOptions extends ErrorHandlerOptions {
  params?: Record<string, string>;
  method?: string;
  body?: unknown;
  redirectOnError?: boolean;
  callbackUrl?: string;
  domain?: 'external' | 'internal';
  headers?: Record<string, string>;
}

export interface FetchDataOptions extends ErrorHandlerOptions {
  params?: Record<string, string>;
  method?: string;
  body?: unknown; // Изменили тип с Record<string, unknown> на unknown
  redirectOnError?: boolean;
  callbackUrl?: string;
  domain?: 'external' | 'internal'; // Новый параметр для выбора домена
  headers?: Record<string, string>; // Дополнительные заголовки
}

export interface ServerFetchDataOptions extends ServerErrorHandlerOptions {
  params?: Record<string, string>;
  method?: string;
  body?: unknown;
  redirectOnError?: boolean;
  callbackUrl?: string;
  domain?: 'external' | 'internal';
  headers?: Record<string, string>;
}

// Общие функции без привязки к конкретному API

/**
 * Server-side version of fetchData that doesn't use toast notifications
 */
export async function serverFetchData(
  endpoint: string,
  options: ServerFetchDataOptions = {}
): Promise<any> {
  const {
    method = 'GET',
    body,
    redirectOnError = false,
    callbackUrl = '/login',
    domain = 'internal',
    headers = {},
    params = {}
  } = options;

  try {
    // Определяем базовый URL в зависимости от домена
    let baseUrl = '';
    if (domain === 'external') {
      baseUrl = ''; // Для внешних API используем полный URL
    } else {
      baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    }

    // Строим полный URL
    const url = new URL(endpoint, baseUrl);

    // Добавляем параметры запроса
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Получаем токен авторизации для серверных запросов
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    let authHeaders = {};

    try {
      const authResponse = await fetch(`${frontendUrl}/api/redis?key=backend_auth`);
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.exists && authData.value) {
          const parsedAuth = JSON.parse(authData.value);
          const accessToken = parsedAuth.access || parsedAuth.access_token;
          if (accessToken) {
            authHeaders = {
              'Authorization': `Bearer ${accessToken}`
            };
            console.log('[serverFetchData] Using auth token for backend request:', {
              tokenLength: accessToken.length,
              tokenStart: accessToken.substring(0, 20) + '...'
            });
          } else {
            console.log('[serverFetchData] No access token found in auth data:', Object.keys(parsedAuth));
          }
        }
      }
    } catch (authError) {
      console.error('[serverFetchData] Failed to get auth token:', authError);
    }

    // Подготавливаем заголовки с авторизацией
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers
    };

    // Выполняем запрос
    console.log('[serverFetchData] Making request to:', url.toString());
    console.log('[serverFetchData] Request headers:', Object.keys(requestHeaders));
    console.log('[serverFetchData] Request method:', method);

    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('[serverFetchData] Response status:', response.status);
    console.log('[serverFetchData] Response ok:', response.ok);

    if (response.ok) {
      const result = await response.json();
      console.log('[serverFetchData] Success result:', result);
      return result;
    }

    // Логируем детали ошибки
    const errorText = await response.text();
    console.error('[serverFetchData] Error response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    // Обрабатываем ошибки через серверный error handler
    await handleServerApiError(response, { redirectOnError, callbackUrl });
    return null;

  } catch (error) {
    if (error instanceof Response || error instanceof Error) {
      return handleServerApiError(error, { redirectOnError, callbackUrl });
    }
    throw new Error('Request failed');
  }
}
export async function fetchData<T>(
  endpoint: string,
  options: FetchDataOptions = {}
): Promise<T | null> {
  const {
    method = 'GET',
    body,
    params,
    redirectOnError = true,
    callbackUrl = '/login',
    domain = 'external',
    headers: customHeaders = {}
  } = options;

  try {
    let baseUrl: string;

    if (domain === 'internal') {
      // Для внутренних API Next.js
      baseUrl = typeof window !== 'undefined'
        ? window.location.origin  // В браузере используем текущий origin
        : process.env.NEXTAUTH_URL || 'http://localhost:3000'; // На сервере используем NEXTAUTH_URL
    } else {
      // Для внешних API (существующая логика)
      const authProvider = await getRedisData("auth_provider") || AuthProvider.MyBackendDocs;
      baseUrl = API_URLS[authProvider as AuthProvider];
    }

    const urlSearchParams = new URLSearchParams(params).toString();
    const url = `${baseUrl}/${endpoint}${urlSearchParams ? `?${urlSearchParams}` : ''}`;

    const buildHeaders = async (): Promise<Record<string, string>> => {
      const h: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders
      };
      const isPublicApi = endpoint.includes('/reference/') || endpoint.includes('/public/');
      if ((method !== 'POST' || endpoint !== 'api/auth/login') && !isPublicApi) {
        const authHeaders = await getAuthorizationHeaders();
        Object.assign(h, authHeaders);
      }
      return h;
    };

    // Первый запрос
    let response = await fetch(url, {
      method,
      headers: await buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache: 'no-store'
    });

    // Если не авторизован — пробуем авто-рефреш и один повтор
    if (response.status === 401) {
      const refreshed = await clientRefreshToken();
      if (refreshed) {
        // Повторяем запрос один раз с обновленными заголовками
        response = await fetch(url, {
          method,
          headers: await buildHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.ok) {
          return await response.json();
        }

        await handleApiError(response, { redirectOnError, callbackUrl, retryCount: 1 });
        return null;
      }

      await handleApiError(response, { redirectOnError, callbackUrl, retryCount: 1 });
      return null;
    }

    if (!response.ok) {
      throw response;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Response || error instanceof Error) {
      return handleApiError(error, { redirectOnError, callbackUrl });
    }
    throw new Error('Request failed');
  }
}

export const fetchAuth = async (
  url: string,
  body: Record<string, string>,
): Promise<AuthResponse> => {
  try {
    console.log("[Auth] Starting authentication request:", {
      url,
      body: { ...body, password: '***' } // Скрываем пароль в логах
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    console.log("[Auth] Response status:", response.status);

    const data = await response.json();
    console.log("[Auth] Response data structure:", {
      keys: Object.keys(data),
      hasAccess: Boolean(data.access || data.access_token),
      hasRefresh: Boolean(data.refresh || data.refresh_token)
    });

    if (!response.ok) {
      console.error("[Auth] Error response:", data);
      return {
        error: typeof data === "string" ? { message: data } : data,
      };
    }

    // Нормализуем формат токенов
    const tokens = {
      access: data.access || data.access_token,
      refresh: data.refresh || data.refresh_token,
    };

    console.log("[Auth] Normalized tokens:", {
      hasAccess: Boolean(tokens.access),
      hasRefresh: Boolean(tokens.refresh)
    });

    if (!tokens.access || !tokens.refresh) {
      console.error("[Auth] Missing tokens in response");
      return {
        error: {
          message: "Invalid token format in response",
          code: "INVALID_FORMAT",
        },
      };
    }

    return tokens;
  } catch (error) {
    console.error("[Auth] Critical error:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Authentication failed",
        code: "AUTH_ERROR",
      },
    };
  }
};

export const fetchRefresh = async (
  url: string,
  body: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!response.ok) return false;

    const data = await response.json();
    // Check both formats since we might get either Django or our format
    return Boolean(data.access_token || data.access);
  } catch (error) {
    console.error("Error during token refresh:", error);
    return false;
  }
};

export const fetchUsers = async (params?: Record<string, string>) => {
  try {
    const authProvider = (await getRedisData("auth_provider")) as AuthProvider;

    if (!authProvider) {
      console.warn("No auth provider found, defaulting to Backend");
      return fetchData("/api/auth/users", { params });
    }

    const endpoint =
      authProvider === AuthProvider.Dummy
        ? "users" // для DummyJSON
        : "api/auth/users"; // для Backend

    return fetchData(endpoint, { params });
  } catch (error) {
    console.error("Error in fetchUsers:", error);
    throw error;
  }
};

// Добавляем клиентскую версию функции обновления токена
export const clientRefreshToken = async (): Promise<boolean> => {
  try {
    console.log('[ClientRefresh] Starting token refresh process');

    // Получаем данные из Redis
    const response = await fetch('/api/redis?key=backend_auth');

    if (!response.ok) {
      console.error('[ClientRefresh] Failed to get data from Redis:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data || !data.value) {
      console.error('[ClientRefresh] No auth data in Redis');
      return false;
    }

    // Безопасно парсим данные
    let parsedData;
    try {
      parsedData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch (parseError) {
      console.error('[ClientRefresh] Error parsing auth data:', parseError);
      return false;
    }

    if (!parsedData || !parsedData.refresh) {
      console.error('[ClientRefresh] No refresh token in Redis data');
      return false;
    }

    // Проверяем количество попыток обновления
    const refreshAttempts = parsedData.refreshAttempts || 0;
    if (refreshAttempts >= 3) {
      console.error('[ClientRefresh] Maximum refresh attempts reached');
      return false;
    }

    // Получаем текущий провайдер аутентификации
    const providerResponse = await fetch('/api/redis?key=auth_provider');
    if (!providerResponse.ok) {
      console.error('[ClientRefresh] Failed to get auth provider from Redis');
      return false;
    }

    // Не используемые переменные
    // const providerData = await providerResponse.json();
    // const authProvider = providerData.value || 'backend';

    // Используем единый эндпоинт для обновления токена
    const refreshUrl = '/api/auth/refresh';

    console.log(`[ClientRefresh] Using refresh URL: ${refreshUrl}`);

    // Отправляем запрос на обновление токена через API роут
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: parsedData.refresh
      }),
      cache: 'no-store'
    });

    if (!refreshResponse.ok) {
      console.error('[ClientRefresh] Token refresh failed with status:', refreshResponse.status);

      // Увеличиваем счетчик попыток
      await fetch('/api/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'backend_auth',
          value: JSON.stringify({
            ...parsedData,
            refreshAttempts: refreshAttempts + 1
          })
        }),
      });

      return false;
    }

    // Токен успешно обновлен
    console.log('[ClientRefresh] Token refresh successful');

    // Гарантируем отправку события об успешном обновлении токена с увеличенной задержкой
    if (typeof window !== 'undefined') {
      // Увеличиваем задержку перед отправкой события
      setTimeout(() => {
        console.log('[ClientRefresh] Dispatching token-refreshed event');
        window.dispatchEvent(new CustomEvent('token-refreshed', {
          detail: {
            success: true,
            timestamp: new Date().toISOString()
          }
        }));
      }, 1500); // Увеличиваем задержку до 1.5 секунды
    }

    return true;
  } catch (error) {
    console.error('[ClientRefresh] Error during token refresh:', error);
    return false;
  }
};

// Функция для проверки наличия данных аутентификации в Redis
export const checkAuthData = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/redis?key=backend_auth&check=true');

    if (!response.ok) {
      console.error('[AuthCheck] Failed to check Redis data:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data.exists || !data.value) {
      console.error('[AuthCheck] No auth data in Redis');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[AuthCheck] Error checking auth data:', error);
    return false;
  }
};

/**
 * Универсальная функция для запросов с поддержкой разных доменов
 * Поддерживает как внешние API (бэкенд), так и внутренние API (Next.js)
 */
export async function fetchWithDomain<T>(
  endpoint: string,
  options: FetchWithDomainOptions = {}
): Promise<T | null> {
  const {
    method = 'GET',
    body,
    params,
    redirectOnError = true,
    callbackUrl = '/login',
    domain = 'external',
    headers: customHeaders = {}
  } = options;

  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_FETCH !== 'false' && process.env.NODE_ENV !== 'production';
  if (DEBUG) {
    console.log('==================================================');
    console.log('[fetchWithDomain] 🚀 Function called!');
    console.log('[fetchWithDomain] 📤 Endpoint:', endpoint);
    console.log('[fetchWithDomain] 📤 Method:', method);
    console.log('[fetchWithDomain] 📤 Domain:', domain);
    console.log('[fetchWithDomain] 📤 Body:', body);
    console.log('==================================================');
  }

  try {
    let baseUrl: string;

    if (domain === 'internal') {
      // Для внутренних API Next.js
      baseUrl = typeof window !== 'undefined'
        ? window.location.origin  // В браузере используем текущий origin
        : process.env.NEXTAUTH_URL || 'http://localhost:3000'; // На сервере используем NEXTAUTH_URL

      if (DEBUG) console.log(`[fetchWithDomain] Internal API: ${method} ${baseUrl}/${endpoint}`);
    } else {
      // Для внешних API (используем существующую логику)
      const authProvider = await getRedisData("auth_provider") || AuthProvider.MyBackendDocs;
      baseUrl = API_URLS[authProvider as AuthProvider];

      if (DEBUG) console.log(`[fetchWithDomain] External API: ${method} ${baseUrl}/${endpoint}`);
    }

    const urlSearchParams = new URLSearchParams(params).toString();
    const url = `${baseUrl}/${endpoint}${urlSearchParams ? `?${urlSearchParams}` : ''}`;

    const buildHeaders = async (): Promise<Record<string, string>> => {
      const h: Record<string, string> = { ...customHeaders };
      if (!(body instanceof FormData)) {
        h['Content-Type'] = 'application/json';
      }
      if (domain === 'external') {
        const isPublicApi = endpoint.includes('/reference/') || endpoint.includes('/public/');
        if ((method !== 'POST' || endpoint !== 'api/auth/login') && !isPublicApi) {
          const authHeaders = await getAuthorizationHeaders();
          Object.assign(h, authHeaders);
        }
      }
      return h;
    };

    if (DEBUG) {
      console.log('[fetchWithDomain] 🔄 Making fetch request...');
      console.log('[fetchWithDomain] 📤 URL:', url);
    }
    const initialHeaders = await buildHeaders();
    if (DEBUG) console.log('[fetchWithDomain] 📤 Headers:', initialHeaders);
    if (DEBUG) console.log('[fetchWithDomain] 📤 Body (stringified):', body ? (body instanceof FormData ? '[FormData]' : JSON.stringify(body)) : 'undefined');

    let response = await fetch(url, {
      method,
      headers: initialHeaders,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      credentials: domain === 'external' ? 'include' : undefined,
      cache: 'no-store'
    });

    if (DEBUG) {
      console.log('[fetchWithDomain] 📥 Response status:', response.status);
      console.log('[fetchWithDomain] 📥 Response ok:', response.ok);
    }

    if (response.status === 401) {
      const refreshed = await clientRefreshToken();
      if (refreshed) {
        const retryHeaders = await buildHeaders();
        response = await fetch(url, {
          method,
          headers: retryHeaders,
          body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
          credentials: domain === 'external' ? 'include' : undefined,
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          if (DEBUG) console.log(`[fetchWithDomain] ✅ Success after refresh - Response data:`, data);
          return data;
        }

        if (domain === 'external') {
          await handleApiError(response, { redirectOnError, callbackUrl, retryCount: 1 });
        }
        return null;
      }

      if (domain === 'external') {
        await handleApiError(response, { redirectOnError, callbackUrl, retryCount: 1 });
      }
      return null;
    }

    if (!response.ok) {
      if (DEBUG) console.error(`[fetchWithDomain] Error ${response.status}:`, response.statusText);
      if (domain === 'external') {
        await handleApiError(response, { redirectOnError, callbackUrl });
      }
      return null;
    }

    const data = await response.json();
    if (DEBUG) console.log(`[fetchWithDomain] ✅ Success - Response data:`, data);
    return data;

  } catch (error) {
    console.error(`[fetchWithDomain] ❌ Error:`, error);
    throw error;
  }
}