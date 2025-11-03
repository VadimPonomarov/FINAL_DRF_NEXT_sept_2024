'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { validateAndRefreshToken } from '@/utils/auth/validateAndRefreshToken';
import { redirectToAuth } from '@/utils/auth/redirectToAuth';

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

      // Токени недійсні — виконуємо редирект на /login
      console.error('[BackendTokenPresenceGate] ❌ Токени недійсні або відсутні');
      console.log('[BackendTokenPresenceGate] Виконується редирект на /login...');
      
      // Використовуємо redirectToAuth для коректного редиректу з урахуванням багаторівневої системи
      await redirectToAuth(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''), 'tokens_not_found');

    } catch (error) {
      console.error('[BackendTokenPresenceGate] Помилка під час валідації:', error);
      // У разі помилки — також виконуємо редирект, оскільки це може вказувати на проблеми з токенами
      console.log('[BackendTokenPresenceGate] Виконується редирект через помилку валідації...');
      await redirectToAuth(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''), 'auth_required');
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


