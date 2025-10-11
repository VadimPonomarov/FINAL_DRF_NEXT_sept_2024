"use client";

import { useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ApiErrorHandlerOptions {
  onCriticalError?: () => void;
  onBackendUnavailable?: () => void;
  enableAutoRedirect?: boolean;
  criticalErrorThreshold?: number; // Количество критических ошибок для автоматического редиректа
}

interface ErrorStats {
  count: number;
  lastError: Date;
  consecutiveErrors: number;
}

class ApiErrorTracker {
  private static instance: ApiErrorTracker;
  private errorStats: Map<string, ErrorStats> = new Map();
  private criticalErrorCount = 0;
  private lastCriticalError: Date | null = null;
  private listeners: Set<(error: any) => void> = new Set();

  static getInstance(): ApiErrorTracker {
    if (!ApiErrorTracker.instance) {
      ApiErrorTracker.instance = new ApiErrorTracker();
    }
    return ApiErrorTracker.instance;
  }

  addListener(callback: (error: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  trackError(url: string, status: number, error?: any) {
    const now = new Date();
    const key = `${status}_${new URL(url, 'http://localhost').pathname}`;
    
    const stats = this.errorStats.get(key) || { count: 0, lastError: now, consecutiveErrors: 0 };
    stats.count++;
    stats.lastError = now;
    stats.consecutiveErrors++;
    
    this.errorStats.set(key, stats);

    // Определяем критические ошибки
    const isCritical = this.isCriticalError(status, url);
    
    if (isCritical) {
      this.criticalErrorCount++;
      this.lastCriticalError = now;
      
      console.error('[ApiErrorTracker] Critical error detected:', {
        url,
        status,
        totalCriticalErrors: this.criticalErrorCount,
        consecutiveErrors: stats.consecutiveErrors,
        error
      });

      // Уведомляем всех слушателей
      this.listeners.forEach(listener => {
        try {
          listener({ url, status, error, isCritical: true, stats });
        } catch (e) {
          console.error('[ApiErrorTracker] Error in listener:', e);
        }
      });
    }
  }

  private isCriticalError(status: number, url: string): boolean {
    // Критические ошибки:
    // 1. 404 для API endpoints (backend недоступен или неправильно настроен)
    // 2. 500+ серверные ошибки
    // 3. Network errors (status 0)
    
    const isApiEndpoint = url.includes('/api/') && !url.includes('/api/auth/');
    
    return (
      (status === 404 && isApiEndpoint) ||
      status >= 500 ||
      status === 0 // Network error
    );
  }

  getCriticalErrorCount(): number {
    return this.criticalErrorCount;
  }

  getLastCriticalError(): Date | null {
    return this.lastCriticalError;
  }

  reset() {
    this.errorStats.clear();
    this.criticalErrorCount = 0;
    this.lastCriticalError = null;
  }

  // Проверяем, нужно ли принудительно перенаправить пользователя
  shouldForceRedirect(threshold: number = 3): boolean {
    const recentErrors = this.criticalErrorCount;
    const timeSinceLastError = this.lastCriticalError 
      ? Date.now() - this.lastCriticalError.getTime() 
      : Infinity;
    
    // Если много критических ошибок за последние 30 секунд
    return recentErrors >= threshold && timeSinceLastError < 30000;
  }
}

export function useApiErrorHandler(options: ApiErrorHandlerOptions = {}) {
  const {
    onCriticalError,
    onBackendUnavailable,
    enableAutoRedirect = true,
    criticalErrorThreshold = 3
  } = options;

  const router = useRouter();
  const tracker = ApiErrorTracker.getInstance();

  const handleCriticalError = useCallback(async () => {
    console.log('[ApiErrorHandler] Handling critical error - clearing session and redirecting to /signin...');
    
    try {
      // Очищаем NextAuth сессию
      await signOut({ redirect: false });
      
      // Очищаем localStorage и sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Сбрасываем счетчик ошибок
      tracker.reset();
      
      // Вызываем пользовательский обработчик
      onCriticalError?.();
      
      // Перенаправляем на страницу первичной авторизации (/signin)
      if (enableAutoRedirect) {
        const currentPath = window.location.pathname;
        const redirectUrl = currentPath === '/signin' ? '/signin' : `/signin?callbackUrl=${encodeURIComponent(currentPath)}`;

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 100);
      }
      
    } catch (error) {
      console.error('[ApiErrorHandler] Error during cleanup:', error);
      // В крайнем случае просто перезагружаем страницу
      window.location.reload();
    }
  }, [onCriticalError, enableAutoRedirect, router, tracker]);

  useEffect(() => {
    const removeListener = tracker.addListener((errorData) => {
      const { url, status, error, isCritical } = errorData;
      
      if (isCritical) {
        console.warn('[ApiErrorHandler] Critical API error detected:', { url, status, error });
        
        // Проверяем, нужно ли принудительно перенаправить
        // Не перенаправляем, если пользователь находится на главной странице и авторизован
        const isHomePage = window.location.pathname === '/';
        const isAuthenticated = !!localStorage.getItem('session-token'); // Пример проверки авторизации
      
        if (tracker.shouldForceRedirect(criticalErrorThreshold) && (!isHomePage || !isAuthenticated)) {
          console.error('[ApiErrorHandler] Too many critical errors, forcing redirect...');
          handleCriticalError();
        } else if (status === 404 && url.includes('/api/')) {
          // Специальная обработка для 404 API errors
          onBackendUnavailable?.();
        }
      }
    });

    return removeListener;
  }, [handleCriticalError, onBackendUnavailable, criticalErrorThreshold, tracker]);

  // Функция для ручного отслеживания ошибок
  const trackError = useCallback((url: string, status: number, error?: any) => {
    tracker.trackError(url, status, error);
  }, [tracker]);

  // Функция для принудительной очистки и редиректа
  const forceRedirect = useCallback(() => {
    handleCriticalError();
  }, [handleCriticalError]);

  return {
    trackError,
    forceRedirect,
    criticalErrorCount: tracker.getCriticalErrorCount(),
    lastCriticalError: tracker.getLastCriticalError(),
    shouldForceRedirect: tracker.shouldForceRedirect(criticalErrorThreshold)
  };
}

// Глобальная функция для отслеживания ошибок fetch
export function setupGlobalFetchErrorTracking(trackErrorCallback?: (url: string, status: number) => void) {
  if (typeof window === 'undefined') return;

  const tracker = ApiErrorTracker.getInstance();
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      // Отслеживаем ошибки HTTP статусов
      if (!response.ok) {
        console.log(`[Global Fetch] Error detected: ${url} - Status: ${response.status}`);
        tracker.trackError(url, response.status);

        // Вызываем callback если передан
        if (trackErrorCallback) {
          trackErrorCallback(url, response.status);
        }
      }
      
      return response;
    } catch (error) {
      // Отслеживаем сетевые ошибки
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      tracker.trackError(url, 0, error);
      throw error;
    }
  };
}
