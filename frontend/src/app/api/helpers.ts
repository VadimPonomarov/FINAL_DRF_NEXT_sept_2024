import { API_URLS, AuthProvider } from "@/common/constants/constants";
import { getAuthorizationHeaders } from "@/common/constants/headers";

import { redirect } from "next/navigation";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import {
    IBackendAuthCredentials,
    AuthResponse
} from "@/common/interfaces/auth.interfaces";
import { resolveServiceUrl } from "@/utils/api/serviceUrlResolver";

// Use Redis only via API to avoid bundling Node 'net' in client
const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000') : '';

async function apiGetRedis(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${__frontendBaseUrl}/api/redis?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.exists ? (data.value as string) : null;
  } catch {
    return null;
  }
}

async function apiSetRedis(key: string, value: string): Promise<boolean> {
  try {
    const res = await fetch(`${__frontendBaseUrl}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Centralized error handler with improved retry logic
const handleFetchErrors = async (response: Response, key: string = "backend_auth") => {
  if (!response.ok) {
    const errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    console.error(errorMessage);

    switch (response.status) {
      case 401: {
        console.log("Error 401: Token not valid. Attempting to refresh...");
        const refreshResult = await fetchRefresh(key);
        if (!refreshResult) {
          console.log("Refresh failed after all attempts, redirecting to login...");
          redirect("/login");
        }
        // Return null to trigger a retry with new token
        return null;
      }

      case 403:
        console.log("Error 403: Access denied. Redirecting...");
        redirect("/login");
        break;

      case 404:
        console.log("Error 404: Resource not found. Redirecting...");
        redirect("/error");
        break;

      default:
        console.log(`Error ${response.status} occurred. Redirecting...`);
        redirect("/error");
        break;
    }
  }

  return response.json();
};

// General function for executing requests
const fetchData = async (
  endpoint: string,
  callbackUrl?: string,
  params?: Record<string, string>,
  retryCount = 0
) => {
  try {
    const urlSearchParams = new URLSearchParams(params).toString();
    const headers = await getAuthorizationHeaders();

    // Используем универсальный резолвер с приоритетной системой
    // 1. Redis Service Registry -> 2. Environment -> 3. Defaults
    const baseUrl = await resolveServiceUrl('backend', '', async (key: string) => {
      return await apiGetRedis(key.replace('service_registry:', ''));
    });

    // Определяем ключ для токенов (пока оставляем старую логику)
    const authProvider = (await apiGetRedis("auth_provider")) || AuthProvider.MyBackendDocs;

    // Определяем ключ для токенов в зависимости от провайдера
    const tokenKey = authProvider === AuthProvider.Dummy ? "dummy_auth" : "backend_auth";

    const url = `${baseUrl}${endpoint}${urlSearchParams ? `?${urlSearchParams}` : ''}`;
    console.log('Fetching data from:', url);

    const response = await fetch(url, {
      headers,
      method: "GET",
      credentials: 'include',
      cache: 'no-store' // Важно для серверных компонентов
    });

    const result = await handleFetchErrors(response, tokenKey);

    // If token refresh was needed and successful, retry the request once
    if (!result && response.status === 401 && retryCount === 0) {
      return fetchData(endpoint, callbackUrl, params, retryCount + 1);
    }

    return result;
  } catch (error) {
    console.error("Error executing request:", error);
    return null;
  }
};

// Function for refreshing tokens with retry logic
export const fetchRefresh = async (
  key: string = "backend_auth",
  maxAttempts: number = 3
): Promise<boolean> => {
  try {
    // Используем универсальный резолвер с приоритетной системой
    // 1. Redis Service Registry -> 2. Environment -> 3. Defaults
    const baseUrl = await resolveServiceUrl('backend', '', async (key: string) => {
      return await apiGetRedis(key.replace('service_registry:', ''));
    });

    const redisData = await apiGetRedis(key);
    if (!redisData) {
      console.error(`Refresh token not found in Redis for ${key}`);
      return false;
    }

    const redisDataString = typeof redisData === 'string' ? redisData : JSON.stringify(redisData);
    const parsedData = JSON.parse(redisDataString);
    const { refresh, refreshAttempts = 0 } = parsedData;

    if (!refresh) {
      console.error("No refresh token found in Redis data");
      return false;
    }

    // Проверяем, не превысили ли мы максимальное количество попыток
    if (refreshAttempts >= maxAttempts) {
      console.error(`Max refresh attempts (${maxAttempts}) reached for ${key}`);
      // Очищаем токены из Redis при превышении лимита попыток
      await apiSetRedis(key, JSON.stringify({ refreshAttempts: maxAttempts }));
      return false;
    }

    // Увеличиваем счетчик попыток
    const newAttempts = refreshAttempts + 1;
    console.log(`Token refresh attempt ${newAttempts}/${maxAttempts} for ${key}`);

    // Сохраняем увеличенный счетчик попыток
    await apiSetRedis(key, JSON.stringify({
      ...parsedData,
      refreshAttempts: newAttempts
    }));

    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
      credentials: 'include',
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Failed to refresh token. Status: ${response.status}, Attempt: ${newAttempts}/${maxAttempts}`);

      // Если это последняя попытка, логируем это
      if (newAttempts >= maxAttempts) {
        console.error(`All ${maxAttempts} refresh attempts failed for ${key}`);
      }

      return false;
    }

    const data = await response.json();

    // При успешном обновлении сбрасываем счетчик попыток
    await apiSetRedis(key, JSON.stringify({
      access: data.access,
      refresh: data.refresh,
      refreshAttempts: 0 // Сбрасываем счетчик при успехе
    }));

    console.log(`Token refresh successful for ${key}, attempts reset to 0`);
    return true;
  } catch (error) {
    console.error("Error during token refresh:", error);
    return false;
  }
};

// Helper functions for various requests
export const fetchUsers = async (params?: Record<string, string>) => {
  const authProvider = await apiGetRedis("auth_provider") || AuthProvider.MyBackendDocs;
  const endpoint = authProvider === AuthProvider.Dummy ? '/users' : '/api/users/';
  const response = await fetchData(endpoint, "/users", params);

  if (!response) return null;

  // Преобразуем ответ в единый формат
  if (authProvider === AuthProvider.Dummy) {
    // Формат DummyJSON: { users: [], total: number, ... }
    return response;
  } else {
    // Формат Backend: { results: [], count: number, ... }
    return {
      users: response.results,
      total: response.count,
      skip: Number(params?.skip) || 0,
      limit: Number(params?.limit) || 30
    };
  }
};

export const fetchRecipes = async (params?: Record<string, string>) => {
  const authProvider = await apiGetRedis("auth_provider") || AuthProvider.MyBackendDocs;
  const endpoint = authProvider === AuthProvider.Dummy ? '/recipes' : '/api/recipes/';
  return fetchData(endpoint, "/recipes", params);
};

export const fetchRecipeById = async (id: string) => {
  const authProvider = await apiGetRedis("auth_provider") || AuthProvider.MyBackendDocs;
  const endpoint = authProvider === AuthProvider.Dummy ? `/recipes/${id}` : `/api/recipes/${id}/`;
  return fetchData(endpoint);
};

// Function for authentication
export const fetchAuth = async (
  credentials: IDummyAuth | IBackendAuthCredentials
): Promise<AuthResponse> => {
  console.log('[fetchAuth] Function called with credentials:', credentials);
  try {
    const isDummyAuth = (
      cred: IDummyAuth | IBackendAuthCredentials
    ): cred is IDummyAuth => {
      return "username" in cred;
    };

    // Определяем тип аутентификации один раз
    const isUsingDummyAuth = isDummyAuth(credentials);
    console.log(`[fetchAuth] Auth type: ${isUsingDummyAuth ? 'Dummy' : 'Backend'}, credentials:`, credentials);

    // Формируем endpoint с использованием Service Registry для backend
    let endpoint: string;
    if (isUsingDummyAuth) {
      endpoint = `${API_URLS[AuthProvider.Dummy]}/auth/login`;
    } else {
      // Используем NEXT_PUBLIC_BACKEND_URL напрямую для большей надежности
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
      endpoint = `${backendUrl}/api/auth/login`;
      console.log(`[fetchAuth] Using endpoint: ${endpoint}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Сохраняем токены в Redis с обнулением счетчика попыток
    const redisKey = isUsingDummyAuth ? "dummy_auth" : "backend_auth";
    const tokenData = isUsingDummyAuth
      ? {
          access: data.accessToken,
          refresh: data.refreshToken,
          refreshAttempts: 0
        }
      : {
          access: data.access,
          refresh: data.refresh,
          refreshAttempts: 0
        };

    console.log(`[fetchAuth] Saving tokens to Redis with key: ${redisKey}`);

    // Get absolute URL for Redis API (server-side needs absolute URLs)
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer
      ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000')
      : ''; // На клиенте используем относительный URL
    const redisUrl = `${baseUrl}/api/redis`;
    console.log(`[fetchAuth] Using Redis URL: ${redisUrl} (server: ${isServer})`);

    // Сохраняем провайдер в Redis
    const providerKey = "auth_provider";
    const providerValue = isUsingDummyAuth ? AuthProvider.Dummy : AuthProvider.MyBackendDocs;
    console.log(`[fetchAuth] Saving provider to Redis: ${providerValue}`);

    const providerResponse = await fetch(redisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: providerKey,
        value: providerValue
      }),
    });

    if (!providerResponse.ok) {
      console.error(`[fetchAuth] Failed to save provider to Redis: ${providerResponse.status}`);
    } else {
      console.log(`[fetchAuth] ✅ Provider saved to Redis successfully`);
    }

    // Сохраняем токены в Redis
    const redisResponse = await fetch(redisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: redisKey,
        value: JSON.stringify(tokenData)
      }),
    });

    console.log(`[fetchAuth] Redis save response status: ${redisResponse.status}`);
    let redisSaveSuccess = false;

    if (!redisResponse.ok) {
      console.error(`[fetchAuth] Failed to save tokens to Redis: ${redisResponse.status} ${redisResponse.statusText}`);
      try {
        const errorData = await redisResponse.json();
        console.error(`[fetchAuth] Redis error data:`, errorData);
      } catch (e) {
        console.error(`[fetchAuth] Could not parse Redis error response`);
      }
    } else {
      console.log(`[fetchAuth] ✅ Redis API returned success`);

      // Verify tokens were actually saved by reading them back
      console.log(`[fetchAuth] Verifying tokens were actually saved...`);
      try {
        const verifyUrl = `${baseUrl}/api/redis?key=${encodeURIComponent(redisKey)}`;
        console.log(`[fetchAuth] Using verify URL: ${verifyUrl}`);

        const verifyResponse = await fetch(verifyUrl);
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData.exists && verifyData.value) {
            const savedTokenData = JSON.parse(verifyData.value);
            redisSaveSuccess = !!(savedTokenData.access && savedTokenData.refresh);
            console.log(`[fetchAuth] Token verification result: ${redisSaveSuccess}`);
          } else {
            console.error(`[fetchAuth] Verification failed: tokens not found in Redis`);
          }
        } else {
          console.error(`[fetchAuth] Verification failed: Redis API error ${verifyResponse.status}`);
        }
      } catch (verifyError) {
        console.error(`[fetchAuth] Verification failed with error:`, verifyError);
      }
    }

    // Возвращаем объект, соответствующий типу AuthResponse
    return {
      access: isUsingDummyAuth ? data.accessToken : data.access,
      refresh: isUsingDummyAuth ? data.refreshToken : data.refresh,
      user: isUsingDummyAuth
        ? {
            id: data.id,
            email: data.email
          }
        : data.user,
      redisSaveSuccess: redisSaveSuccess // Добавляем информацию о сохранении в Redis
    };
  } catch (error) {
    console.error('[fetchAuth] Error occurred:', error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Authentication failed"
      }
    };
  }
};