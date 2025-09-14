"use client";

/**
 * Получает токен аутентификации из Redis через API
 * @returns Объект с токенами доступа и обновления
 */
export const getAuthTokens = async (): Promise<{ access: string; refresh: string } | null> => {
  try {
    // Запрос к API для получения токенов из Redis
    const response = await fetch('/api/auth/token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[tokenService] Failed to get tokens: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[tokenService] Error getting tokens:', error);
    return null;
  }
};

/**
 * Обновляет токен доступа через API с двухэтапной проверкой
 * @returns Объект с токеном и информацией о верификации или null в случае ошибки
 */
export const refreshAccessToken = async (): Promise<{
  access: string;
  tokensVerified: boolean;
  message?: string;
} | null> => {
  try {
    console.log('[tokenService] Starting token refresh...');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[tokenService] Token refresh failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.access) {
      console.error('[tokenService] No access token in response');
      return null;
    }

    console.log(`[tokenService] Token refresh completed. Verified: ${data.tokensVerified}`);

    return {
      access: data.access,
      tokensVerified: data.tokensVerified || false,
      message: data.message
    };
  } catch (error) {
    console.error('[tokenService] Error refreshing token:', error);
    return null;
  }
};

/**
 * Простая версия для обратной совместимости
 * @returns Новый токен доступа или null в случае ошибки
 */
export const refreshAccessTokenSimple = async (): Promise<string | null> => {
  const result = await refreshAccessToken();
  return result ? result.access : null;
};
