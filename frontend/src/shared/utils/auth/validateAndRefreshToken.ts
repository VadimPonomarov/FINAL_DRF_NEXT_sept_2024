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
    const response = await fetch('/api/redis?key=backend_auth', {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      const hasTokens = data?.exists === true && data?.value;
      console.log('[checkTokensExist] Redis check result:', hasTokens);
      return hasTokens;
    }

    // При любых ошибках Redis считаем что токенов НЕТ
    // Это безопаснее чем пропускать без проверки
    console.error('[checkTokensExist] ❌ Redis returned error:', response.status);
    return false;
  } catch (error) {
    // При сетевых ошибках также считаем что токенов НЕТ
    console.error('[checkTokensExist] ❌ Network error:', error);
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

/**
 * Проверка auth session с возможностью refresh
 * 
 * ВАЖНО: Это НЕ валидация токенов!
 * Мы только проверяем наличие сессии и токенов.
 * Реальная валидация токенов происходит в API interceptor при получении 401.
 */
export async function validateAndRefreshToken(): Promise<TokenValidationResult> {
  console.log('[validateAndRefreshToken] Starting session check...');

  // Шаг 1: Проверяем наличие токенов в Redis
  const tokensExist = await checkTokensExist();
  console.log(`[validateAndRefreshToken] Tokens exist in Redis: ${tokensExist}`);
  
  if (!tokensExist) {
    console.log('[validateAndRefreshToken] ❌ No tokens found, redirect needed');
    return {
      isValid: false,
      needsRedirect: true,
      redirectTo: '/login',
      message: 'No tokens found'
    };
  }

  // Шаг 2: Проверяем auth сессию (не валидацию токена!)
  const sessionValid = await checkAuthSession();
  console.log(`[validateAndRefreshToken] Auth session valid: ${sessionValid}`);
  
  if (sessionValid) {
    console.log('[validateAndRefreshToken] ✅ Session valid');
    return {
      isValid: true,
      needsRedirect: false,
    };
  }

  // Шаг 3: Сессия невалидна, пробуем refresh
  console.log('[validateAndRefreshToken] Session invalid, attempting refresh...');
  const refreshSuccess = await refreshToken().catch(() => false);
  console.log(`[validateAndRefreshToken] Refresh result: ${refreshSuccess}`);
  
  if (refreshSuccess) {
    console.log('[validateAndRefreshToken] ✅ Token refreshed successfully');
    return {
      isValid: true,
      needsRedirect: false,
      message: 'Token refreshed'
    };
  }

  // Шаг 4: Refresh не удался
  console.log('[validateAndRefreshToken] ❌ Refresh failed, redirect needed');
  return {
    isValid: false,
    needsRedirect: true,
    redirectTo: '/login',
    message: 'Session and refresh failed'
  };
}

/**
 * Быстрая проверка наличия токенов (без валидации)
 * Используется для быстрого определения наличия auth данных
 */
export async function quickTokenCheck(): Promise<boolean> {
  return await checkTokensExist();
}
