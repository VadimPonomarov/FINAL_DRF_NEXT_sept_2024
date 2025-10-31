'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

/**
 * Защитный компонент для проверки аутентификации в разделе AutoRia.
 * 1. Проверяет валидность сессии NextAuth
 * 2. Проверяет валидность backend токенов
 * 3. При невалидной сессии - редирект на /signin
 * 4. При невалидных токенах - редирект на /login
 */
export default function BackendTokenPresenceGate({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Перенаправление на страницу входа в аккаунт (/login)
   * Используется при невалидных токенах
   */
  const redirectToLogin = useCallback(() => {
    const callbackUrl = encodeURIComponent(
      `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    
    toast({
      title: 'Требуется авторизация',
      description: 'Пожалуйста, войдите в аккаунт',
      type: 'destructive',
    });

    router.replace(`/login?callbackUrl=${callbackUrl}`);
  }, [pathname, searchParams, router, toast]);

  /**
   * Перенаправление на страницу входа в систему (/signin)
   * Используется при невалидной сессии
   */
  const redirectToSignIn = useCallback(() => {
    const callbackUrl = encodeURIComponent(
      `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    
    // Используем встроенный метод NextAuth для входа
    signIn(undefined, { callbackUrl: `/${callbackUrl}` });
  }, [pathname, searchParams]);

  /**
   * Проверка аутентификации
   * 1. Сначала проверяем сессию NextAuth
   * 2. Затем проверяем backend токены
   */
  const checkAuth = useCallback(async (isRetry = false) => {
    try {
      // 1. Проверяем сессию NextAuth
      const sessionCheck = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (!sessionCheck.ok) {
        // Сессия невалидна - редирект на /signin
        console.log('Session check failed, redirecting to sign in');
        return redirectToSignIn();
      }

      try {
        // 2. Проверяем backend токены
        const tokenCheck = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (tokenCheck.ok) {
          // Обе проверки пройдены, доступ разрешен
          console.log('Authentication successful');
          setIsLoading(false);
          return;
        }

        // Обработка ошибок API
        const errorData = await tokenCheck.json().catch(() => ({}));
        console.log('Token check failed:', {
          status: tokenCheck.status,
          statusText: tokenCheck.statusText,
          error: errorData
        });

        // Если получили 400, 401 и это первая попытка, пробуем обновить токен
        if ((tokenCheck.status === 400 || tokenCheck.status === 401) && !isRetry) {
          console.log('Attempting to refresh token...');
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            console.log('Token refresh successful, retrying auth check...');
            return checkAuth(true);
          }
          
          console.log('Token refresh failed:', await refreshResponse.text());
        }
      } catch (apiError) {
        console.error('Error during token check:', apiError);
      }

      // Если дошли сюда, значит не удалось обновить токен
      console.log('Redirecting to login...');
      redirectToLogin();

    } catch (error) {
      console.error('Ошибка при проверке аутентификации:', error);
      // При любой ошибке редиректим на вход
      redirectToSignIn();
    }
  }, [redirectToLogin, redirectToSignIn]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}


