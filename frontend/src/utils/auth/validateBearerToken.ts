/**
 * Универсальная утилита для валидации Bearer токена
 * Проверяет наличие и валидность backend токенов в Redis
 * Возвращает true если токен валиден, false если нет
 */
export async function validateBearerToken(): Promise<boolean> {
  try {
    console.log('[validateBearerToken] Checking backend token validity...');
    
    // Проверяем наличие backend токенов в Redis
    const response = await fetch('/api/redis?key=backend_auth', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.log('[validateBearerToken] Redis check failed:', response.status);
      return false;
    }

    const data = await response.json();
    const hasTokens = data?.exists === true && data?.value;
    
    console.log('[validateBearerToken] Backend tokens in Redis:', hasTokens);
    return hasTokens;
  } catch (error) {
    console.error('[validateBearerToken] Error validating token:', error);
    return false;
  }
}

/**
 * Server-side утилита для проверки токена в API routes
 */
export async function validateServerToken(): Promise<boolean> {
  try {
    // Redis is disabled in this build; server-side validation is a no-op
    return false;
  } catch (error) {
    console.error('[validateServerToken] Error:', error);
    return false;
  }
}
