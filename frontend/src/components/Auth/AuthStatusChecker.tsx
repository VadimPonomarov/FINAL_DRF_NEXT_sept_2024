"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthStatus {
  hasNextAuthSession: boolean;
  hasBackendTokens: boolean;
  backendTokensValid: boolean;
  isChecking: boolean;
  error: string | null;
}

interface AuthStatusCheckerProps {
  /** Показывать ли визуальные индикаторы проблем */
  showVisualIndicators?: boolean;
  /** Автоматически перенаправлять на login при проблемах */
  autoRedirect?: boolean;
  /** Проверять только на страницах AutoRia */
  autoriaOnly?: boolean;
}

const AuthStatusChecker: React.FC<AuthStatusCheckerProps> = ({
  showVisualIndicators = true,
  autoRedirect = true,
  autoriaOnly = false
}) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    hasNextAuthSession: false,
    hasBackendTokens: false,
    backendTokensValid: false,
    isChecking: true,
    error: null
  });

  // Проверка состояния аутентификации
  const checkAuthStatus = async () => {
    setAuthStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Используем новый API для проверки статуса
      const response = await fetch('/api/auth/status');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check auth status');
      }

      const statusData = result.data;

      setAuthStatus({
        hasNextAuthSession: statusData.hasNextAuthSession,
        hasBackendTokens: statusData.hasBackendTokens,
        backendTokensValid: statusData.backendTokensValid,
        isChecking: false,
        error: statusData.backendError
      });

      // Логика перенаправления
      if (autoRedirect) {
        const currentPath = window.location.pathname;
        const isAutoriaPath = currentPath.startsWith('/autoria');

        // Если мы на странице AutoRia, но нет валидных backend токенов
        if (isAutoriaPath && (!statusData.hasBackendTokens || !statusData.backendTokensValid)) {
          console.log('[AuthStatusChecker] AutoRia page without valid backend tokens, redirecting to login');

          // Показываем уведомление
          toast({
            title: "Требуется аутентификация",
            description: "Для доступа к AutoRia необходимо войти в систему с backend аутентификацией",
            variant: "destructive",
            duration: 5000,
          });

          // Очищаем недействительные токены
          if (statusData.hasBackendTokens && !statusData.backendTokensValid) {
            await fetch('/api/redis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'backend_auth', value: null })
            });
          }

          // Перенаправляем на login
          router.push(`/login?alert=backend_auth_required&message=Please log in with backend authentication to access AutoRia features&callbackUrl=${encodeURIComponent(currentPath)}`);
          return;
        }

        // Если нет NextAuth сессии вообще
        if (!statusData.hasNextAuthSession && !currentPath.startsWith('/api/auth/signin')) {
          console.log('[AuthStatusChecker] No NextAuth session, signing out and redirecting');

          await signOut({ redirect: false });
          router.push('/api/auth/signin');
          return;
        }
      }

    } catch (error: any) {
      console.error('[AuthStatusChecker] Error checking auth status:', error);
      setAuthStatus(prev => ({
        ...prev,
        isChecking: false,
        error: error.message || 'Ошибка проверки аутентификации'
      }));
    }
  };

  // Проверяем при монтировании и изменении сессии
  useEffect(() => {
    if (status !== 'loading') {
      checkAuthStatus();
    }
  }, [session, status]);

  // Периодическая проверка каждые 30 секунд на страницах AutoRia
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isAutoriaPath = currentPath.startsWith('/autoria');

    if (isAutoriaPath) {
      const interval = setInterval(checkAuthStatus, 30000); // 30 секунд
      return () => clearInterval(interval);
    }
  }, []);

  // Если не нужно показывать визуальные индикаторы, возвращаем null
  if (!showVisualIndicators) {
    return null;
  }

  // Показываем индикатор только если есть проблемы
  const hasProblems = !authStatus.hasNextAuthSession || 
                     (window.location.pathname.startsWith('/autoria') && 
                      (!authStatus.hasBackendTokens || !authStatus.backendTokensValid));

  if (!hasProblems && !authStatus.error) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[999999] max-w-md">
      <Alert variant="destructive" className="shadow-lg">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            {authStatus.error ? (
              authStatus.error
            ) : !authStatus.hasNextAuthSession ? (
              "Сессия истекла"
            ) : !authStatus.hasBackendTokens ? (
              "Нет backend токенов"
            ) : !authStatus.backendTokensValid ? (
              "Backend токены недействительны"
            ) : (
              "Проблемы с аутентификацией"
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={checkAuthStatus}
              disabled={authStatus.isChecking}
              className="h-6 px-2 text-xs"
            >
              {authStatus.isChecking ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                "Проверить"
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/login')}
              className="h-6 px-2 text-xs"
            >
              Войти
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AuthStatusChecker;
