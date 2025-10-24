"use client";

/**
 * Управление токенами аутентификации
 * Отвечает за: получение токенов, обновление токенов, проверку валидности
 */
export class TokenManager {
  /**
   * Получает токены из Redis
   */
  async getTokens(): Promise<{ access?: string; refresh?: string } | null> {
    try {
      const response = await fetch('/api/redis?key=backend_auth');
      if (!response.ok) return null;

      const data = await response.json();
      if (!data?.value) return null;

      const authData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        access: authData.access,
        refresh: authData.refresh
      };
    } catch (error) {
      console.error('[TokenManager] Error getting tokens:', error);
      return null;
    }
  }

  /**
   * Обновляет токены через API
   */
  async refreshTokens(): Promise<boolean> {
    try {
      console.log('[TokenManager] Refreshing tokens...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error('[TokenManager] Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('[TokenManager] Token refresh successful');
      return !!data.access;
    } catch (error) {
      console.error('[TokenManager] Error refreshing tokens:', error);
      return false;
    }
  }

  /**
   * Проверяет, валидны ли токены
   */
  async areTokensValid(): Promise<boolean> {
    const tokens = await this.getTokens();
    return !!(tokens?.access && tokens?.refresh);
  }

  /**
   * Обрабатывает ошибку аутентификации (редирект на логин)
   */
  handleAuthError(currentPath?: string) {
    console.error('[TokenManager] Authentication failed - session expired');

    if (typeof window !== 'undefined') {
      const path = currentPath || window.location.pathname + window.location.search;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(path)}&error=session_expired`;
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();

