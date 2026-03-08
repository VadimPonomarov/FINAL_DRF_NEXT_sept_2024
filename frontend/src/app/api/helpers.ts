import { API_URLS, AuthProvider } from "@/shared/constants/constants";
import { getAuthorizationHeaders } from "@/shared/constants/headers";
import { redirect } from "next/navigation";
import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import {
    IBackendAuthCredentials,
    AuthResponse
} from "@/shared/types/auth.interfaces";
import { apiGetSession, apiSetSession } from "../../lib/session-api";

// Use Redis only via API to avoid bundling Node 'net' in client
const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer 
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' 
      ? 'http://frontend:3000' 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000')
  : '';

const performRedirect = (target: string): never | Promise<never> => {
    if (__isServer) {
        redirect(target);
    }

    if (typeof window !== 'undefined') {
        window.location.href = target;
        return new Promise<never>(() => {});
    }

    throw new Error(`Cannot redirect to ${target}`);
};

// Normalize backend base URL to ensure no trailing "/" and no trailing "/api"
function normalizeBackendBase(url: string): string {
    try {
        if (!url) return 'http://localhost:8000';
        // Remove trailing slashes
        let u = url.trim().replace(/\/+$/, '');
        // If ends with /api (optionally with trailing slash), strip it
        u = u.replace(/\/(api)\/?$/i, '');
        return u;
    } catch {
        return 'http://localhost:8000';
    }
}

// Redis functions removed - now using cookies and sessions only

// Centralized error handler with improved retry logic
// Only logs 401/403 errors, ignores others during initialization
const handleFetchErrors = async (response: Response, key: string = "backend_auth", skipRedirect: boolean = false) => {
    if (!response.ok) {
        // Only log auth-related errors (401/403), ignore others during initialization
        if (response.status === 401 || response.status === 403) {
            console.warn(`[Auth Error ${response.status}] ${response.statusText}`);
        }

        switch (response.status) {
            case 401: {
                // Don't redirect if skipRedirect is true (during initialization)
                if (skipRedirect) {
                    return null;
                }
                
                console.log("[handleFetchErrors] Attempting token refresh...");
                const refreshResult = await fetchRefresh(key);
                if (!refreshResult) {
                    console.log("[handleFetchErrors] Refresh failed, redirecting to login...");
                    return performRedirect("/login");
                }
                console.log("[handleFetchErrors] Refresh successful");
                return null;
            }

            case 403:
                if (skipRedirect) {
                    return null;
                }
                console.warn("[handleFetchErrors] Access denied");
                return performRedirect("/login");

            case 404:
                // Silently ignore 404 during initialization
                return null;

            default:
                // Silently ignore other errors during initialization
                return null;
        }
    }

    return response.json();
};

// General function for executing requests
export const fetchData = async (
    endpoint: string,
    callbackUrl?: string,
    params?: Record<string, string>,
    retryCount = 0
): Promise<any> => {
    try {
        const urlSearchParams = new URLSearchParams(params).toString();
        const headers = await getAuthorizationHeaders();
        const url = `${endpoint}${urlSearchParams ? `?${urlSearchParams}` : ''}`;

        // Определяем ключ для токенов - используем сессию вместо Redis для auth provider
        // В новой схеме auth provider хранится в cookies, но для совместимости проверяем оба источника
        let authProvider = AuthProvider.MyBackendDocs;
        try {
          // Пытаемся получить auth provider из API endpoint (который читает cookies)
          const providerResponse = await fetch(`${__frontendBaseUrl}/api/auth/provider`, { cache: 'no-store' });
          if (providerResponse.ok) {
            const providerData = await providerResponse.json();
            authProvider = providerData.provider || AuthProvider.MyBackendDocs;
          }
        } catch (error) {
          console.warn('[fetchData] Failed to get auth provider from API, using default');
        }
        
        const tokenKey = authProvider === AuthProvider.Dummy ? "dummy_auth" : "backend_auth";

        const response = await fetch(url, {
            headers,
            method: "GET",
            cache: 'no-store' // Важно для серверных компонентов
        });

        const result = await handleFetchErrors(response, tokenKey);

        // If token refresh was needed and successful, retry the request once
        if (!result && response.status === 401 && retryCount === 0) {
            console.log('[fetchData] Token refreshed, retrying request (attempt 1/1)...');
            return fetchData(endpoint, callbackUrl, params, retryCount + 1);
        }

        // If we still get 401 after refresh, don't retry again
        if (!result && response.status === 401 && retryCount > 0) {
            console.error('[fetchData] Still got 401 after token refresh, stopping retry to prevent infinite loop');
            return performRedirect("/login");
        }

        return result;
    } catch (error) {
        console.error("Error executing request:", error);
        return null;
    }
};

// Function for refreshing tokens - теперь вызывает API endpoint
export const fetchRefresh = async (
  key: string = "backend_auth",
  maxAttempts: number = 3
): Promise<boolean> => {
  try {
    console.log(`[fetchRefresh] Starting token refresh for ${key}`);
    
    // Вызываем API endpoint для refresh
    const refreshUrl = `${__frontendBaseUrl}/api/auth/refresh`;
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`[fetchRefresh] API refresh failed: ${response.status}`);
      
      // Если 401 или 429, значит токен невалидный или слишком много попыток
      if (response.status === 401 || response.status === 429) {
        return false;
      }
      
      // Для других ошибок можно попробовать повторить
      return false;
    }

    const data = await response.json();
    console.log('[fetchRefresh] ✅ Token refresh successful via API');
    
    return data.success || false;
  } catch (error) {
    console.error('[fetchRefresh] Error during token refresh:', error);
    return false;
  }
};

// Helper functions for various requests
export const fetchUsers = async (params?: Record<string, string>) => {
  // Получаем auth provider из cookies через API
  let authProvider = AuthProvider.MyBackendDocs;
  try {
    const providerResponse = await fetch(`${__frontendBaseUrl}/api/auth/provider`, { cache: 'no-store' });
    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      authProvider = providerData.provider || AuthProvider.MyBackendDocs;
    }
  } catch (error) {
    console.warn('[fetchUsers] Failed to get auth provider, using default');
  }
  
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
  // Получаем auth provider из cookies через API
  let authProvider = AuthProvider.MyBackendDocs;
  try {
    const providerResponse = await fetch(`${__frontendBaseUrl}/api/auth/provider`, { cache: 'no-store' });
    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      authProvider = providerData.provider || AuthProvider.MyBackendDocs;
    }
  } catch (error) {
    console.warn('[fetchRecipes] Failed to get auth provider, using default');
  }
  
  const endpoint = authProvider === AuthProvider.Dummy ? '/recipes' : '/api/recipes/';
  return fetchData(endpoint, "/recipes", params);
};

export const fetchRecipeById = async (id: string) => {
  // Получаем auth provider из cookies через API
  let authProvider = AuthProvider.MyBackendDocs;
  try {
    const providerResponse = await fetch(`${__frontendBaseUrl}/api/auth/provider`, { cache: 'no-store' });
    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      authProvider = providerData.provider || AuthProvider.MyBackendDocs;
    }
  } catch (error) {
    console.warn('[fetchRecipeById] Failed to get auth provider, using default');
  }
  
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
      endpoint = `/api/auth/login/dummy`;
    } else {
      // Для клиента всегда используем прокси Next.js, чтобы избежать проблем домена/порта
      if (typeof window !== 'undefined') {
        endpoint = `/api/auth/login`;
      } else {
        // На сервере используем BACKEND_URL
        const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
        const backendUrl = normalizeBackendBase(rawBackendUrl);
        endpoint = `${backendUrl}/api/auth/login`;
      }
      console.log(`[fetchAuth] Using endpoint: ${endpoint}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    if (!response.ok) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch {}
      console.error(`[fetchAuth] Backend auth error ${response.status}: ${response.statusText}. Body:`, bodyText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('[fetchAuth] Login successful, tokens saved in cookies by API route');

    // Возвращаем объект, соответствующий типу AuthResponse
    return {
      access: isUsingDummyAuth ? data.accessToken : data.access,
      refresh: isUsingDummyAuth ? data.refreshToken : data.refresh,
      user: isUsingDummyAuth
        ? {
            id: data.id,
            email: data.email || `${data.username}@dummy.com`
          }
        : data.user
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