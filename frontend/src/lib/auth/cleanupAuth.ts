/**
 * Централизованная очистка авторизации
 * Очищает NextAuth сессию, localStorage, sessionStorage и Redis
 */

import { signOut } from 'next-auth/react';

/**
 * Полная очистка всех данных авторизации - SIGNOUT
 * Очищает: Redis + NextAuth сессия + localStorage + sessionStorage
 * После этого пользователь должен быть перенаправлен на /api/auth/signin
 * @param redirectUrl - URL для редиректа после очистки (по умолчанию /api/auth/signin)
 */
export async function cleanupAuth(redirectUrl?: string): Promise<void> {
  console.log('[CleanupAuth] SIGNOUT: Starting full authentication cleanup (Redis + NextAuth + storage)...');

  try {
    // 1. Бэкенд-очистка: Redis-токены + сессионные cookies через signout endpoint
    try {
      console.log('[CleanupAuth] Calling /api/auth/signout-full (server-side full cleanup)...');
      const response = await fetch('/api/auth/signout-full', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        console.log('[CleanupAuth] ✅ /api/auth/signout-full completed');
      } else {
        console.warn('[CleanupAuth] ⚠️ /api/auth/signout-full returned status:', response.status);
      }
    } catch (signoutError) {
      console.error('[CleanupAuth] ❌ Error calling /api/auth/signout-full:', signoutError);
      // Продолжаем локальную очистку даже если запрос не удался
    }

    // 2. Дополнительно инвалидируем NextAuth (на случай клиентского состояния)
    console.log('[CleanupAuth] Signing out from NextAuth (client-side)...');
    await signOut({ redirect: false });
    console.log('[CleanupAuth] ✅ NextAuth client signOut called');

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

    // 5. Очищаем React Query кеш через событие
    if (typeof window !== 'undefined') {
      console.log('[CleanupAuth] Clearing React Query cache...');
      // Используем небольшую задержку чтобы убедиться что все очистки выполнены
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth:signout', { detail: { clearCache: true } }));
        console.log('[CleanupAuth] ✅ auth:signout event dispatched');
      }, 50);
    }

    // 6. Опциональный редирект
    if (redirectUrl && typeof window !== 'undefined') {
      console.log('[CleanupAuth] Redirecting to:', redirectUrl);
      // Увеличиваем задержку чтобы дать время обработать событие signout
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 200);
    }

    console.log('[CleanupAuth] ✅ SIGNOUT completed: Full cleanup successful (Redis + NextAuth + storage)');
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
 * Очистка только backend токенов и Redis (БЕЗ NextAuth сессии)
 * Это LOGOUT - очищает Redis, но оставляет NextAuth сессию
 * После этого пользователь должен быть перенаправлен на /login
 */
export async function cleanupBackendTokens(): Promise<void> {
  console.log('[CleanupAuth] LOGOUT: Clearing backend tokens and Redis (keeping NextAuth session)...');
  
  try {
    // 1. Очищаем только backend токены через logout endpoint
    try {
      console.log('[CleanupAuth] Calling /api/auth/logout (backend tokens only)...');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[CleanupAuth] ✅ Backend tokens cleared (NextAuth session preserved)');
      } else {
        console.warn('[CleanupAuth] ⚠️ Failed to clear backend tokens:', response.status);
      }
    } catch (logoutError) {
      console.error('[CleanupAuth] ❌ Error during logout:', logoutError);
      // Продолжаем очистку даже если запрос не удался
    }

    // 2. Очищаем localStorage backend токены
    if (typeof window !== 'undefined') {
      localStorage.removeItem('backend_auth');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('backend_auth');
    }
    
    console.log('[CleanupAuth] ✅ LOGOUT completed: Backend tokens and Redis cleared, NextAuth session preserved');
  } catch (error) {
    console.error('[CleanupAuth] ❌ Error during logout:', error);
    
    // В крайнем случае очищаем хотя бы localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('backend_auth');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('backend_auth');
    }
  }
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

