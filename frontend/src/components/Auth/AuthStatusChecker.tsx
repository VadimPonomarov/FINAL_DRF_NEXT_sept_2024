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
  /** Чи показувати візуальні індикатори проблем */
  showVisualIndicators?: boolean;
  /** Чи перенаправляти автоматично на login у разі проблем */
  autoRedirect?: boolean;
  /** Чи виконувати перевірку лише на сторінках AutoRia */
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

  // Перевірка стану автентифікації
  const checkAuthStatus = async () => {
    setAuthStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Використовуємо новий API для перевірки статусу
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

      // Логіка перенаправлення
      if (autoRedirect) {
        const currentPath = window.location.pathname;
        const isAutoriaPath = currentPath.startsWith('/autoria');

        // Якщо ми на сторінці AutoRia, але немає дійсних backend-токенів
        if (isAutoriaPath && (!statusData.hasBackendTokens || !statusData.backendTokensValid)) {
          console.log('[AuthStatusChecker] AutoRia page without valid backend tokens, redirecting to login');

          // Показуємо сповіщення
          toast({
            title: "Потрібна автентифікація",
            description: "Для доступу до AutoRia потрібно увійти з backend-автентифікацією",
            variant: "destructive",
            duration: 5000,
          });

          // Очищаємо недійсні токени
          if (statusData.hasBackendTokens && !statusData.backendTokensValid) {
            await fetch('/api/redis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'backend_auth', value: null })
            });
          }

          // Перенаправляємо на login
          router.push(`/login?alert=backend_auth_required&message=Будь%20ласка,%20увійдіть%20із%20backend-%D0%B0%D0%B2%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D1%96%D0%BA%D0%B0%D1%86%D1%96%D1%94%D1%8E%20%D0%B4%D0%BB%D1%8F%20доступу%20до%20функцій%20AutoRia&callbackUrl=${encodeURIComponent(currentPath)}`);
          return;
        }

        // Якщо немає сесії NextAuth взагалі
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

  // Перевіряємо під час монтування та змін сесії
  useEffect(() => {
    if (status !== 'loading') {
      checkAuthStatus();
    }
  }, [session, status]);

  // Періодична перевірка кожні 30 секунд на сторінках AutoRia
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isAutoriaPath = currentPath.startsWith('/autoria');

    if (isAutoriaPath) {
      const interval = setInterval(checkAuthStatus, 30000); // 30 секунд
      return () => clearInterval(interval);
    }
  }, []);

  // Якщо не потрібно показувати візуальні індикатори, повертаємо null
  if (!showVisualIndicators) {
    return null;
  }

  // Показуємо індикатор лише якщо є проблеми
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
              "Сесію завершено"
            ) : !authStatus.hasBackendTokens ? (
              "Немає backend-токенів"
            ) : !authStatus.backendTokensValid ? (
              "Backend-токени недійсні"
            ) : (
              "Проблеми з автентифікацією"
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
                "Перевірити"
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/login')}
              className="h-6 px-2 text-xs"
            >
              Увійти
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AuthStatusChecker;
