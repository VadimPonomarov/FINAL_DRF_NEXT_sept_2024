/**
 * Валідація та автоматичне оновлення токена під час входу в AutoRia
 *
 * Алгоритм:
 * 1. Перевіряємо наявність токенів у Redis
 * 2. Якщо токенів немає → повертаємо false (редирект на /login)
 * 3. Якщо токени є → валідуємо access token через /api/auth/me
 * 4. Якщо access недійсний → пробуємо оновити
 * 5. Якщо оновлення успішне → повертаємо true
 * 6. Якщо оновлення не допомогло → повертаємо false (редирект на /login)
 */

export interface TokenValidationResult {
  isValid: boolean;
  needsRedirect: boolean;
  redirectTo?: '/login' | '/api/auth/signin';
  message?: string;
}

// У Docker-оточенні доступ до Redis здійснюється через внутрішній API.
// Якщо перевірка Redis недоступна (500/немає мережі), вважаємо що токени «умовно є»,
// щоб уникнути хибних редиректів і циклів. Явна відсутність лише при 200 і exists=false.
async function checkTokensExist(): Promise<boolean> {
  try {
    const response = await fetch('/api/redis?key=backend_auth', {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      return data?.exists === true && data?.value;
    }

    // На помилки інфраструктури реагуємо м’яко: не ініціюємо редирект
    if (response.status >= 500) {
      console.warn('[checkTokensExist] Redis endpoint error, assuming tokens exist to avoid loop');
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[checkTokensExist] Network error, assuming tokens exist to avoid loop');
    return true;
  }
}

/**
 * Валідація access-токена через /api/auth/me
 * Тепер /api/auth/me перевіряє токен через backend API
 */
async function validateAccessToken(): Promise<boolean> {
  try {
    console.log('[validateAccessToken] Checking token validity via /api/auth/me...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Тайм-аут 3 секунди
    
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
        // Недійсним вважаємо лише явний 401 від /auth/me
        if (response.status === 401) {
          console.log('[validateAccessToken] ❌ /api/auth/me returned 401');
          return false;
        }
        // Інші статуси (404/5xx) трактуємо як тимчасові проблеми → вважаємо токен дійсним
        console.log('[validateAccessToken] ⚠️ /api/auth/me returned non-401 status:', response.status, 'treating as valid');
        return true;
      }

      const data = await response.json();
      const isValid = data.authenticated === true;
      console.log('[validateAccessToken] Token validity:', isValid);
      return isValid;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[validateAccessToken] ⚠️ Request timeout, treating as valid');
      } else {
        console.error('[validateAccessToken] ⚠️ Network error, treating as valid:', fetchError?.message);
      }
      // За тайм-ауту/мережевої помилки не запускаємо редирект
      return true;
    }
  } catch (error) {
    console.error('[validateAccessToken] ⚠️ Unexpected error, treating as valid:', error);
    return true;
  }
}

/**
 * Спроба оновити токен
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

  // Крок 1: Швидка перевірка наявності (толерантна до помилок), далі валідація через /api/auth/me
  const tokensExist = await checkTokensExist();
  if (!tokensExist) {
    console.log('[validateAndRefreshToken] No backend tokens (will still try /api/auth/me)');
  }

  const isAccessValid = await validateAccessToken();
  if (isAccessValid) {
    console.log('[validateAndRefreshToken] Access token is valid');
    return {
      isValid: true,
      needsRedirect: false,
    };
  }

  console.log('[validateAndRefreshToken] Access token invalid, attempting refresh (if available)...');

  // Крок 3: Пробуємо оновити токен
  // У деяких збірках /api/auth/refresh може бути відсутній — пробуємо й тихо продовжуємо.
  const refreshSuccess = await refreshToken().catch(() => false);
  if (refreshSuccess) {
    console.log('[validateAndRefreshToken] Token refreshed successfully');
    return {
      isValid: true,
      needsRedirect: false,
      message: 'Token refreshed'
    };
  }

  console.log('[validateAndRefreshToken] Refresh failed, redirect needed');

  // Крок 4: Оновлення не допомогло → редирект
  return {
    isValid: false,
    needsRedirect: true,
    redirectTo: '/login',
    message: 'Token refresh failed or unavailable'
  };
}

/**
 * Спрощена версія для швидкої перевірки (без оновлення)
 */
export async function quickTokenCheck(): Promise<boolean> {
  const tokensExist = await checkTokensExist();
  if (!tokensExist) return false;

  return await validateAccessToken();
}
