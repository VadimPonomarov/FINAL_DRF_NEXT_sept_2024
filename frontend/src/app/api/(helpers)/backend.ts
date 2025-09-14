import { AuthApiResponse } from "@/common/interfaces/api.interfaces";
import { IBackendAuthCredentials } from "@/common/interfaces/auth.interfaces";
import { AuthProvider } from "@/common/constants/constants";
import SimpleUrlResolver from "@/utils/api/simpleUrlResolver";
import { apiClient } from "@/services/api/apiClient";

const getAbsoluteUrl = (path: string): string => {
  if (typeof window === 'undefined') {
    // Серверная сторона: используем правильный URL фронтенда
    const isDocker = process.env.IS_DOCKER === 'true';
    let baseUrl: string;

    if (isDocker) {
      // В Docker используем имя сервиса
      baseUrl = process.env.NEXTAUTH_URL || 'http://frontend:3000';
    } else {
      // Локально используем localhost с правильным портом
      const frontendPort = process.env.FRONTEND_PORT || '3000';
      baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${frontendPort}`;
    }

    console.log('[getAbsoluteUrl] Server-side URL:', `${baseUrl}${path}`);
    console.log('[getAbsoluteUrl] Environment: Docker =', isDocker);
    return `${baseUrl}${path}`;
  }

  // Клиентская сторона: используем текущий origin
  console.log('[getAbsoluteUrl] Client-side URL:', `${window.location.origin}${path}`);
  return `${window.location.origin}${path}`;
};

export const backendApiHelpers = {
  // Новый метод аутентификации с использованием API клиента
  authWithClient: async (credentials: IBackendAuthCredentials): Promise<AuthApiResponse> => {
    try {
      console.log('[Auth] Using new API client for authentication');

      const data = await apiClient.auth(credentials);

      console.log('[Auth] API client response:', {
        hasAccess: !!data.access,
        hasRefresh: !!data.refresh,
        hasUser: !!data.user
      });

      // Сохраняем токены в Redis
      const redisUrl = getAbsoluteUrl('/api/redis');
      const redisPayload = {
        key: "backend_auth",
        value: JSON.stringify({
          access: data.access,
          refresh: data.refresh,
          user: data.user,
          refreshAttempts: 0
        })
      };

      const redisResponse = await fetch(redisUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redisPayload),
      });

      if (!redisResponse.ok) {
        console.warn('[Auth] Failed to save to Redis, but continuing');
      }

      // Сохраняем провайдер
      const providerUrl = getAbsoluteUrl('/api/redis');
      await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "auth_provider",
          value: AuthProvider.MyBackendDocs
        }),
      });

      // Получаем полную информацию о пользователе с токеном и сохраняем под ключом "me"
      if (data.access) {
        try {
          console.log('[Auth] Fetching user profile with token...');

          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
          const profileResponse = await fetch(`${backendUrl}/api/users/profile/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.access}`
            }
          });

          if (profileResponse.ok) {
            const userProfile = await profileResponse.json();
            console.log('[Auth] User profile retrieved:', {
              id: userProfile.id,
              email: userProfile.email,
              is_staff: userProfile.is_staff,
              is_superuser: userProfile.is_superuser
            });

            // Сохраняем полную информацию о пользователе под ключом "me"
            await fetch(getAbsoluteUrl('/api/redis'), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: "me",
                value: JSON.stringify(userProfile),
                expiration: 3600 * 24 // 24 часа
              }),
            });
            console.log('[Auth] Full user profile saved to Redis under key "me"');
          } else {
            console.warn('[Auth] Failed to fetch user profile:', profileResponse.status);
            // Fallback: сохраняем базовую информацию из токена
            if (data.user) {
              await fetch(getAbsoluteUrl('/api/redis'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key: "me",
                  value: JSON.stringify(data.user),
                  expiration: 3600 * 24
                }),
              });
            }
          }
        } catch (meError) {
          console.warn('[Auth] Failed to fetch/save user profile under "me" key:', meError);
        }
      }

      return {
        data: {
          access: data.access,
          refresh: data.refresh,
          user: data.user
        },
        status: 200,
        message: 'Authentication successful'
      };
    } catch (error) {
      console.error('[Auth] API client error:', error);
      return {
        data: {
          access: '',
          refresh: ''
        },
        status: 500,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  },

  // Helper function for fetch with timeout
  fetchWithTimeout: async (url: string, credentials: IBackendAuthCredentials): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
        cache: 'no-store',
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[Auth] Fetch error:', fetchError);
      throw fetchError;
    }
  },
  auth: async (credentials: IBackendAuthCredentials): Promise<AuthApiResponse> => {
    try {
      // Используем упрощенную систему определения URL на основе переменных среды
      const loginUrl = SimpleUrlResolver.getBackendUrl('/api/auth/login');

      // Логируем информацию о запросе и окружении
      console.log('[Auth] Using SimpleUrlResolver for backend URL');
      SimpleUrlResolver.logConfig();
      console.log('[Auth] Attempting login request to:', loginUrl);
      console.log('[Auth] With credentials:', {
        email: credentials.email,
        password: '***' // Не логируем реальный пароль
      });

      // Логируем переменные окружения для отладки
      console.log('[Auth] Environment variables:');
      console.log(`  IS_DOCKER: ${process.env.IS_DOCKER}`);
      console.log(`  NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);
      console.log(`  NEXT_PUBLIC_WS_HOST: ${process.env.NEXT_PUBLIC_WS_HOST}`);
      console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);

      console.log('[Auth] Making fetch request with credentials:', {
        email: credentials.email,
        password: '[HIDDEN]'
      });

      // Use direct fetch instead of this.fetchWithTimeout to avoid 'this' binding issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        // Используем только email и password для внешнего API
        const requestBody = {
          email: credentials.email,
          password: credentials.password
        };

        console.log('[Auth] Sending request to:', loginUrl);
        console.log('[Auth] With body:', JSON.stringify({
          email: credentials.email,
          password: '[HIDDEN]'
        }));

        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          cache: 'no-store',
          credentials: 'include',
          mode: 'cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

      // Check if the response is valid
      if (!response.ok) {
        console.error('[Auth] Login failed with status:', response.status);

        try {
          // Get the raw error response for debugging
          const errorText = await response.text();
          console.error('[Auth] Raw error response:', errorText);

          let errorData;
          try {
            // Try to parse as JSON
            errorData = JSON.parse(errorText);
            console.error('[Auth] Error details:', errorData);
          } catch (parseError) {
            console.error('[Auth] Error response is not valid JSON:', parseError);
            errorData = { detail: errorText };
          }

          return {
            data: {
              access: '',
              refresh: ''
            },
            status: response.status,
            message: errorData.detail || errorData.message || `Login failed with status: ${response.status}`
          };
        } catch (readError) {
          console.error('[Auth] Failed to read error response:', readError);
          throw new Error(`Login failed with status: ${response.status}`);
        }
      }

        let data;
        try {
          // Log the raw response for debugging
          const responseText = await response.text();
          console.log('[Auth] Raw response text:', responseText);

          try {
            // Try to parse the response as JSON
            data = JSON.parse(responseText);
            console.log('[Auth] Login response status:', response.status);
            console.log('[Auth] Login response data structure:', {
              hasAccess: !!data.access,
              hasRefresh: !!data.refresh,
              hasUser: !!data.user,
              accessLength: data.access ? data.access.length : 0,
              refreshLength: data.refresh ? data.refresh.length : 0,
              userKeys: data.user ? Object.keys(data.user) : [],
              allKeys: Object.keys(data)
            });

            // Нормализуем поля токенов для совместимости с разными форматами JWT
            if (data.access_token && !data.access) {
              data.access = data.access_token;
            }
            if (data.refresh_token && !data.refresh) {
              data.refresh = data.refresh_token;
            }
          } catch (parseError) {
            console.error('[Auth] Failed to parse response as JSON:', parseError);
            throw new Error('Invalid response format from server: ' + responseText.substring(0, 100));
          }
        } catch (jsonError) {
          console.error('[Auth] Failed to read response text:', jsonError);
          throw new Error('Failed to read response from server');
        }

        // Проверяем, что у нас есть токены для сохранения
        if (!data.access || !data.refresh) {
          console.error('[Auth] ❌ Missing tokens in response data');
          console.error('[Auth] Response data:', {
            hasAccess: !!data.access,
            hasRefresh: !!data.refresh,
            hasUser: !!data.user,
            allKeys: Object.keys(data)
          });
          throw new Error('Missing access or refresh token in response');
        }

        // Сохраняем в Redis (токены будут проверены внешними сервисами)
        const redisUrl = getAbsoluteUrl('/api/redis');
        console.log('[Auth] Saving auth data to Redis:', redisUrl);

        const redisPayload = {
          key: "backend_auth",
          value: JSON.stringify({
            access: data.access,      // Используем правильные поля из Django JWT
            refresh: data.refresh,    // Используем правильные поля из Django JWT
            user: data.user,          // Сохраняем информацию о пользователе
            refreshAttempts: 0
          })
        };
        console.log('[Auth] Redis payload:', {
          ...redisPayload,
          value: '[HIDDEN]' // Не логируем токены
        });

        const redisResponse = await fetch(redisUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(redisPayload),
        });

        console.log('[Auth] Redis save response status:', redisResponse.status);

        let redisResponseData;
        try {
          redisResponseData = await redisResponse.json();
          console.log('[Auth] Redis save response data:', redisResponseData);
        } catch (e) {
          console.error('[Auth] Failed to parse Redis response as JSON:', e);
          try {
            const responseText = await redisResponse.text();
            console.error('[Auth] Redis response text:', responseText);
          } catch (textError) {
            console.error('[Auth] Failed to read Redis response as text:', textError);
          }
        }

        if (!redisResponse.ok) {
          console.error('[Auth] ❌ Failed to save to Redis');
          console.error('[Auth] Redis response status:', redisResponse.status);
          console.error('[Auth] Redis response statusText:', redisResponse.statusText);
          if (redisResponseData) {
            console.error('[Auth] Redis response data:', redisResponseData);
          }
          // Не прерываем процесс, но логируем ошибку
        } else {
          console.log('[Auth] ✅ Successfully saved tokens to Redis');
          console.log('[Auth] Redis response data:', redisResponseData);

          // Дополнительная проверка, что Redis действительно сохранил данные
          if (redisResponseData && redisResponseData.success !== false) {
            console.log('[Auth] ✅ Redis confirmed successful save');
          } else {
            console.warn('[Auth] ⚠️ Redis response indicates potential save issue:', redisResponseData);
          }
        }

        // Возвращаем данные для сессионной аутентификации
        // Токены сохранены в Redis для использования в API запросах
        const finalResult = {
          data: {
            access: data.access,
            refresh: data.refresh,
            user: data.user
          },
          status: response.status,
          message: 'Authentication successful'
        };

        console.log('[Auth] Final result structure:', {
          hasData: !!finalResult.data,
          dataHasAccess: !!finalResult.data?.access,
          dataHasRefresh: !!finalResult.data?.refresh,
          dataHasUser: !!finalResult.data?.user,
          status: finalResult.status,
          message: finalResult.message
        });

        return finalResult;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('[Auth] Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('[Auth] Unexpected error:', error);

      // Check if it's an AbortError (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          data: {
            access: '',
            refresh: ''
          },
          status: 408,
          message: 'Authentication request timed out. The backend server might not be running or is not responding.'
        };
      }

      // Handle other errors
      return {
        data: {
          access: '',
          refresh: ''
        },
        status: 500,
        message: error instanceof Error ? error.message : 'Authentication failed due to an unexpected error'
      };
    }
  },

  refresh: async (): Promise<boolean> => {
    try {
      console.log('[Refresh] Starting token refresh process');

      // Получаем данные из Redis, используя ключ backend_auth
      const redisGetUrl = getAbsoluteUrl('/api/redis?key=backend_auth');
      console.log('[Refresh] Getting auth data from Redis:', redisGetUrl);

      const response = await fetch(redisGetUrl);
      console.log('[Refresh] Redis get response status:', response.status);

      if (!response.ok) {
        console.error('[Refresh] Failed to get data from Redis');
        return false;
      }

      const data = await response.json();

      if (!data || typeof data !== 'object' || !('value' in data)) {
        console.error('[Refresh] Invalid Redis response format:', data);
        return false;
      }

      const { value: authData } = data;
      console.log('[Refresh] Got data from Redis:', authData ? 'Data present' : 'No data');

      if (!authData) {
        console.error('[Refresh] No auth data in Redis');
        return false;
      }

      // Безопасно парсим данные
      let parsedData: Record<string, unknown>;
      try {
        parsedData = typeof authData === 'string' ? JSON.parse(authData) : authData;

        if (!parsedData || typeof parsedData !== 'object') {
          console.error('[Refresh] Invalid auth data format:', parsedData);
          return false;
        }
      } catch (parseError) {
        console.error('[Refresh] Error parsing auth data:', parseError);
        return false;
      }

      if (!('refresh' in parsedData) || !parsedData.refresh) {
        console.error('[Refresh] No refresh token in Redis data');
        return false;
      }

      // Проверяем количество попыток обновления
      const refreshAttempts = 'refreshAttempts' in parsedData ? Number(parsedData.refreshAttempts) : 0;
      if (refreshAttempts >= 3) { // Увеличиваем максимальное количество попыток с 1 до 3
        console.error('[Refresh] Maximum refresh attempts reached, redirecting to login');
        // Очищаем данные в Redis, так как токен в черном списке
        const redisClearUrl = getAbsoluteUrl('/api/redis');
        await fetch(redisClearUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "backend_auth",
            value: JSON.stringify({
              access: "",
              refresh: "",
              refreshAttempts: 0
            })
          }),
        });

        // Перенаправляем на страницу входа, если мы в браузере
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-expired', {
            detail: { message: 'Your session has expired. Please log in again.' }
          }));
        }

        return false;
      }

      // Проверяем, что refresh токен действительно строка
      if (typeof parsedData.refresh !== 'string') {
        console.error('[Refresh] Refresh token is not a string:', typeof parsedData.refresh);
        return false;
      }

      // Обновляем токен на бэкенде
      // Определяем правильный URL в зависимости от среды
      const backendUrl = typeof window === 'undefined'
        ? (process.env.BACKEND_URL || 'http://app:8000')  // Server-side: используем внутренний Docker URL
        : (process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs]); // Client-side: используем публичный URL
      const refreshUrl = `${backendUrl}/api/auth/refresh`;
      console.log('[Refresh] Requesting new token from:', refreshUrl);
      console.log('[Refresh] Refresh token type:', typeof parsedData.refresh);
      console.log('[Refresh] Refresh token length:', parsedData.refresh ? parsedData.refresh.length : 0);
      console.log('[Refresh] Refresh token present:', !!parsedData.refresh);

      // Добавляем таймаут для запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Пробуем отправить запрос с refresh токеном в теле
        console.log('[Refresh] Sending refresh request to backend');

        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            refresh: parsedData.refresh
          }),
          cache: 'no-store',
          credentials: 'include',
          mode: 'cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('[Refresh] Token refresh response status:', refreshResponse.status);

        if (!refreshResponse.ok) {
          console.error('[Refresh] Token refresh failed with status:', refreshResponse.status);
          try {
            const errorText = await refreshResponse.text();
            console.error('[Refresh] Raw error response:', errorText);

            // Попробуем распарсить ответ как JSON, если это возможно
            try {
              const errorJson = JSON.parse(errorText);
              console.error('[Refresh] Error JSON:', errorJson);

              // Проверяем, есть ли в ответе информация о формате запроса
              if (errorJson.detail && typeof errorJson.detail === 'string') {
                console.error('[Refresh] Error detail:', errorJson.detail);
              }

              // Проверяем другие поля ошибки
              if (errorJson.message) {
                console.error('[Refresh] Error message:', errorJson.message);
              }

              if (errorJson.code) {
                console.error('[Refresh] Error code:', errorJson.code);
              }
            } catch (parseError) {
              // Если не удалось распарсить как JSON, просто логируем текст
              console.error('[Refresh] Error is not valid JSON:', parseError);
            }

            // Если токен в черном списке или недействителен, увеличиваем счетчик попыток
            if (refreshResponse.status === 401) {
              console.log('[Refresh] Token is invalid or blacklisted, incrementing attempts');
              const redisClearUrl = getAbsoluteUrl('/api/redis');
              await fetch(redisClearUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key: "backend_auth",
                  value: JSON.stringify({
                    access: "",
                    refresh: parsedData.refresh, // Сохраняем refresh токен
                    refreshAttempts: refreshAttempts + 1
                  })
                }),
              });

              // Если это последняя попытка, отправляем событие
              if (refreshAttempts + 1 >= 3) {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('auth-expired', {
                    detail: { message: 'Your session has expired. Please log in again.' }
                  }));
                }
              }
            }
          } catch {
            console.error('[Refresh] Could not get error details');
          }
          return false;
        }

        // Get the raw response for debugging
        const responseText = await refreshResponse.text();
        console.log('[Refresh] Response received, parsing...');

        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('[Refresh] Refresh response data received:', {
            ...responseData,
            access: responseData.access ? '[HIDDEN]' : undefined,
            refresh: responseData.refresh ? '[HIDDEN]' : undefined
          });

          if (!responseData || typeof responseData !== 'object') {
            console.error('[Refresh] Invalid refresh response format');
            return false;
          }

          if (!('access' in responseData) || !('refresh' in responseData)) {
            console.error('[Refresh] Missing tokens in refresh response:', Object.keys(responseData));
            return false;
          }
        } catch (parseError) {
          console.error('[Refresh] Failed to parse response as JSON:', parseError);
          console.error('[Refresh] Response text:', responseText);
          return false;
        }

        console.log('[Refresh] Got new tokens successfully');

        // Обновляем токены в Redis
        const redisSaveUrl = getAbsoluteUrl('/api/redis');
        console.log('[Refresh] Saving new tokens to Redis:', redisSaveUrl);

        const saveResponse = await fetch(redisSaveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "backend_auth",
            value: JSON.stringify({
              access: responseData.access,
              refresh: responseData.refresh,
              refreshAttempts: 0 // Сбрасываем счетчик попыток при успешном обновлении
            })
          }),
        });

        console.log('[Refresh] Redis save response status:', saveResponse.status);

        if (!saveResponse.ok) {
          console.error('[Refresh] Failed to save new tokens to Redis');
          return false;
        }

        // Отправляем событие об успешном обновлении токена
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('token-refreshed', {
            detail: { success: true }
          }));
        }

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[Refresh] Request timed out after 10 seconds');
        } else {
          console.error('[Refresh] Fetch error:', fetchError);
        }
        return false;
      }
    } catch (error) {
      console.error("[Refresh] Unexpected error:", error);
      return false;
    }
  }
};