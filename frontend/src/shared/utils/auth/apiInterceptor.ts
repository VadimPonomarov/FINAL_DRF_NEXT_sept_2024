/**
 * Универсальный API Interceptor для автоматической обработки 401/403 ошибок
 * 
 * Функционал:
 * - Перехват всех 401/403 ошибок от backend API
 * - Автоматический refresh токенов при первой 401 ошибке
 * - Retry оригинального запроса с новым токеном
 * - Редирект на /login если refresh не удался
 * - Защита от циклических запросов refresh
 */

interface FetchOptions extends RequestInit {
  _retry?: boolean;
  _skipInterceptor?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Попытка обновить токены
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // Если уже идет refresh - ждем его завершения
  if (isRefreshing && refreshPromise) {
    console.log('[apiInterceptor] Refresh already in progress, waiting...');
    return await refreshPromise;
  }

  isRefreshing = true;
  console.log('[apiInterceptor] Starting token refresh...');

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[apiInterceptor] Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();
      const success = data.success === true;
      
      if (success) {
        console.log('[apiInterceptor] ✅ Token refreshed successfully');
      } else {
        console.error('[apiInterceptor] ❌ Token refresh returned success=false');
      }
      
      return success;
    } catch (error) {
      console.error('[apiInterceptor] ❌ Token refresh error:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return await refreshPromise;
}

/**
 * Редирект на страницу входа
 */
function redirectToLogin(currentUrl?: string) {
  if (typeof window === 'undefined') return;
  
  const callbackUrl = currentUrl || window.location.pathname + window.location.search;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  
  console.log('[apiInterceptor] Redirecting to login:', loginUrl);
  window.location.href = loginUrl;
}

/**
 * Обертка для fetch с автоматическим refresh при 401
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: FetchOptions
): Promise<Response> {
  // Если interceptor отключен для этого запроса - используем обычный fetch
  if (init?._skipInterceptor) {
    const { _skipInterceptor, ...cleanInit } = init;
    return fetch(input, cleanInit);
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  // Пропускаем interceptor для auth endpoints чтобы избежать циклов
  if (url.includes('/api/auth/') && !url.includes('/api/auth/me')) {
    return fetch(input, init);
  }

  console.log('[apiInterceptor] Fetching:', url);
  
  try {
    // Первая попытка запроса
    const response = await fetch(input, init);

    // Если запрос успешный - возвращаем ответ
    if (response.ok) {
      return response;
    }

    // Обрабатываем 401/403 ошибки
    if (response.status === 401 || response.status === 403) {
      console.warn(`[apiInterceptor] ⚠️ Received ${response.status} for:`, url);

      // Если это уже retry попытка - не пытаемся снова
      if (init?._retry) {
        console.error('[apiInterceptor] ❌ Retry failed, redirecting to login');
        redirectToLogin();
        return response;
      }

      // Пытаемся обновить токен
      const refreshSuccess = await attemptTokenRefresh();

      if (refreshSuccess) {
        // Повторяем оригинальный запрос с обновленным токеном
        console.log('[apiInterceptor] Retrying original request with refreshed token...');
        const retryResponse = await fetch(input, {
          ...init,
          _retry: true, // Помечаем как retry
        });

        if (retryResponse.ok) {
          console.log('[apiInterceptor] ✅ Retry successful');
        } else {
          console.error('[apiInterceptor] ❌ Retry failed with status:', retryResponse.status);
          if (retryResponse.status === 401 || retryResponse.status === 403) {
            redirectToLogin();
          }
        }

        return retryResponse;
      } else {
        // Refresh не удался - редирект на login
        console.error('[apiInterceptor] ❌ Token refresh failed, redirecting to login');
        redirectToLogin();
        return response;
      }
    }

    // Для других ошибок возвращаем ответ как есть
    return response;
  } catch (error) {
    console.error('[apiInterceptor] ❌ Fetch error:', error);
    throw error;
  }
}

/**
 * Хелпер для GET запросов с автоматическим refresh
 */
export async function fetchGetWithAuth(url: string, options?: FetchOptions): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    ...options,
  });
}

/**
 * Хелпер для POST запросов с автоматическим refresh
 */
export async function fetchPostWithAuth(
  url: string,
  data?: any,
  options?: FetchOptions
): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * Хелпер для PUT запросов с автоматическим refresh
 */
export async function fetchPutWithAuth(
  url: string,
  data?: any,
  options?: FetchOptions
): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PUT',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * Хелпер для DELETE запросов с автоматическим refresh
 */
export async function fetchDeleteWithAuth(url: string, options?: FetchOptions): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'DELETE',
    credentials: 'include',
    cache: 'no-store',
    ...options,
  });
}

/**
 * Проверка текущего статуса аутентификации
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; needsRefresh: boolean }> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        authenticated: data.authenticated === true,
        needsRefresh: false,
      };
    }

    if (response.status === 401) {
      return {
        authenticated: false,
        needsRefresh: true,
      };
    }

    return {
      authenticated: false,
      needsRefresh: false,
    };
  } catch (error) {
    console.error('[apiInterceptor] Auth status check failed:', error);
    return {
      authenticated: false,
      needsRefresh: false,
    };
  }
}
