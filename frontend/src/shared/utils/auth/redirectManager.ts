"use client";

import { AuthProvider } from '@/shared/constants/constants';

/**
 * Менеджер для управления перенаправлениями после аутентификации
 */

interface RedirectOptions {
  callbackUrl?: string | null;
  provider?: AuthProvider;
  fallbackUrl?: string;
  delay?: number;
  useWindowLocation?: boolean;
}

interface RedirectResult {
  success: boolean;
  redirectUrl: string;
  method: 'window.location' | 'router.push';
  error?: string;
}

class RedirectManager {
  private static instance: RedirectManager;

  private constructor() {}

  static getInstance(): RedirectManager {
    if (!RedirectManager.instance) {
      RedirectManager.instance = new RedirectManager();
    }
    return RedirectManager.instance;
  }

  /**
   * Определяет URL для перенаправления после успешной аутентификации
   */
  getRedirectUrl(options: RedirectOptions = {}): string {
    const {
      callbackUrl,
      provider = AuthProvider.MyBackendDocs,
      fallbackUrl = '/'
    } = options;

    console.log('[RedirectManager] Determining redirect URL:', {
      callbackUrl,
      provider,
      fallbackUrl
    });

    // Если есть callback URL, используем его
    if (callbackUrl) {
      try {
        const decodedUrl = this._decodeCallbackUrl(callbackUrl);
        console.log('[RedirectManager] Using callback URL:', decodedUrl);
        return decodedUrl;
      } catch (error) {
        console.error('[RedirectManager] Error decoding callback URL:', error);
        // Fallback к оригинальному URL
        return callbackUrl;
      }
    }

    // Если нет callback URL, используем fallback (по умолчанию главная страница)
    console.log('[RedirectManager] No callback URL, using fallback:', fallbackUrl);
    return fallbackUrl;
  }

  /**
   * Выполняет перенаправление с различными стратегиями
   */
  async performRedirect(
    redirectUrl: string,
    options: RedirectOptions = {}
  ): Promise<RedirectResult> {
    const {
      delay = 1500,
      useWindowLocation = true
    } = options;

    console.log('[RedirectManager] Performing redirect:', {
      redirectUrl,
      delay,
      useWindowLocation
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          if (useWindowLocation) {
            // Пытаемся использовать window.location для более надежного редиректа
            const url = new URL(redirectUrl, window.location.origin);
            console.log('[RedirectManager] Redirecting via window.location to:', url.href);
            window.location.href = url.href;
            
            resolve({
              success: true,
              redirectUrl: url.href,
              method: 'window.location'
            });
          } else {
            // Используем router.push (требует передачи router извне)
            console.log('[RedirectManager] Redirecting via router.push to:', redirectUrl);
            // Этот метод требует передачи router instance
            resolve({
              success: true,
              redirectUrl,
              method: 'router.push'
            });
          }
        } catch (error) {
          console.error('[RedirectManager] Redirect failed:', error);
          resolve({
            success: false,
            redirectUrl,
            method: useWindowLocation ? 'window.location' : 'router.push',
            error: error instanceof Error ? error.message : 'Unknown redirect error'
          });
        }
      }, delay);
    });
  }

  /**
   * Выполняет "умное" перенаправление с fallback стратегиями
   */
  async smartRedirect(options: RedirectOptions = {}): Promise<RedirectResult> {
    const redirectUrl = this.getRedirectUrl(options);
    
    try {
      // Сначала пытаемся window.location
      const result = await this.performRedirect(redirectUrl, {
        ...options,
        useWindowLocation: true
      });
      
      if (result.success) {
        return result;
      }
      
      // Если не удалось, пытаемся fallback
      console.warn('[RedirectManager] Primary redirect failed, trying fallback');
      return await this.performRedirect('/', {
        ...options,
        useWindowLocation: true
      });
      
    } catch (error) {
      console.error('[RedirectManager] Smart redirect failed:', error);
      return {
        success: false,
        redirectUrl,
        method: 'window.location',
        error: error instanceof Error ? error.message : 'Smart redirect failed'
      };
    }
  }

  /**
   * Создает URL для страницы логина с callback параметром
   */
  createLoginUrl(currentUrl: string, baseLoginUrl: string = '/login'): string {
    try {
      const loginUrl = new URL(baseLoginUrl, window.location.origin);
      loginUrl.searchParams.set('callbackUrl', currentUrl);
      
      console.log('[RedirectManager] Created login URL:', {
        currentUrl,
        baseLoginUrl,
        finalUrl: loginUrl.href
      });
      
      return loginUrl.href;
    } catch (error) {
      console.error('[RedirectManager] Error creating login URL:', error);
      return baseLoginUrl;
    }
  }

  /**
   * Извлекает callback URL из текущих параметров URL
   */
  extractCallbackUrl(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || urlParams.get('returnUrl');
      
      console.log('[RedirectManager] Extracted callback URL:', callbackUrl);
      return callbackUrl;
    } catch (error) {
      console.error('[RedirectManager] Error extracting callback URL:', error);
      return null;
    }
  }

  /**
   * Декодирует callback URL (может быть закодирован несколько раз)
   */
  private _decodeCallbackUrl(url: string): string {
    try {
      let decoded = decodeURIComponent(url);
      
      // Если URL все еще содержит закодированные символы, декодируем еще раз
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }
      
      console.log('[RedirectManager] URL decoding:', {
        original: url,
        decoded: decoded
      });
      
      return decoded;
    } catch (error) {
      console.error('[RedirectManager] Error decoding URL:', error);
      return url;
    }
  }

  /**
   * Проверяет, является ли URL безопасным для перенаправления
   */
  isSafeRedirectUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      
      // Проверяем, что это тот же домен
      const isSameDomain = parsedUrl.origin === window.location.origin;
      
      // Проверяем, что это не javascript: или data: URL
      const isSafeProtocol = ['http:', 'https:'].includes(parsedUrl.protocol);
      
      console.log('[RedirectManager] URL safety check:', {
        url,
        parsedUrl: parsedUrl.href,
        isSameDomain,
        isSafeProtocol,
        safe: isSameDomain && isSafeProtocol
      });
      
      return isSameDomain && isSafeProtocol;
    } catch (error) {
      console.error('[RedirectManager] Error checking URL safety:', error);
      return false;
    }
  }
}

// Экспортируем singleton instance
export const redirectManager = RedirectManager.getInstance();

// Экспортируем типы
export type { RedirectOptions, RedirectResult };
