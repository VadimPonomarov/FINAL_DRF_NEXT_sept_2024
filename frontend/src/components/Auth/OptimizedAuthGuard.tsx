'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { optimizedAuthCheck, requiresAuth, clearAuthCache } from '@/shared/utils/auth/optimizedAuth';

interface OptimizedAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Оптимізований компонент авторизації з кешуванням
 * Швидко перевіряє авторизацію без зайвих запитів
 */
export function OptimizedAuthGuard({ children, fallback }: OptimizedAuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      // Швидка перевірка NextAuth сесії
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated') {
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      if (status === 'authenticated' && session?.user?.email) {
        // Для більшості сторінок NextAuth сесії достатньо
        const currentPath = window.location.pathname;
        
        if (!requiresAuth(currentPath)) {
          setIsAuthorized(true);
          setIsChecking(false);
          return;
        }

        // Для захищених сторінок робимо швидку перевірку
        try {
          const result = await optimizedAuthCheck();
          setIsAuthorized(result.isValid);
          
          if (!result.isValid && result.needsRedirect) {
            router.push(result.redirectTo || '/login');
          }
        } catch (error) {
          console.warn('[OptimizedAuthGuard] Auth check failed:', error);
          setIsAuthorized(true); // Fallback до NextAuth сесії
        }
      }

      setIsChecking(false);
    }

    checkAuth();
  }, [session, status, router]);

  // Очищаємо кеш при зміні сесії
  useEffect(() => {
    if (status !== 'loading') {
      clearAuthCache();
    }
  }, [status]);

  if (isChecking) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Потрібна авторизація</h2>
          <p className="text-gray-600">Будь ласка, увійдіть в систему</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
