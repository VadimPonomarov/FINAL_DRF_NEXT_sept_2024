'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { validateAndRefreshToken } from '@/shared/utils/auth/validateAndRefreshToken';

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
 * - КРИТИЧНО: Блокирует доступ к контенту, если токенов нет
 * - Редирект на /login происходит немедленно при отсутствии токенов
 * - Проверка срабатывает при монтировании И при изменении страницы
 */
export default function BackendTokenPresenceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const redirectingRef = useRef(false);

  /**
   * Перевірка backend-токенів з автооновленням (рівень 2)
   * Middleware вже перевірив сесію NextAuth (рівень 1)
   *
   * Логіка:
   * 1. Перевіряємо наявність токенів у Redis
   * 2. Якщо немає → НЕМЕДЛЕННО редирект на /login (БЕЗ показа контента)
   * 3. Якщо є → валідуємо access token через backend API
   * 4. Якщо недійсний → автоматичне оновлення
   * 5. Якщо оновлення не допомогло → редирект на /login
   *
   * КРИТИЧНО: Контент НЕ показывается, пока токены не валидны
   */
  const checkBackendTokens = useCallback(async () => {
    // Предотвращаем множественные редиректы
    if (redirectingRef.current) {
      console.log('[BackendTokenPresenceGate] Redirect already in progress, skipping check');
      return;
    }

    try {
      console.log('[BackendTokenPresenceGate] 🔒 Рівень 2: валідація токенів з автооновленням...');
      console.log('[BackendTokenPresenceGate] Current path:', pathname);

      // КРИТИЧНО: Сначала проверяем наличие токенов напрямую через Redis API
      // Это быстрая проверка, которая не зависит от других систем
      const redisCheck = await fetch('/api/redis?key=backend_auth', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!redisCheck.ok) {
        console.error('[BackendTokenPresenceGate] ❌ Redis check failed:', redisCheck.status);
        throw new Error('Redis check failed');
      }

      const redisData = await redisCheck.json();
      
      // КРИТИЧНО: Строгая проверка наличия и валидности токенов
      const hasTokens = redisData?.exists === true && 
                       redisData?.value && 
                       typeof redisData.value === 'string' && 
                       redisData.value.trim().length > 0;

      if (!hasTokens) {
        console.error('[BackendTokenPresenceGate] ❌ Токени відсутні в Redis');
        console.error('[BackendTokenPresenceGate] 🚫 БЛОКИРОВКА ДОСТУПА - редирект на /login');
        
        redirectingRef.current = true;
        setIsLoading(false);
        setIsAuthorized(false);

        const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        const params = new URLSearchParams();
        if (currentPath !== '/autoria') {
          params.set('callbackUrl', currentPath);
        }
        params.set('error', 'backend_auth_required');
        const loginUrl = `/login?${params.toString()}`;
        
        console.log('[BackendTokenPresenceGate] Redirecting to:', loginUrl);
        if (typeof window !== 'undefined') {
          window.location.replace(loginUrl);
        }
        return;
      }

      // Дополнительная проверка: валидация структуры токенов
      try {
        const parsed = JSON.parse(redisData.value);
        const hasAccessToken = parsed?.access && typeof parsed.access === 'string' && parsed.access.trim().length > 0;
        const hasRefreshToken = parsed?.refresh && typeof parsed.refresh === 'string' && parsed.refresh.trim().length > 0;
        
        if (!hasAccessToken || !hasRefreshToken) {
          console.error('[BackendTokenPresenceGate] ❌ Токени в Redis мають невалідну структуру:', { hasAccess: hasAccessToken, hasRefresh: hasRefreshToken });
          console.error('[BackendTokenPresenceGate] 🚫 БЛОКИРОВКА ДОСТУПА - редирект на /login');
          
          redirectingRef.current = true;
          setIsLoading(false);
          setIsAuthorized(false);

          const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
          const params = new URLSearchParams();
          if (currentPath !== '/autoria') {
            params.set('callbackUrl', currentPath);
          }
          params.set('error', 'backend_auth_required');
          const loginUrl = `/login?${params.toString()}`;
          
          console.log('[BackendTokenPresenceGate] Redirecting to (invalid structure):', loginUrl);
          if (typeof window !== 'undefined') {
            window.location.replace(loginUrl);
          }
          return;
        }
      } catch (parseError) {
        console.error('[BackendTokenPresenceGate] ❌ Помилка парсингу токенів з Redis:', parseError);
        console.error('[BackendTokenPresenceGate] 🚫 БЛОКИРОВКА ДОСТУПА - редирект на /login');
        
        redirectingRef.current = true;
        setIsLoading(false);
        setIsAuthorized(false);

        const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        const params = new URLSearchParams();
        if (currentPath !== '/autoria') {
          params.set('callbackUrl', currentPath);
        }
        params.set('error', 'backend_auth_required');
        const loginUrl = `/login?${params.toString()}`;
        
        console.log('[BackendTokenPresenceGate] Redirecting to (parse error):', loginUrl);
        if (typeof window !== 'undefined') {
          window.location.replace(loginUrl);
        }
        return;
      }

      // Если токены есть в Redis, используем полную валидацию
      const result = await validateAndRefreshToken();

      if (result.isValid) {
        // Токени дійсні (можливо після автооновлення)
        console.log('[BackendTokenPresenceGate] ✅ Токени дійсні:', result.message || 'OK');
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Токени недійсні — НЕМЕДЛЕННО редирект на /login БЕЗ показа контента
      console.error('[BackendTokenPresenceGate] ❌ Токени недійсні або відсутні');
      console.error('[BackendTokenPresenceGate] 🚫 БЛОКИРОВКА ДОСТУПА - редирект на /login');
      
      redirectingRef.current = true;
      setIsLoading(false);
      setIsAuthorized(false);

      // Немедленный редирект на /login с сохранением текущего пути для возврата
      const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      const params = new URLSearchParams();
      if (currentPath !== '/autoria') {
        params.set('callbackUrl', currentPath);
      }
      params.set('error', 'backend_auth_required');
      const loginUrl = `/login?${params.toString()}`;
      
      console.log('[BackendTokenPresenceGate] Redirecting to:', loginUrl);
      // Используем window.location.replace для немедленного редиректа (не добавляет в историю)
      if (typeof window !== 'undefined') {
        window.location.replace(loginUrl);
      } else {
        router.push(loginUrl);
      }

    } catch (error) {
      console.error('[BackendTokenPresenceGate] ❌ Помилка під час валідації:', error);
      // У разі помилки — також виконуємо редирект, оскільки це може вказувати на проблеми з токенами
      console.error('[BackendTokenPresenceGate] 🚫 БЛОКИРОВКА ДОСТУПА через помилку валідації');
      
      redirectingRef.current = true;
      setIsLoading(false);
      setIsAuthorized(false);

      const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      const params = new URLSearchParams();
      if (currentPath !== '/autoria') {
        params.set('callbackUrl', currentPath);
      }
      params.set('error', 'backend_auth_required');
      const loginUrl = `/login?${params.toString()}`;
      
      console.log('[BackendTokenPresenceGate] Redirecting to (error):', loginUrl);
      // Используем window.location.replace для немедленного редиректа (не добавляет в историю)
      if (typeof window !== 'undefined') {
        window.location.replace(loginUrl);
      } else {
        router.push(loginUrl);
      }
    }
  }, [pathname, searchParams, router]);

  // КРИТИЧНО: Проверка при монтировании И при изменении страницы
  useEffect(() => {
    // Сбрасываем флаг редиректа при изменении страницы
    redirectingRef.current = false;
    setIsLoading(true);
    setIsAuthorized(false);
    
    // Запускаємо перевірку під час монтування компонента И при изменении страницы
    checkBackendTokens();
  }, [checkBackendTokens, pathname]);

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

  // КРИТИЧНО: Показываем контент ТОЛЬКО если авторизованы
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Перенаправлення на сторінку входу...</p>
        </div>
      </div>
    );
  }

  // Токени дійсні — відображаємо контент
  return <>{children}</>;
}


