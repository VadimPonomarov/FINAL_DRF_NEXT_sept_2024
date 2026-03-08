"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Клієнтський компонент-захисник для перевірки backend-токенів AutoRia
 * Використовується всередині серверного layout, щоб зберегти SSR
 *
 * ВАЖЛИВО:
 * - Сесію NextAuth перевіряє middleware (перша лінія захисту)
 * - Цей компонент перевіряє ЛИШЕ backend-токени (друга лінія захисту)
 *
 * Порядок перевірок:
 * 1. Middleware: сесія NextAuth → якщо немає → /api/auth/signin
 * 2. AuthGuard: backend-токени → якщо немає → /login
 */
interface AutoRiaAuthGuardProps {
  children: React.ReactNode;
  requireBackendAuth?: boolean;
}

export const AutoRiaAuthGuard: React.FC<AutoRiaAuthGuardProps> = ({ 
  children, 
  requireBackendAuth = true 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Сесію NextAuth ВЖЕ перевірено middleware
      // Тут перевіряємо ЛИШЕ backend-токени
      console.log('[AutoRiaAuthGuard] Checking backend tokens (session already validated by middleware)');

      // Перевіряємо backend-токени (якщо потрібно)
      if (requireBackendAuth) {
        try {
          const response = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' });
          const data = response.ok ? await response.json() : null;
          const hasTokens = !!(data?.access && data.access.length > 0);

          if (!hasTokens) {
            console.log('[AutoRiaAuthGuard] No tokens in cookies, redirecting to /login');
            const callbackUrl = encodeURIComponent(pathname || '/autoria');
            router.replace(`/login?callbackUrl=${callbackUrl}`);
            return;
          }

          console.log('[AutoRiaAuthGuard] ✅ Backend tokens found in Redis');
        } catch (error) {
          console.error('[AutoRiaAuthGuard] ❌ Error checking backend_auth in Redis:', error);
          const callbackUrl = encodeURIComponent(pathname || '/autoria');
          router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
          return;
        }
      }

      // Усі перевірки пройдено
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [router, pathname, requireBackendAuth]);

  // Показуємо індикатор завантаження під час перевірки backend-токенів
  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Перевірка авторизації...</p>
        </div>
      </div>
    );
  }

  // Рендеримо children лише після успішної перевірки
  return <>{children}</>;
};

export default AutoRiaAuthGuard;

