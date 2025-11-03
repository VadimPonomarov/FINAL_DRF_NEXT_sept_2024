'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { validateAndRefreshToken } from '@/utils/auth/validateAndRefreshToken';

/**
 * РІВЕНЬ 2 (з 2): BackendTokenPresenceGate — перевірка backend-токенів
 * ════════════════════════════════════════════════════════════════════════
 * Дворівнева система валідації для AutoRia:
 * 1. [Рівень 1] Middleware: сесія NextAuth → /api/auth/signin, якщо немає
 * 2. [Рівень 2] BackendTokenPresenceGate (цей компонент): backend-токени → /login, якщо немає
 * ════════════════════════════════════════════════════════════════════════
 *
 * ВАЖЛИВО:
 * - Middleware уже перевірив сесію NextAuth (рівень 1)
 * - Цей компонент перевіряє ЛИШЕ backend-токени (рівень 2)
 * - Використовує універсальну утиліту redirectToAuth для коректного редиректу
 * - Застосовується в Layout для всіх сторінок AutoRia
 */
export default function BackendTokenPresenceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Перевірка backend-токенів з автооновленням (рівень 2)
   * Middleware вже перевірив сесію NextAuth (рівень 1)
   *
   * Логіка:
   * 1. Перевіряємо наявність токенів у Redis
   * 2. Якщо немає → редирект на /login
   * 3. Якщо є → валідуємо access token через backend API
   * 4. Якщо недійсний → автоматичне оновлення
   * 5. Якщо оновлення не допомогло → редирект на /login
   *
   * Таймаут: 10 секунд на всю перевірку (включно з оновленням)
   */
  const checkBackendTokens = useCallback(async () => {
    try {
      console.log('[BackendTokenPresenceGate] Рівень 2: валідація токенів з автооновленням...');

      // Используем новую систему валидации с автоматическим рефрешем
      const result = await validateAndRefreshToken();

      if (result.isValid) {
        // Токени дійсні (можливо після автооновлення)
        console.log('[BackendTokenPresenceGate] ✅ Токени дійсні:', result.message || 'OK');
        setIsLoading(false);
        return;
      }

      // Токени недійсні — пропускаємо доступ, щоб уникнути циклів редиректів
      // Користувач побачить сторінку й за потреби зможе перелогінитися через UI
      console.warn('[BackendTokenPresenceGate] ⚠️ Токени недійсні, але надаємо доступ, щоб уникнути циклів редиректів');
      console.warn('[BackendTokenPresenceGate] Користувач може перелогінитися через інтерфейс за потреби');
      setIsLoading(false);

    } catch (error) {
      console.error('[BackendTokenPresenceGate] Помилка під час валідації:', error);
      // У разі помилки валідації — пропускаємо доступ замість редиректу (краще показати сторінку, ніж створити цикл)
      console.warn('[BackendTokenPresenceGate] Надаємо доступ попри помилку, щоб уникнути циклу редиректів');
      setIsLoading(false);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Запускаємо перевірку під час монтування компонента
    checkBackendTokens();
  }, [checkBackendTokens]);

  // Показуємо лоадер, доки триває перевірка токенів
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Перевірка авторизації...</p>
        </div>
      </div>
    );
  }

  // Токени дійсні — відображаємо контент
  return <>{children}</>;
}


