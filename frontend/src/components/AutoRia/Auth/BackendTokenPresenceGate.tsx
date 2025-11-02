'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { validateAndRefreshToken } from '@/utils/auth/validateAndRefreshToken';

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
   * Проверка backend токенов с автоматическим рефрешем (уровень 2)
   * Middleware уже проверил NextAuth сессию (уровень 1)
   * 
   * Логика:
   * 1. Проверяем наличие токенов в Redis
   * 2. Если нет → редирект на /login
   * 3. Если есть → валидируем access token
   * 4. Если невалиден → автоматический рефреш
   * 5. Если рефреш не помог → редирект на /login
   */
  const checkBackendTokens = useCallback(async (isRetry = false) => {
    try {
      console.log('[BackendTokenPresenceGate] Level 2: Validating tokens with auto-refresh...');

      // Используем новую систему валидации с автоматическим рефрешем
      const result = await validateAndRefreshToken();

      if (result.isValid) {
        // Токены валидны (возможно после рефреша)
        console.log('[BackendTokenPresenceGate] ✅ Tokens valid:', result.message || 'OK');
        setIsLoading(false);
        return;
      }

      // Токены невалидны и рефреш не помог
      if (result.needsRedirect) {
        console.log('[BackendTokenPresenceGate] ❌ Tokens invalid, redirecting to:', result.redirectTo);
        const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
        const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        
        if (result.redirectTo === '/login') {
          redirectToAuth(currentPath, 'tokens_not_found');
        } else {
          redirectToAuth(currentPath, 'auth_required');
        }
        return;
      }

      // Fallback: если что-то пошло не так
      console.log('[BackendTokenPresenceGate] ⚠️ Unexpected validation result, allowing access');
      setIsLoading(false);

    } catch (error) {
      console.error('[BackendTokenPresenceGate] Error during validation:', error);
      
      // При ошибке валидации - редиректим
      const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
      const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      redirectToAuth(currentPath, 'auth_required');
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Запускаем проверку при монтировании
    checkBackendTokens();
  }, [checkBackendTokens]);

  // Показываем лоадер пока проверяем токены
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Токены валидны - показываем контент
  return <>{children}</>;
}


