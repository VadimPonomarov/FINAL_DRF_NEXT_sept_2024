'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * УРОВЕНЬ 2 (из 2): BackendTokenPresenceGate - проверка backend токенов
 * ════════════════════════════════════════════════════════════════════════
 * Двухуровневая система валидации для AutoRia:
 * 1. [Уровень 1] Middleware: NextAuth сессия → /api/auth/signin если нет
 * 2. [Уровень 2] BackendTokenPresenceGate (этот компонент): Backend токены → /login если нет
 * ════════════════════════════════════════════════════════════════════════
 * 
 * ВАЖНО:
 * - Middleware уже проверил NextAuth сессию (уровень 1)
 * - Этот компонент проверяет ТОЛЬКО backend токены (уровень 2)
 * - Использует универсальную утилиту redirectToAuth для правильного редиректа
 * - Используется в Layout для всех страниц AutoRia
 */
export default function BackendTokenPresenceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Проверка backend токенов (уровень 2)
   * Middleware уже проверил NextAuth сессию (уровень 1), поэтому здесь проверяем только токены
   * ОПТИМИЗАЦИЯ: Используем таймаут для предотвращения задержек редиректов
   */
  const checkBackendTokens = useCallback(async (isRetry = false) => {
    try {
      console.log('[BackendTokenPresenceGate] Level 2: Checking backend tokens...');

      // SHORT-CIRCUIT: если в Redis нет backend_auth, сразу редиректим без попыток refresh
      try {
        const redisCheck = await Promise.race([
          fetch(`/api/redis?key=${encodeURIComponent('backend_auth')}`, { cache: 'no-store' }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
        ]) as Response;

        if (redisCheck && redisCheck.ok) {
          const redisData = await redisCheck.json();
          if (!redisData?.exists) {
            console.log('[BackendTokenPresenceGate] ❌ No backend_auth in Redis - short-circuit redirect');
            const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
            const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            redirectToAuth(currentPath, 'tokens_not_found');
            return;
          }
        }
      } catch (e) {
        console.log('[BackendTokenPresenceGate] Redis check failed or timed out, continue with /api/auth/me');
      }

      // Проверяем backend токены через /api/auth/me с таймаутом (максимум 3 секунды)
      const checkPromise = fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      let tokenCheck: Response;
      try {
        tokenCheck = await Promise.race([checkPromise, timeoutPromise]) as Response;
      } catch (error) {
        // Таймаут или другая ошибка - делаем редирект немедленно
        console.log('[BackendTokenPresenceGate] ⚠️ Token check timeout or error, redirecting immediately');
        const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
        const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        redirectToAuth(currentPath, 'auth_required');
        return;
      }

      if (tokenCheck.ok) {
        // Backend токены найдены и валидны
        console.log('[BackendTokenPresenceGate] ✅ Backend tokens valid, access granted');
        setIsLoading(false);
        return;
      }

      // Обработка ошибок
      const errorData = await tokenCheck.json().catch(() => ({}));
      console.log('[BackendTokenPresenceGate] Token check failed:', {
        status: tokenCheck.status,
        statusText: tokenCheck.statusText,
        error: errorData
      });

      // Если получили 401 и это первая попытка, пробуем обновить токен
      if (tokenCheck.status === 401 && !isRetry) {
        console.log('[BackendTokenPresenceGate] Attempting to refresh token...');
        
        const refreshPromise = fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store'
        });

        const refreshTimeout = new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 2000);
        });

        try {
          const refreshResponse = await Promise.race([refreshPromise, refreshTimeout]) as Response;
          
          if (refreshResponse.ok) {
            console.log('[BackendTokenPresenceGate] ✅ Token refresh successful, retrying...');
            return checkBackendTokens(true);
          }
          
          // Если refresh вернул 404 - токены не найдены в Redis
          if (refreshResponse.status === 404) {
            console.log('[BackendTokenPresenceGate] ❌ Tokens not found in Redis (404)');
            const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
            const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            redirectToAuth(currentPath, 'tokens_not_found');
            return;
          }
          
          console.log('[BackendTokenPresenceGate] ❌ Token refresh failed:', refreshResponse.status);
        } catch (refreshError) {
          // Таймаут при refresh - делаем редирект
          console.log('[BackendTokenPresenceGate] ❌ Token refresh timeout');
          const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
          const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
          redirectToAuth(currentPath, 'tokens_not_found');
          return;
        }
      }

      // Если дошли сюда, значит не удалось получить/обновить токены
      // Используем универсальную утилиту для правильного редиректа
      console.log('[BackendTokenPresenceGate] ❌ Backend tokens not found, redirecting...');
      const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
      const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      // Проверяем причину: если 404 от refresh - tokens_not_found, иначе - auth_required
      const reason = tokenCheck.status === 404 ? 'tokens_not_found' : 'auth_required';
      redirectToAuth(currentPath, reason);

    } catch (error) {
      console.error('[BackendTokenPresenceGate] ❌ Error checking backend tokens:', error);
      // При любой ошибке используем универсальную утилиту
      const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
      const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      redirectToAuth(currentPath, 'auth_required');
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    checkBackendTokens();
  }, [checkBackendTokens]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}


