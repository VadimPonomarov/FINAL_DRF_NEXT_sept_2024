/**
 * Универсальный wrapper для запросов с Bearer токенами
 * Проверяет валидность токена перед выполнением запроса
 * Если токен невалиден - возвращает ошибку без выполнения запроса
 */
export async function withBearerToken<T>(
  requestFn: () => Promise<T>,
  options?: {
    skipValidation?: boolean; // Для публичных эндпоинтов
    fallbackError?: T;
  }
): Promise<T> {
  const { skipValidation = false, fallbackError } = options || {};

  try {
    // Если это не публичный эндпоинт - проверяем токен
    if (!skipValidation) {
      console.log('[withBearerToken] Validating token before request...');
      
      // Проверяем валидность через /api/auth/me
      const validateResponse = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!validateResponse.ok) {
        console.log('[withBearerToken] Token validation failed - skipping request');
        if (fallbackError !== undefined) return fallbackError;
        throw new Error('TOKEN_VALIDATION_FAILED');
      }

      const validateData = await validateResponse.json();
      if (!validateData.authenticated) {
        console.log('[withBearerToken] Token not authenticated - skipping request');
        if (fallbackError !== undefined) return fallbackError;
        throw new Error('TOKEN_NOT_AUTHENTICATED');
      }
    }

    // Токен валиден - выполняем запрос
    console.log('[withBearerToken] Token valid - executing request...');
    return await requestFn();
    
  } catch (error) {
    console.error('[withBearerToken] Error:', error);
    
    // Если это ошибка валидации и есть fallback - возвращаем его
    if (
      (error instanceof Error && 
        (error.message === 'TOKEN_VALIDATION_FAILED' || 
         error.message === 'TOKEN_NOT_AUTHENTICATED')) &&
      fallbackError !== undefined
    ) {
      return fallbackError;
    }
    
    throw error;
  }
}

/**
 * Client-side wrapper для React Query
 */
export function createBearerTokenQuery<T>(
  queryFn: () => Promise<T>,
  options?: {
    skipValidation?: boolean;
    fallbackError?: T;
  }
) {
  return () => withBearerToken(queryFn, options);
}
