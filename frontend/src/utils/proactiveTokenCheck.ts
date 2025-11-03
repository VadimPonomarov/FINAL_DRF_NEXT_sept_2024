/**
 * Проактивная проверка и обновление токенов ПЕРЕД отправкой запроса
 * Цель: избежать 401 ошибок в консоли браузера
 */

interface TokenData {
  access: string;
  refresh: string;
  refreshAttempts?: number;
  lastRefreshTime?: number;
}

interface TokenCheckResult {
  isValid: boolean;
  needsRefresh: boolean;
  tokenData?: TokenData;
}

/**
 * Проверяет, истёк ли JWT токен
 */
function isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    // Добавляем буфер 5 минут - если токен истекает в ближайшие 5 минут, считаем его истёкшим
    return payload.exp < (currentTime + bufferSeconds);
  } catch (error) {
    console.error('[proactiveTokenCheck] Error parsing token:', error);
    return true; // Если не можем распарсить - считаем истёкшим
  }
}

/**
 * Получает токены из Redis
 */
async function getTokensFromRedis(): Promise<TokenData | null> {
  try {
    const origin = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Сначала определяем провайдер
    const providerResp = await fetch(`${origin}/api/redis?key=auth_provider`, {
      cache: 'no-store',
      credentials: 'include'
    });

    let authKey = 'backend_auth';
    if (providerResp.ok) {
      const providerData = await providerResp.json();
      if (providerData.exists && providerData.value === 'dummy') {
        authKey = 'dummy_auth';
      }
    }

    // Получаем токены
    const response = await fetch(`${origin}/api/redis?key=${authKey}`, {
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('[proactiveTokenCheck] No tokens in Redis');
      return null;
    }

    const data = await response.json();
    if (!data.exists || !data.value) {
      console.log('[proactiveTokenCheck] No token data in Redis');
      return null;
    }

    const tokenData = typeof data.value === 'string' 
      ? JSON.parse(data.value) 
      : data.value;

    return tokenData;
  } catch (error) {
    console.error('[proactiveTokenCheck] Error getting tokens from Redis:', error);
    return null;
  }
}

/**
 * Выполняет refresh токенов
 */
async function refreshTokens(): Promise<boolean> {
  try {
    const origin = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    console.log('[proactiveTokenCheck] Refreshing tokens...');
    
    const response = await fetch(`${origin}/api/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('[proactiveTokenCheck] Token refresh failed:', response.status);
      return false;
    }

    const data = await response.json();
    const success = data.success === true && !!data.access;
    
    if (success) {
      console.log('[proactiveTokenCheck] ✅ Tokens refreshed successfully');
    }
    
    return success;
  } catch (error) {
    console.error('[proactiveTokenCheck] Error refreshing tokens:', error);
    return false;
  }
}

/**
 * Проверяет токены и при необходимости обновляет их ПЕРЕД выполнением запроса
 * Возвращает true, если токены валидны и запрос можно выполнять
 */
export async function ensureValidTokens(): Promise<boolean> {
  try {
    // Получаем текущие токены из Redis
    const tokenData = await getTokensFromRedis();

    // Если токенов нет вообще - не можем продолжать
    if (!tokenData || !tokenData.access || !tokenData.refresh) {
      console.log('[proactiveTokenCheck] No tokens available');
      return false;
    }

    // Проверяем, не истёк ли access token
    const expired = isTokenExpired(tokenData.access);

    if (!expired) {
      console.log('[proactiveTokenCheck] Access token is valid');
      return true;
    }

    // Токен истёк - пробуем обновить
    console.log('[proactiveTokenCheck] Access token expired, refreshing...');
    const refreshed = await refreshTokens();

    if (!refreshed) {
      console.error('[proactiveTokenCheck] Failed to refresh tokens');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[proactiveTokenCheck] Error in ensureValidTokens:', error);
    return false;
  }
}

/**
 * Выполняет полную проверку токенов с детальной информацией
 */
export async function checkTokenStatus(): Promise<TokenCheckResult> {
  const tokenData = await getTokensFromRedis();

  if (!tokenData || !tokenData.access) {
    return {
      isValid: false,
      needsRefresh: true
    };
  }

  const expired = isTokenExpired(tokenData.access);

  return {
    isValid: !expired,
    needsRefresh: expired,
    tokenData
  };
}
