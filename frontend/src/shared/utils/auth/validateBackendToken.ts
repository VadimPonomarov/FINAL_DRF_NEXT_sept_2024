/**
 * Утилита для валидации backend токена через /api/auth/me
 * /api/auth/me проверяет NextAuth сессию и backend accessToken
 * Возвращает true если токен валиден, false если нет
 */
export async function validateBackendToken(): Promise<boolean> {
  try {
    console.log('[validateBackendToken] Checking token validity via /api/auth/me...');
    
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      // /api/auth/me возвращает authenticated: true только если есть NextAuth сессия И backend accessToken
      const isValid = data.authenticated === true && data.user?.email;
      console.log('[validateBackendToken] Token valid via /api/auth/me:', isValid);
      return isValid;
    } else {
      console.log('[validateBackendToken] Invalid token response:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[validateBackendToken] Error validating token:', error);
    return false;
  }
}
