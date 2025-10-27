/**
 * Централизованная очистка авторизации
 * Очищает NextAuth сессию, localStorage, sessionStorage и Redis
 */

import { signOut } from 'next-auth/react';

/**
 * Полная очистка всех данных авторизации
 * @param redirectUrl - URL для редиректа после очистки (опционально)
 */
export async function cleanupAuth(redirectUrl?: string): Promise<void> {
  console.log('[CleanupAuth] Starting full authentication cleanup...');

  try {
    // 1. Очищаем Redis на backend (провайдеры, токены)
    try {
      console.log('[CleanupAuth] Clearing Redis data...');
      const response = await fetch('/api/auth/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[CleanupAuth] ✅ Redis data cleared successfully');
      } else {
        console.warn('[CleanupAuth] ⚠️ Failed to clear Redis data:', response.status);
      }
    } catch (redisError) {
      console.error('[CleanupAuth] ❌ Error clearing Redis:', redisError);
      // Продолжаем очистку даже если Redis не очистился
    }

    // 2. Очищаем NextAuth сессию
    console.log('[CleanupAuth] Signing out from NextAuth...');
    await signOut({ redirect: false });
    console.log('[CleanupAuth] ✅ NextAuth session cleared');

    // 3. Очищаем localStorage
    console.log('[CleanupAuth] Clearing localStorage...');
    if (typeof window !== 'undefined') {
      // Сохраняем только необходимые данные (язык, тема)
      const theme = localStorage.getItem('theme');
      const language = localStorage.getItem('language');
      
      localStorage.clear();
      
      // Восстанавливаем сохраненные данные
      if (theme) localStorage.setItem('theme', theme);
      if (language) localStorage.setItem('language', language);
    }
    console.log('[CleanupAuth] ✅ localStorage cleared');

    // 4. Очищаем sessionStorage
    console.log('[CleanupAuth] Clearing sessionStorage...');
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    console.log('[CleanupAuth] ✅ sessionStorage cleared');

    // 5. Опциональный редирект
    if (redirectUrl && typeof window !== 'undefined') {
      console.log('[CleanupAuth] Redirecting to:', redirectUrl);
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    }

    console.log('[CleanupAuth] ✅ Full cleanup completed successfully');
  } catch (error) {
    console.error('[CleanupAuth] ❌ Error during cleanup:', error);
    
    // В крайнем случае принудительная очистка
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  }
}

/**
 * Очистка только backend токенов (без NextAuth сессии)
 * Используется при переключении провайдеров
 */
export function cleanupBackendTokens(): void {
  console.log('[CleanupAuth] Clearing backend tokens only...');
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('backend_auth');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('backend_auth');
  }
  
  console.log('[CleanupAuth] ✅ Backend tokens cleared');
}

/**
 * Очистка провайдеров в Redis
 */
export async function cleanupProviders(): Promise<void> {
  console.log('[CleanupAuth] Clearing providers in Redis...');
  
  try {
    const response = await fetch('/api/auth/cleanup-providers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('[CleanupAuth] ✅ Providers cleared successfully');
    } else {
      console.warn('[CleanupAuth] ⚠️ Failed to clear providers:', response.status);
    }
  } catch (error) {
    console.error('[CleanupAuth] ❌ Error clearing providers:', error);
  }
}

