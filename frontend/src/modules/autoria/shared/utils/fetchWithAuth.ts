import { ensureValidTokens } from './proactiveTokenCheck';

/**
 * РІВЕНЬ 3 (з 3): Обробники помилок 401/403 з ПРОАКТИВНОЮ перевіркою токенів
 * ════════════════════════════════════════════════════════════════════════
 * Трирівнева система валідації:
 * 1. Middleware: сесія NextAuth → /api/auth/signin, якщо немає
 * 2. HOC withAutoRiaAuth: backend-токени → /login, якщо немає
 * 3. [ЦЕЙ РІВЕНЬ] fetchWithAuth: ПРОАКТИВНА перевірка + обробка 401/403
 * ════════════════════════════════════════════════════════════════════════
 *
 * Алгоритм роботи:
 * 1. ПЕРЕД запитом перевіряє токен в Redis і його валідність
 * 2. Якщо токен протермінований — оновлює ПЕРЕД відправкою запиту
 * 3. Виконує запит до API (токени додаються на сервері з Redis)
 * 4. За 401 (якщо все ж таки виник) → намагається оновити токен
 * 5. Якщо оновлення не вдалося або статус 403 → редирект на /login
 *
 * Мета: УНИКНУТИ 401 помилок в консолі браузера через проактивну перевірку
 *
 * ВАЖЛИВО: токени НЕ зберігаються в localStorage на клієнті!
 * Токени зберігаються в Redis і додаються на сервері в API routes через getAuthorizationHeaders()
 *
 * Використання: await fetchWithAuth('/api/autoria/favorites/toggle', { method: 'POST', body: JSON.stringify({ car_ad_id }) })
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  console.log('[fetchWithAuth] Виконуємо запит до:', input);

  // ПРОАКТИВНА ПЕРЕВІРКА: перевіряємо токени ПЕРЕД відправкою запиту
  // Якщо токен протермінований - оновлюємо його ДО виконання основного запиту
  // Це запобігає появі 401 помилок в консолі браузера
  const tokensValid = await ensureValidTokens();
  if (!tokensValid) {
    console.warn('[fetchWithAuth] Tokens are not valid, proceeding with request (BackendTokenPresenceGate handles /autoria/* redirects)');
    // НЕ редиректимо тут — BackendTokenPresenceGate (рівень 2) централізовано обробляє всі /autoria/* сторінки.
    // Проактивний редирект тут створював петлю: пошукова сторінка → /login → /autoria/search → /login → ...
  }

  // Виконуємо запит БЕЗ додавання токенів на клієнті
  // Токени додаються на сервері в API routes через getAuthorizationHeaders() з Redis
  const resp = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store',
    credentials: 'include' // Важливо для передачі cookies із сесією
  });

  // Перевіряємо статус відповіді — обробляємо 401 та 403
  if (resp.status !== 401 && resp.status !== 403) {
    console.log('[fetchWithAuth] Запит успішний, статус:', resp.status);
    return resp;
  }

  // 403 Forbidden — редирект з тротлінгом (10 секунд між редиректами)
  if (resp.status === 403) {
    console.log('[fetchWithAuth] ❌ 403 Заборонено');
    if (typeof window !== 'undefined') {
      try {
        const now = Date.now();
        const last = Number(window.sessionStorage.getItem('auth:lastRedirectTs') || '0');
        if (now - last < 10000) {
          console.warn('[fetchWithAuth] Придушуємо редирект 403 (тротлінг)');
          return resp;
        }
        window.sessionStorage.setItem('auth:lastRedirectTs', String(now));
      } catch {}
      const { redirectToAuth } = await import('@/shared/utils/auth/redirectToAuth');
      redirectToAuth(window.location.pathname + window.location.search, 'auth_required');
    }
    return resp;
  }

  console.log('[fetchWithAuth] ⚠️ Отримано 401 Unauthorized, намагаємося оновити токен...');

  // Пробуємо один раз оновити токен через внутрішній API
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const refresh = await fetch(`${origin}/api/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include'
    });

    if (refresh.ok) {
      console.log('[fetchWithAuth] ✅ Токен успішно оновлено, повторюємо оригінальний запит...');

      const retry = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        cache: 'no-store',
        credentials: 'include'
      });

      if (retry.status !== 401) {
        console.log('[fetchWithAuth] ✅ Повторний запит успішний, статус:', retry.status);
        return retry;
      }

      console.log('[fetchWithAuth] ❌ Повторний запит все ще повернув 401, токени недійсні');
    } else {
      const refreshStatus = refresh.status;
      console.log('[fetchWithAuth] ❌ Не вдалося оновити токен, статус:', refreshStatus);
      
      // Якщо refresh повернув 404 — токени не знайдені в Redis
      // Використовуємо правильний редирект з урахуванням багаторівневої системи
      if (refreshStatus === 404) {
        console.log('[fetchWithAuth] ❌ Токени не знайдено в Redis (404), перевіряємо сесію NextAuth і редиректимо');
        if (typeof window !== 'undefined') {
          const { redirectToAuth } = await import('@/shared/utils/auth/redirectToAuth');
          const currentPath = window.location.pathname + window.location.search;
          redirectToAuth(currentPath, 'tokens_not_found');
          return resp; // Return early to prevent further processing
        }
      }
    }
  } catch (error) {
    console.error('[fetchWithAuth] ❌ Помилка під час оновлення токена:', error);
  }

  // Persistent 401 after refresh failure — редирект з тротлінгом
  if (typeof window !== 'undefined') {
    try {
      const now = Date.now();
      const last = Number(window.sessionStorage.getItem('auth:lastRedirectTs') || '0');
      if (now - last < 10000) {
        console.warn('[fetchWithAuth] Придушуємо редирект 401 (тротлінг)');
        return resp;
      }
      window.sessionStorage.setItem('auth:lastRedirectTs', String(now));
    } catch {}

    console.log('[fetchWithAuth] ❌ Токен не вдалося оновити — редирект на логін');
    const { redirectToAuth } = await import('@/shared/utils/auth/redirectToAuth');
    redirectToAuth(window.location.pathname + window.location.search, 'auth_required');
  }

  return resp; // Повертаємо відповідь 401 для викликів на серверному боці
}

