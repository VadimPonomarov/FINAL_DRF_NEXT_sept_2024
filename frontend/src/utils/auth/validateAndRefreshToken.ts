/**
 * Валидация и автоматический рефреш токена при входе в AutoRia
 * 
 * Логика:
 * 1. Проверяем наличие токенов в Redis
 * 2. Если токенов нет → возвращаем false (редирект на /login)
 * 3. Если токены есть → валидируем access token через /api/auth/me
 * 4. Если access невалиден → пробуем рефреш
 * 5. Если рефреш успешен → возвращаем true
 * 6. Если рефреш не помог → возвращаем false (редирект на /login)
 */

export interface TokenValidationResult {
  isValid: boolean;
  needsRedirect: boolean;
  redirectTo?: '/login' | '/api/auth/signin';
  message?: string;
}

/**
 * Проверка наличия токенов в Redis
 */
async function checkTokensExist(): Promise<boolean> {
  try {
    const response = await fetch('/api/redis?key=backend_auth', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data?.exists === true && data?.value;
  } catch (error) {
    console.error('[checkTokensExist] Error:', error);
    return false;
  }
}

/**
 * Валидация access токена через /api/auth/me
 * Теперь /api/auth/me валидирует токен через backend API
 */
async function validateAccessToken(): Promise<boolean> {
  try {
    console.log('[validateAccessToken] Checking token validity via /api/auth/me...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды таймаут
    
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[validateAccessToken] ❌ /api/auth/me returned:', response.status);
        return false;
      }

      const data = await response.json();
      const isValid = data.authenticated === true;
      console.log('[validateAccessToken] Token validity:', isValid);
      return isValid;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[validateAccessToken] ⚠️ Request timeout');
      } else {
        console.error('[validateAccessToken] Error:', fetchError.message);
      }
      return false;
    }
  } catch (error) {
    console.error('[validateAccessToken] Error:', error);
    return false;
  }
}

/**
 * Попытка рефреша токена
 */
async function refreshToken(): Promise<boolean> {
  try {
    console.log('[refreshToken] Attempting token refresh...');
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.log('[refreshToken] Refresh failed:', response.status);
      return false;
    }

    const data = await response.json();
    const success = data.success === true;
    console.log('[refreshToken] Refresh result:', success);
    return success;
  } catch (error) {
    console.error('[refreshToken] Error:', error);
    return false;
  }
}

/**
 * Полная валидация с автоматическим рефрешем
 */
export async function validateAndRefreshToken(): Promise<TokenValidationResult> {
  console.log('[validateAndRefreshToken] Starting validation...');

  // Шаг 1: Проверяем наличие токенов
  const tokensExist = await checkTokensExist();
  if (!tokensExist) {
    console.log('[validateAndRefreshToken] No tokens in Redis');
    return {
      isValid: false,
      needsRedirect: true,
      redirectTo: '/login',
      message: 'No backend tokens found'
    };
  }

  console.log('[validateAndRefreshToken] Tokens exist, validating access token...');

  // Шаг 2: Валидируем access токен
  const isAccessValid = await validateAccessToken();
  if (isAccessValid) {
    console.log('[validateAndRefreshToken] Access token is valid');
    return {
      isValid: true,
      needsRedirect: false,
    };
  }

  console.log('[validateAndRefreshToken] Access token invalid, attempting refresh...');

  // Шаг 3: Пробуем рефреш
  const refreshSuccess = await refreshToken();
  if (refreshSuccess) {
    console.log('[validateAndRefreshToken] Token refreshed successfully');
    return {
      isValid: true,
      needsRedirect: false,
      message: 'Token refreshed'
    };
  }

  console.log('[validateAndRefreshToken] Refresh failed, redirect needed');

  // Шаг 4: Рефреш не помог → редирект
  return {
    isValid: false,
    needsRedirect: true,
    redirectTo: '/login',
    message: 'Token refresh failed'
  };
}

/**
 * Упрощенная версия для быстрой проверки (без рефреша)
 */
export async function quickTokenCheck(): Promise<boolean> {
  const tokensExist = await checkTokensExist();
  if (!tokensExist) return false;

  return await validateAccessToken();
}
