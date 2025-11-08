'use client';

/**
 * HOC для защиты клиентских компонентов
 * 
 * Функционал:
 * - Проверка наличия NextAuth session
 * - Проверка наличия backend tokens
 * - Автоматический refresh при необходимости
 * - Редирект на /login если авторизация не удалась
 * - Loading state во время проверки
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ComponentType, useEffect, useState } from 'react';
import { validateAndRefreshToken, type TokenValidationResult } from '@/shared/utils/auth/validateAndRefreshToken';

interface WithAuthOptions {
  /**
   * Требуется ли проверка backend токенов (по умолчанию true)
   */
  requireBackendTokens?: boolean;
  
  /**
   * URL для редиректа при неудачной авторизации (по умолчанию /login)
   */
  redirectTo?: string;
  
  /**
   * Показывать ли loader во время проверки (по умолчанию true)
   */
  showLoader?: boolean;
  
  /**
   * Кастомный компонент loader
   */
  LoaderComponent?: ComponentType;
}

/**
 * HOC для защиты компонентов авторизацией
 */
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requireBackendTokens = true,
    redirectTo = '/login',
    showLoader = true,
    LoaderComponent,
  } = options;

  return function WithAuthComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isValidating, setIsValidating] = useState(requireBackendTokens);
    const [validationResult, setValidationResult] = useState<TokenValidationResult | null>(null);

    useEffect(() => {
      async function checkAuth() {
        // Если сессия загружается - ждем
        if (status === 'loading') {
          return;
        }

        // Если нет NextAuth сессии - редирект
        if (status === 'unauthenticated' || !session) {
          console.log('[withAuth] No NextAuth session, redirecting...');
          const currentUrl = window.location.pathname + window.location.search;
          router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(currentUrl)}`);
          return;
        }

        // Если не требуются backend токены - разрешаем доступ
        if (!requireBackendTokens) {
          setIsValidating(false);
          return;
        }

        // Проверяем backend токены
        try {
          console.log('[withAuth] Validating backend tokens...');
          const result = await validateAndRefreshToken();
          setValidationResult(result);

          if (!result.isValid && result.needsRedirect) {
            console.log('[withAuth] Token validation failed, redirecting...');
            const currentUrl = window.location.pathname + window.location.search;
            const redirectUrl = result.redirectTo || redirectTo;
            router.push(`${redirectUrl}?callbackUrl=${encodeURIComponent(currentUrl)}`);
            return;
          }

          if (result.isValid) {
            console.log('[withAuth] ✅ Auth validation successful');
            setIsValidating(false);
          }
        } catch (error) {
          console.error('[withAuth] Validation error:', error);
          setIsValidating(false);
          // Можно добавить toast с ошибкой
        }
      }

      checkAuth();
    }, [session, status, router]);

    // Показываем loader во время проверки
    if (isValidating || status === 'loading') {
      if (!showLoader) {
        return null;
      }

      if (LoaderComponent) {
        return <LoaderComponent />;
      }

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Проверка авторизации...</p>
          </div>
        </div>
      );
    }

    // Если проверка пройдена - рендерим компонент
    return <WrappedComponent {...props} />;
  };
}

/**
 * Хук для проверки статуса авторизации в компонентах
 */
export function useAuthStatus() {
  const { data: session, status } = useSession();
  const [backendTokensValid, setBackendTokensValid] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendTokens = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const result = await validateAndRefreshToken();
      setBackendTokensValid(result.isValid);
      return result;
    } catch (error) {
      console.error('[useAuthStatus] Error checking tokens:', error);
      setBackendTokensValid(false);
      return { isValid: false, needsRedirect: true };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    hasSession: status === 'authenticated' && !!session,
    isLoading: status === 'loading',
    backendTokensValid,
    isChecking,
    checkBackendTokens,
    session,
  };
}
