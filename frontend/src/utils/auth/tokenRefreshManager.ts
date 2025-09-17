"use client";

/**
 * Централизованный менеджер для обновления токенов аутентификации
 * Обеспечивает автоматический рефреш токенов при ошибках авторизации
 */

interface TokenRefreshResult {
  success: boolean;
  access?: string;
  refresh?: string;
  tokensVerified?: boolean;
  message?: string;
  error?: string;
}

interface TokenRefreshOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  onProgress?: (attempt: number, maxAttempts: number) => void;
  onSuccess?: (result: TokenRefreshResult) => void;
  onError?: (error: string) => void;
}

class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private refreshInProgress = false;
  private refreshPromise: Promise<TokenRefreshResult> | null = null;

  private constructor() {}

  static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * Выполняет обновление токенов с retry логикой
   */
  async refreshTokens(options: TokenRefreshOptions = {}): Promise<TokenRefreshResult> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      showToast = false,
      onProgress,
      onSuccess,
      onError
    } = options;

    // Если уже идет процесс обновления, возвращаем существующий промис
    if (this.refreshInProgress && this.refreshPromise) {
      console.log('[TokenRefreshManager] Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshInProgress = true;
    this.refreshPromise = this._performRefresh(maxRetries, retryDelay, onProgress);

    try {
      const result = await this.refreshPromise;
      
      if (result.success) {
        onSuccess?.(result);
        console.log('[TokenRefreshManager] Token refresh successful');
      } else {
        onError?.(result.error || 'Token refresh failed');
        console.error('[TokenRefreshManager] Token refresh failed:', result.error);
      }

      return result;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(
    maxRetries: number,
    retryDelay: number,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<TokenRefreshResult> {
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[TokenRefreshManager] Refresh attempt ${attempt}/${maxRetries}`);
        onProgress?.(attempt, maxRetries);

        // Добавляем задержку между попытками (кроме первой)
        if (attempt > 1) {
          await this._delay(retryDelay * attempt);
        }

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = `HTTP ${response.status}: ${errorText}`;
          console.error(`[TokenRefreshManager] Attempt ${attempt} failed:`, lastError);
          
          // Если это 401 или 403, не пытаемся повторно
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              error: 'Authentication failed - please login again'
            };
          }
          
          continue;
        }

        const data = await response.json();

        if (!data.access) {
          lastError = 'No access token in response';
          console.error(`[TokenRefreshManager] Attempt ${attempt} failed:`, lastError);
          continue;
        }

        console.log(`[TokenRefreshManager] Attempt ${attempt} successful`);
        return {
          success: true,
          access: data.access,
          refresh: data.refresh,
          tokensVerified: data.tokensVerified,
          message: data.message
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error';
        console.error(`[TokenRefreshManager] Attempt ${attempt} error:`, error);
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
    };
  }

  /**
   * Проверяет, нужно ли обновлять токен
   */
  async shouldRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/redis?key=backend_auth');
      if (!response.ok) return true;

      const data = await response.json();
      if (!data?.value) return true;

      const authData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (!authData?.access) return true;

      // Проверяем истечение токена
      return this._isTokenExpired(authData.access);
    } catch (error) {
      console.error('[TokenRefreshManager] Error checking token:', error);
      return true;
    }
  }

  /**
   * Выполняет "умное" обновление - только если токен истек или отсутствует
   */
  async smartRefresh(options: TokenRefreshOptions = {}): Promise<TokenRefreshResult> {
    const shouldRefresh = await this.shouldRefreshToken();
    
    if (!shouldRefresh) {
      console.log('[TokenRefreshManager] Token is still valid, skipping refresh');
      return { success: true, message: 'Token is still valid' };
    }

    console.log('[TokenRefreshManager] Token needs refresh, proceeding...');
    return this.refreshTokens(options);
  }

  private _isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = 300; // 5 минут буфер
      return payload.exp < (currentTime + bufferTime);
    } catch (error) {
      console.error('[TokenRefreshManager] Error checking token expiration:', error);
      return true;
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Сбрасывает состояние менеджера (для тестирования)
   */
  reset(): void {
    this.refreshInProgress = false;
    this.refreshPromise = null;
  }
}

// Экспортируем singleton instance
export const tokenRefreshManager = TokenRefreshManager.getInstance();

// Экспортируем типы для использования в других файлах
export type { TokenRefreshResult, TokenRefreshOptions };
