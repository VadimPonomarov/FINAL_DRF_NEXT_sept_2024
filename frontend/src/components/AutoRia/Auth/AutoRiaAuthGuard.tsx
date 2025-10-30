"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Клиентский компонент-защитник для проверки backend токенов AutoRia
 * Используется внутри серверного layout для сохранения SSR
 * 
 * ВАЖНО: 
 * - NextAuth сессия проверяется в middleware (первая линия защиты)
 * - Этот компонент проверяет ТОЛЬКО backend токены (вторая линия защиты)
 * 
 * Порядок проверок:
 * 1. Middleware: NextAuth сессия → если нет → /api/auth/signin
 * 2. AuthGuard: Backend токены → если нет → /login
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
      // NextAuth сессия УЖЕ проверена middleware
      // Здесь проверяем ТОЛЬКО backend токены
      console.log('[AutoRiaAuthGuard] Checking backend tokens (session already validated by middleware)');

      // Проверяем backend токены (если требуется)
      if (requireBackendAuth) {
        // Проверяем токены в Redis (НЕ в localStorage)
        try {
          const response = await fetch('/api/redis?key=backend_auth', { cache: 'no-store' });

          if (!response.ok) {
            console.log('[AutoRiaAuthGuard] ❌ Failed to check Redis, redirecting to /login');
            const callbackUrl = encodeURIComponent(pathname || '/autoria');
            router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
            return;
          }

          const data = await response.json();

          if (!data.exists || !data.value) {
            console.log('[AutoRiaAuthGuard] ❌ No backend tokens in Redis, redirecting to /login');
            const callbackUrl = encodeURIComponent(pathname || '/autoria');
            router.replace(`/login?callbackUrl=${callbackUrl}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`);
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

      // Все проверки пройдены
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [router, pathname, requireBackendAuth]);

  // Показываем загрузку во время проверки backend токенов
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

  // Рендерим children только после успешной проверки
  return <>{children}</>;
};

