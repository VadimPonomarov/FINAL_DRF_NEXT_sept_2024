/**
 * Валідація та автоматичне оновлення токена
 *
 * ВАЖНО: Токены выдаются внешним API и непрозрачны (opaque).
 * Мы НЕ МОЖЕМ валидировать их напрямую.
 * Единственный способ узнать о невалидности - получить 401 от backend.
 *
 * Алгоритм:
 * 1. Проверяем наличие токенов в Redis (быстрая проверка)
 * 2. Если токенов нет → возвращаем false
 * 3. Если токены есть → пробуем refresh (если нужно)
 * 4. Основная валидация происходит в API interceptor при 401
 */

export interface TokenValidationResult {
  isValid: boolean;
  needsRedirect: boolean;
  redirectTo?: '/login' | '/api/auth/signin';
  message?: string;
}

/**
 * ЖЕСТКАЯ проверка наличия токенов в Redis
 * НЕ валидирует токены - только проверяет их наличие
 * ВАЖНО: При любых ошибках возвращаем false (нет токенов)
 */
async function checkTokensExist(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/token', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) return false;
    const data = await response.json();
    const hasAccess = !!(data?.access && typeof data.access === 'string' && data.access.trim().length > 0);
    console.log('[checkTokensExist] Tokens in cookies:', hasAccess);
    return hasAccess;
  } catch (error) {
    console.error('[checkTokensExist] Error:', error);
    return false;
  }
}

/**
 * ЖЕСТКАЯ проверка auth session через /api/auth/me
 * ВАЖНО: При любых ошибках возвращаем false (сессия невалидна)
 * Это обеспечивает жесткую безопасность - лучше лишний раз переавторизоваться
 */
async function checkAuthSession(): Promise<boolean> {
  try {
    console.log('[checkAuthSession] Checking session via /api/auth/me...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 сек timeout
    
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
        console.error('[checkAuthSession] ❌ Auth check failed:', response.status);
        return false;
      }

      const data = await response.json();
      const isValid = data.authenticated === true;
      console.log('[checkAuthSession] Session status:', isValid);
      return isValid;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[checkAuthSession] ❌ Request timeout');
      } else {
        console.error('[checkAuthSession] ❌ Network error:', fetchError?.message);
      }
      // При сетевых ошибках считаем сессию невалидной - безопаснее
      return false;
    }
  } catch (error) {
    console.error('[checkAuthSession] ❌ Unexpected error:', error);
    return false; // Жесткая безопасность
  }
}

/**
 * Спроба оновити токен
 * Экспортируем для использования в других модулях (например, apiInterceptor)
 */
export async function refreshToken(): Promise<boolean> {
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

function isTokenExpiredLocal(token: string, bufferSeconds = 60): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Math.floor(Date.now() / 1000) + bufferSeconds;
  } catch {
    return true;
  }
}

/**
 * Проверка токена с валидацией срока действия и авто-обновлением при истечении
 */
export async function validateAndRefreshToken(): Promise<TokenValidationResult> {
  console.log('[validateAndRefreshToken] Checking tokens in cookies...');

  try {
    const response = await fetch('/api/auth/token', { method: 'GET', cache: 'no-store', credentials: 'include' });
    if (!response.ok) {
      return { isValid: false, needsRedirect: true, redirectTo: '/login', message: 'Failed to reach token endpoint' };
    }

    const data = await response.json();
    const token: string | null = data.access || null;

    if (!token) {
      return { isValid: false, needsRedirect: true, redirectTo: '/login', message: 'No token in cookies' };
    }

    // Token is present and not expired
    if (!isTokenExpiredLocal(token)) {
      console.log('[validateAndRefreshToken] ✅ Token valid');
      return { isValid: true, needsRedirect: false, message: 'Token valid' };
    }

    // Token expired — try to refresh
    console.log('[validateAndRefreshToken] Token expired, refreshing...');
    const refreshed = await refreshToken();
    if (refreshed) {
      console.log('[validateAndRefreshToken] ✅ Token refreshed successfully');
      return { isValid: true, needsRedirect: false, message: 'Token refreshed' };
    }

    return { isValid: false, needsRedirect: true, redirectTo: '/login', message: 'Token expired and refresh failed' };
  } catch (error) {
    console.error('[validateAndRefreshToken] Error:', error);
    return { isValid: false, needsRedirect: true, redirectTo: '/login', message: 'Validation error' };
  }
}

/**
 * Быстрая проверка наличия токенов (без валидации)
 * Используется для быстрого определения наличия auth данных
 */
export async function quickTokenCheck(): Promise<boolean> {
  return await checkTokensExist();
}
