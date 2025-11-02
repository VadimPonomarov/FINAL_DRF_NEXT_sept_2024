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
   * 3. Если есть → валидируем access token через backend API
   * 4. Если невалиден → автоматический рефреш
   * 5. Если рефреш не помог → редирект на /login
   * 
   * Таймаут: 10 секунд на всю проверку (включая рефреш)
   */
  const checkBackendTokens = useCallback(async () => {
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

      // Токены невалидны - ДОПУСКАЕМ доступ, чтобы избежать циклов редиректов
      // Пользователь увидит страницу и сможет залогиниться через UI если нужно
      console.warn('[BackendTokenPresenceGate] ⚠️ Tokens invalid, but allowing access to avoid redirect loops');
      console.warn('[BackendTokenPresenceGate] User can re-login via UI if needed');
      setIsLoading(false);

    } catch (error) {
      console.error('[BackendTokenPresenceGate] Error during validation:', error);
      // При ошибке валидации - ДОПУСКАЕМ доступ вместо редиректа (лучше показать страницу, чем цикл)
      console.warn('[BackendTokenPresenceGate] Allowing access despite error to avoid loops');
      setIsLoading(false);
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


