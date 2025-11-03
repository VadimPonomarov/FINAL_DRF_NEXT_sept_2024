"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * HOC для захисту сторінок AutoRia
 *
 * ВАЖЛИВО:
 * - Сесію NextAuth перевіряє middleware (перша лінія захисту)
 * - HOC перевіряє ЛИШЕ backend-токени (друга лінія захисту)
 *
 * Порядок перевірок:
 * 1. Middleware: сесія NextAuth → якщо немає → /api/auth/signin
 * 2. HOC: backend-токени → якщо немає → /login
 *
 * За відсутності backend-токенів виконується редирект на /login
 */
export function withAutoRiaAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    requireBackendAuth?: boolean; // Типово true
  } = {}
) {
  const { requireBackendAuth = true } = options;

  return function WithAutoRiaAuthComponent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        // Сесію NextAuth ВЖЕ перевірено middleware
        // Тут перевіряємо ЛИШЕ backend-токени
        console.log('[withAutoRiaAuth] Checking backend tokens (session already validated by middleware)');

        // Перевіряємо backend-токени (якщо потрібно)
        if (requireBackendAuth) {
          const backendAuth = localStorage.getItem('backend_auth');
          
          if (!backendAuth) {
            // Спроба оновлення через внутрішній API (він сам перевірить наявність токенів у Redis)
            console.log('[withAutoRiaAuth] ❌ No backend tokens in localStorage. Trying refresh via /api/auth/refresh ...');
            try {
              const resp = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
              if (resp.ok) {
                const data = await resp.json();
                if (data?.access) {
                  // Синхронізуємо localStorage з оновленими токенами
                  localStorage.setItem('backend_auth', JSON.stringify({ access: data.access, access_token: data.access, refresh: data.refresh }));
                  console.log('[withAutoRiaAuth] ✅ Refresh succeeded via Redis; tokens saved to localStorage');
                  setIsAuthorized(true);
                  return;
                }
              }
            } catch (e) {
              console.warn('[withAutoRiaAuth] Refresh attempt failed:', e);
            }

            // Редиректимо лише якщо оновлення не вдалося / у Redis немає токенів
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

            // Додаткова гарантія: виконуємо м’яке оновлення, щоб переконатися, що токени не протерміновані
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

    // Показуємо індикатор завантаження під час перевірки backend-токенів
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

    // Рендеримо компонент лише після успішної перевірки
    return <WrappedComponent {...props} />;
  };
}

