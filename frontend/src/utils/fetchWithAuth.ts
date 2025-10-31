/**
 * УРОВЕНЬ 3 (из 3): Обработчики ошибок 401/403
 * ════════════════════════════════════════════════════════════════════════
 * Трехуровневая система валидации:
 * 1. Middleware: NextAuth сессия → /api/auth/signin если нет
 * 2. HOC withAutoRiaAuth: Backend токены → /login если нет
 * 3. [ЭТОТ УРОВЕНЬ] fetchWithAuth: Обработка 401/403 → auto-refresh + /login
 * ════════════════════════════════════════════════════════════════════════
 *
 * Workflow:
 * 1. Делает запрос к API (токены добавляются на сервере из Redis)
 * 2. При 401 → пытается refresh токена через /api/auth/refresh
 * 3. При успехе refresh → повторяет оригинальный запрос
 * 4. При провале refresh или 403 → redirect на /login
 *
 * Цель: Обрабатывать протухшие токены во время работы (runtime)
 *
 * ВАЖНО: Токены НЕ хранятся в localStorage на клиенте!
 * Токены хранятся в Redis и добавляются на сервере в API routes через getAuthorizationHeaders()
 *
 * Usage: await fetchWithAuth('/api/autoria/favorites/toggle', { method: 'POST', body: JSON.stringify({ car_ad_id }) })
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  console.log('[fetchWithAuth] Making request to:', input);

  // Делаем запрос БЕЗ добавления токенов на клиенте
  // Токены добавляются на сервере в API routes через getAuthorizationHeaders() из Redis
  const resp = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store',
    credentials: 'include' // Важно для передачи cookies с сессией
  });

  // Проверяем статус ответа - обрабатываем 401 и 403
  if (resp.status !== 401 && resp.status !== 403) {
    console.log('[fetchWithAuth] Request successful, status:', resp.status);
    return resp;
  }

  // 403 Forbidden - нет прав доступа, редиректим на /login сразу
  if (resp.status === 403) {
    console.log('[fetchWithAuth] ❌ 403 Forbidden - redirecting to /login');
    if (typeof window !== 'undefined') {
      const callback = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?callbackUrl=${callback}&error=forbidden&message=${encodeURIComponent('Необхідна авторизація для доступу до цього ресурсу')}`;
    }
    return resp;
  }

  console.log('[fetchWithAuth] ⚠️ Received 401 Unauthorized, attempting token refresh...');

  // Try to refresh once via internal API
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const refresh = await fetch(`${origin}/api/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include'
    });

    if (refresh.ok) {
      console.log('[fetchWithAuth] ✅ Token refresh successful, retrying original request...');

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
        console.log('[fetchWithAuth] ✅ Retry successful, status:', retry.status);
        return retry;
      }

      console.log('[fetchWithAuth] ❌ Retry still returned 401, tokens are invalid');
    } else {
      const refreshStatus = refresh.status;
      console.log('[fetchWithAuth] ❌ Token refresh failed, status:', refreshStatus);
      
      // Если refresh вернул 404 - токены не найдены в Redis
      // Используем правильный редирект с учетом многоуровневой системы
      if (refreshStatus === 404) {
        console.log('[fetchWithAuth] ❌ Tokens not found in Redis (404), checking NextAuth session and redirecting');
        if (typeof window !== 'undefined') {
          const { redirectToAuth } = await import('./auth/redirectToAuth');
          const currentPath = window.location.pathname + window.location.search;
          redirectToAuth(currentPath, 'tokens_not_found');
          return resp; // Return early to prevent further processing
        }
      }
    }
  } catch (error) {
    console.error('[fetchWithAuth] ❌ Error during token refresh:', error);
  }

  // Still unauthorized: redirect with proper auth level checking
  // Обработчики 401/403 ошибок - правильный редирект с учетом многоуровневой системы
  if (typeof window !== 'undefined') {
    console.log('[fetchWithAuth] ❌ Token refresh failed, checking NextAuth session and redirecting');
    const { redirectToAuth } = await import('./auth/redirectToAuth');
    const currentPath = window.location.pathname + window.location.search;
    redirectToAuth(currentPath, 'auth_required');
  }

  return resp; // Return the 401 response for callers on the server side
}

