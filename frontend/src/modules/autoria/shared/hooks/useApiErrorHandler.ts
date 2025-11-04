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

    console.log('[ApiErrorTracker] Error tracked:', {
      url,
      status,
      isCritical,
      totalCriticalErrors: this.criticalErrorCount
    });

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
    // 1. 500+ серверные ошибки - НО НЕ для /api/autoria/* (backend может быть недоступен)
    // 2. Network errors (status 0) - НО НЕ CORS ошибки для backend
    // 3. 404 для API endpoints (НО НЕ для /api/auth/* и /api/public/*)

    // Исключаем все auth endpoints - они могут возвращать 400/401/404 в нормальном режиме
    if (url.includes('/api/auth/')) {
      return false;
    }

    // Исключаем public endpoints - они могут возвращать 404 если данных нет
    if (url.includes('/api/public/')) {
      return false;
    }

    // Исключаем Redis API - он может возвращать 404 если ключа нет
    if (url.includes('/api/redis')) {
      return false;
    }

    // Исключаем AutoRia API - backend может быть недоступен, это не должно вызывать signOut
    if (url.includes('/api/autoria/')) {
      console.warn('[ApiErrorTracker] AutoRia API error (not critical, backend may be unavailable):', url, status);
      return false;
    }

    // Исключаем CORS ошибки для прямых запросов к backend (status 0)
    // Это происходит когда компоненты пытаются обратиться напрямую к http://localhost:8000
    // вместо использования Next.js API routes
    // ВАЖНО: URL может быть как полным (http://localhost:8000/api/user/profile/),
    // так и относительным (/api/user/profile), поэтому проверяем оба варианта
    if (status === 0) {
      if (url.includes('localhost:8000') ||
          url.includes('/api/user/') ||
          url.includes('/api/accounts/') ||
          url.includes('/api/ads/')) {
        console.warn('[ApiErrorTracker] CORS error detected for backend URL (not critical):', url);
        return false;
      }
    }

    // ЯВНАЯ обработка 401: считаем критической для API эндпоинтов (кроме auth/public/redis/autoria)
    if (status === 401 && url.includes('/api/')) {
      return true;
    }

    // 400-499 ошибки НЕ критические (это клиентские ошибки - неправильный запрос, нет прав и т.д.)
    if (status >= 400 && status < 500) {
      return false;
    }

    const isApiEndpoint = url.includes('/api/');

    return (
      status >= 500 ||  // Серверные ошибки
      status === 0 ||   // Network error (но CORS для backend уже отфильтрованы выше)
      (status === 404 && isApiEndpoint) // 404 для API (но уже отфильтрованы auth/public/redis выше)
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
    console.log('[ApiErrorHandler] Handling critical error...');

    try {
      // Guard: avoid loops if already on auth pages
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/login') || path.startsWith('/api/auth/signin')) {
          console.warn('[ApiErrorHandler] Already on auth page, skip redirect to avoid loop');
          return;
        }
      }

      // Сбрасываем счетчик ошибок
      tracker.reset();

      // Вызываем пользовательский обработчик
      onCriticalError?.();

      // Перенаправляем на страницу логина (/login) с callbackUrl
      // ТОЛЬКО если enableAutoRedirect === true
      if (enableAutoRedirect) {
        console.log('[ApiErrorHandler] Auto-redirect enabled - clearing session and redirecting to /login...');

        // Пытаемся очистить backend токены/Redis
        try {
          await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', credentials: 'include' });
        } catch (e) {
          console.warn('[ApiErrorHandler] /api/auth/logout call failed (will continue cleanup):', e);
        }

        // Очищаем NextAuth сессию
        await signOut({ redirect: false });

        // Очищаем localStorage и sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        const currentPath = window.location.pathname + window.location.search;
        const redirectUrl = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;

        setTimeout(() => {
          const path = window.location.pathname;
          if (path.startsWith('/login') || path.startsWith('/api/auth/signin')) {
            console.warn('[ApiErrorHandler] Suppress redirect while already on auth page');
            return;
          }
          window.location.href = redirectUrl;
        }, 100);
      } else {
        console.log('[ApiErrorHandler] Auto-redirect disabled - user stays on page');
      }

    } catch (error) {
      console.error('[ApiErrorHandler] Error during cleanup:', error);
      // В крайнем случае просто перезагружаем страницу (только если enableAutoRedirect === true)
      if (enableAutoRedirect) {
        window.location.reload();
      }
    }
  }, [onCriticalError, enableAutoRedirect, router, tracker]);

  useEffect(() => {
    const unsubscribe = tracker.addListener((errorData) => {
      const { url, status, error, isCritical } = errorData;
      
      // Немедленная реакция на первую 401 для API эндпоинтов (кроме auth)
      if (status === 401 && url.includes('/api/') && !url.includes('/api/auth/')) {
        console.warn('[ApiErrorHandler] 401 detected for API endpoint', { url });
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          // 1) Не редиректим на страницах AutoRia — BackendTokenPresenceGate сам обработает
          if (path.startsWith('/autoria/')) {
            console.warn('[ApiErrorHandler] Suppress 401 redirect on /autoria/* (gate handles it)');
            return;
          }
          // 2) Не редиректим если уже на страницах авторизации
          if (path.startsWith('/login') || path.startsWith('/api/auth/signin')) {
            console.warn('[ApiErrorHandler] Suppress 401 redirect on auth page');
            return;
          }
          // 3) Глобальный троттлинг: не чаще одного раза в 10 секунд
          try {
            const now = Date.now();
            const last = Number(window.sessionStorage.getItem('auth:lastRedirectTs') || '0');
            if (now - last < 10000) {
              console.warn('[ApiErrorHandler] Suppress 401 redirect (throttled)');
              return;
            }
            window.sessionStorage.setItem('auth:lastRedirectTs', String(now));
          } catch {}
        }
        handleCriticalError();
        return;
      }

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

    return () => { unsubscribe(); };
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
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

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
