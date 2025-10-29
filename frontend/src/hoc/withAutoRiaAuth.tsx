"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * HOC для защиты страниц AutoRia
 * 
 * ВАЖНО: 
 * - NextAuth сессия проверяется в middleware (первая линия защиты)
 * - HOC проверяет ТОЛЬКО backend токены (вторая линия защиты)
 * 
 * Порядок проверок:
 * 1. Middleware: NextAuth сессия → если нет → /api/auth/signin
 * 2. HOC: Backend токены → если нет → /login
 * 
 * При отсутствии backend токенов: redirect на /login
 */
export function withAutoRiaAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    requireBackendAuth?: boolean; // По умолчанию true
  } = {}
) {
  const { requireBackendAuth = true } = options;

  return function WithAutoRiaAuthComponent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        // NextAuth сессия УЖЕ проверена middleware
        // Здесь проверяем ТОЛЬКО backend токены
        console.log('[withAutoRiaAuth] Checking backend tokens (session already validated by middleware)');

        // Проверяем backend токены (если требуется)
        if (requireBackendAuth) {
          const backendAuth = localStorage.getItem('backend_auth');
          
          if (!backendAuth) {
            // Попытка рефреша через внутренний API (он сам проверит наличие токенов в Redis)
            console.log('[withAutoRiaAuth] ❌ No backend tokens in localStorage. Trying refresh via /api/auth/refresh ...');
            try {
              const resp = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
              if (resp.ok) {
                const data = await resp.json();
                if (data?.access) {
                  // Синхронизируем localStorage с обновлёнными токенами
                  localStorage.setItem('backend_auth', JSON.stringify({ access: data.access, access_token: data.access, refresh: data.refresh }));
                  console.log('[withAutoRiaAuth] ✅ Refresh succeeded via Redis; tokens saved to localStorage');
                  setIsAuthorized(true);
                  return;
                }
              }
            } catch (e) {
              console.warn('[withAutoRiaAuth] Refresh attempt failed:', e);
            }

            // Редиректим, только если рефреш не удался / в Redis нет токенов
            console.log('[withAutoRiaAuth] ❌ Refresh not available or failed. Redirecting to /login');
            const callbackUrl = encodeURIComponent(pathname || '/autoria');
            router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
            return;
          }

          try {
            const authData = JSON.parse(backendAuth);
            if (!authData?.access || !authData?.refresh) {
              console.log('[withAutoRiaAuth] ❌ Invalid backend tokens in localStorage. Trying refresh via /api/auth/refresh ...');
              localStorage.removeItem('backend_auth');
              try {
                const resp = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
                if (resp.ok) {
                  const data = await resp.json();
                  if (data?.access) {
                    localStorage.setItem('backend_auth', JSON.stringify({ access: data.access, access_token: data.access, refresh: data.refresh }));
                    console.log('[withAutoRiaAuth] ✅ Refresh succeeded; tokens repaired in localStorage');
                    setIsAuthorized(true);
                    return;
                  }
                }
              } catch (e) {
                console.warn('[withAutoRiaAuth] Refresh attempt failed:', e);
              }

              const callbackUrl = encodeURIComponent(pathname || '/autoria');
              router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
              return;
            }

            console.log('[withAutoRiaAuth] ✅ Backend tokens present and valid format');

            // Доп. гарантия: пробуем мягкий рефреш чтобы убедиться, что токены не протухли
            try {
              const soft = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
              if (soft.ok) {
                const data = await soft.json();
                if (data?.access) {
                  localStorage.setItem('backend_auth', JSON.stringify({ access: data.access, access_token: data.access, refresh: data.refresh }));
                  console.log('[withAutoRiaAuth] 🔄 Soft refresh succeeded; tokens updated');
                }
              } else if (soft.status === 401) {
                // Рефреш недоступен → редирект
                console.log('[withAutoRiaAuth] ❌ Soft refresh returned 401; redirecting to /login');
                const callbackUrl = encodeURIComponent(pathname || '/autoria');
                router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
                return;
              }
            } catch (e) {
              console.warn('[withAutoRiaAuth] Soft refresh check failed:', e);
            }
          } catch (error) {
            console.error('[withAutoRiaAuth] ❌ Error parsing backend_auth:', error);
            localStorage.removeItem('backend_auth');
            const callbackUrl = encodeURIComponent(pathname || '/autoria');
            router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
            return;
          }
        }

        // Все проверки пройдены
        setIsAuthorized(true);
      };

      checkAuth();
    }, [router, pathname, requireBackendAuth]);

    // Показываем загрузку во время проверки backend токенов
    if (!isAuthorized) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Перевірка авторизації...</p>
          </div>
        </div>
      );
    }

    // Рендерим компонент только после успешной проверки
    return <WrappedComponent {...props} />;
  };
}

