"use client";

import { toast } from "@/hooks/use-toast";

/**
 * 🔐 Централизованный обработчик ошибок аутентификации 401/4001
 * 
 * Логика обработки:
 * 1. Получили 401/4001 → проверяем refresh токен в Redis
 * 2. Если есть refresh → делаем refresh (новые токены сохраняются в Redis)
 * 3. Retry оригинального запроса
 * 4. Если снова 401 или refresh вернул 403 → редирект на логин с toast
 * 
 * Используется для:
 * - HTTP requests (fetch, apiClient)
 * - WebSocket connections (code 4001)
 */

interface AuthErrorHandlerOptions {
  /** Callback для retry запроса после успешного refresh */
  retryRequest?: () => Promise<Response>;
  /** Для логирования - тип источника ошибки */
  source?: string;
  /** Текущий путь для redirect callback */
  currentPath?: string;
  /** Показать ли toast при redirect */
  showToast?: boolean;
}

interface AuthErrorHandlerResult {
  /** Успешно ли обновлены токены */
  refreshSucceeded: boolean;
  /** Результат retry запроса (если был) */
  retryResponse?: Response;
  /** Нужен ли редирект на логин */
  shouldRedirect: boolean;
}

class UnifiedAuthErrorHandler {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Получает токены из Redis
   */
  private async getTokensFromRedis(): Promise<{ access?: string; refresh?: string } | null> {
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
      console.error('[UnifiedAuthErrorHandler] Error getting tokens from Redis:', error);
      return null;
    }
  }

  /**
   * Обновляет токены через API
   * Новые токены автоматически сохраняются в Redis внутри /api/auth/refresh
   */
  private async refreshTokensInternal(): Promise<boolean> {
    try {
      console.log('[UnifiedAuthErrorHandler] 🔄 Refreshing tokens...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (response.status === 403) {
        console.error('[UnifiedAuthErrorHandler] ❌ Refresh failed with 403 - refresh token invalid');
        return false;
      }

      if (!response.ok) {
        console.error('[UnifiedAuthErrorHandler] ❌ Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('[UnifiedAuthErrorHandler] ✅ Token refresh successful');
      
      // Токены уже сохранены в Redis через /api/auth/refresh
      return !!data.access;
    } catch (error) {
      console.error('[UnifiedAuthErrorHandler] ❌ Error refreshing tokens:', error);
      return false;
    }
  }

  /**
   * Обновляет токены с защитой от множественных одновременных вызовов
   */
  async refreshTokens(): Promise<boolean> {
    // Если уже идет refresh - ждем его завершения
    if (this.isRefreshing && this.refreshPromise) {
      console.log('[UnifiedAuthErrorHandler] ⏳ Refresh already in progress, waiting...');
      return await this.refreshPromise;
    }

    // Начинаем новый refresh
    this.isRefreshing = true;
    this.refreshPromise = this.refreshTokensInternal();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Показывает toast и делает редирект на страницу логина
   */
  private handleRedirectToLogin(options: AuthErrorHandlerOptions) {
    const { currentPath, showToast = true } = options;

    if (showToast) {
      toast({
        title: "❌ Требуется авторизация",
        description: "Ваша сессия истекла. Пожалуйста, войдите снова.",
        variant: "destructive",
        duration: 5000,
      });
    }

    if (typeof window !== 'undefined') {
      const path = currentPath || window.location.pathname + window.location.search;
      const callback = encodeURIComponent(path);
      
      setTimeout(() => {
        window.location.href = `/login?callbackUrl=${callback}&message=${encodeURIComponent('Ваша сессия истекла. Пожалуйста, войдите снова.')}`;
      }, 500);
    }
  }

  /**
   * Основной метод обработки ошибки 401/4001
   * 
   * Алгоритм:
   * 1. Проверяем наличие refresh токена в Redis
   * 2. Если есть → делаем refresh
   * 3. Если refresh успешен → retry оригинального запроса (если передан callback)
   * 4. Если снова 401 или refresh failed (403) → редирект на логин
   */
  async handleAuthError(options: AuthErrorHandlerOptions = {}): Promise<AuthErrorHandlerResult> {
    const { retryRequest, source = 'unknown' } = options;

    console.log(`[UnifiedAuthErrorHandler] 🔐 Handling 401 error from: ${source}`);

    // Шаг 1: Проверяем наличие refresh токена в Redis
    const tokens = await this.getTokensFromRedis();
    
    if (!tokens?.refresh) {
      console.error('[UnifiedAuthErrorHandler] ❌ No refresh token in Redis - redirecting to login');
      this.handleRedirectToLogin(options);
      return {
        refreshSucceeded: false,
        shouldRedirect: true
      };
    }

    console.log('[UnifiedAuthErrorHandler] ✅ Refresh token found in Redis');

    // Шаг 2: Делаем refresh токенов
    const refreshSuccess = await this.refreshTokens();

    if (!refreshSuccess) {
      console.error('[UnifiedAuthErrorHandler] ❌ Token refresh failed - redirecting to login');
      this.handleRedirectToLogin(options);
      return {
        refreshSucceeded: false,
        shouldRedirect: true
      };
    }

    console.log('[UnifiedAuthErrorHandler] ✅ Token refresh successful');

    // Шаг 3: Retry оригинального запроса (если передан callback)
    if (retryRequest) {
      console.log('[UnifiedAuthErrorHandler] 🔄 Retrying original request...');
      
      try {
        const retryResponse = await retryRequest();

        // Проверяем результат retry
        if (retryResponse.status === 401) {
          console.error('[UnifiedAuthErrorHandler] ❌ Retry still returned 401 - tokens invalid');
          this.handleRedirectToLogin(options);
          return {
            refreshSucceeded: true,
            retryResponse,
            shouldRedirect: true
          };
        }

        console.log('[UnifiedAuthErrorHandler] ✅ Retry successful:', retryResponse.status);
        return {
          refreshSucceeded: true,
          retryResponse,
          shouldRedirect: false
        };
      } catch (error) {
        console.error('[UnifiedAuthErrorHandler] ❌ Error during retry:', error);
        this.handleRedirectToLogin(options);
        return {
          refreshSucceeded: true,
          shouldRedirect: true
        };
      }
    }

    // Если retry callback не передан - просто возвращаем успех refresh
    return {
      refreshSucceeded: true,
      shouldRedirect: false
    };
  }

  /**
   * Обработка WebSocket ошибки 4001
   * Возвращает true если можно переподключиться, false если нужен редирект
   */
  async handleWebSocketAuthError(options: Omit<AuthErrorHandlerOptions, 'retryRequest'> = {}): Promise<boolean> {
    const result = await this.handleAuthError({
      ...options,
      source: options.source || 'WebSocket'
    });

    // Для WebSocket не делаем retry запроса, только refresh токенов
    // Caller сам переподключится с новым токеном
    return result.refreshSucceeded && !result.shouldRedirect;
  }
}

// Singleton instance
export const unifiedAuthErrorHandler = new UnifiedAuthErrorHandler();

/**
 * Helper для использования в fetch
 */
export async function handleFetchAuthError(
  originalRequest: () => Promise<Response>,
  options: Omit<AuthErrorHandlerOptions, 'retryRequest'> = {}
): Promise<Response> {
  const result = await unifiedAuthErrorHandler.handleAuthError({
    ...options,
    retryRequest: originalRequest,
    source: options.source || 'fetch'
  });

  if (result.retryResponse) {
    return result.retryResponse;
  }

  // Если дошли сюда без retryResponse - значит произошел редирект
  // Возвращаем фейковый 401 response
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

