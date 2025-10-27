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
 * 1. Делает запрос к API
 * 2. При 401 → пытается refresh токена через /api/auth/refresh
 * 3. При успехе refresh → повторяет оригинальный запрос
 * 4. При провале refresh или 403 → redirect на /login
 *
 * Цель: Обрабатывать протухшие токены во время работы (runtime)
 *
 * Usage: await fetchWithAuth('/api/autoria/favorites/toggle', { method: 'POST', body: JSON.stringify({ car_ad_id }) })
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  console.log('[fetchWithAuth] Making request to:', input);

  const resp = await fetch(input, {
    ...init,
    // НЕ используем credentials: 'include', так как мы используем Bearer токены в заголовках
    // credentials: 'include' вызывает CORS ошибку с Access-Control-Allow-Origin: *
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store'
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
    const refresh = await fetch(`${origin}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });

    if (refresh.ok) {
      console.log('[fetchWithAuth] ✅ Token refresh successful, retrying original request...');

      const retry = await fetch(input, {
        ...init,
        // НЕ используем credentials: 'include'
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        cache: 'no-store'
      });

      if (retry.status !== 401) {
        console.log('[fetchWithAuth] ✅ Retry successful, status:', retry.status);
        return retry;
      }

      console.log('[fetchWithAuth] ❌ Retry still returned 401, tokens are invalid');
    } else {
      console.log('[fetchWithAuth] ❌ Token refresh failed, status:', refresh.status);
    }
  } catch (error) {
    console.error('[fetchWithAuth] ❌ Error during token refresh:', error);
  }

  // Still unauthorized: redirect to /login with callback
  // Обработчики 401/403 ошибок - редиректим на /login для получения backend токенов
  if (typeof window !== 'undefined') {
    console.log('[fetchWithAuth] ❌ Token refresh failed, redirecting to /login');
    const callback = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?callbackUrl=${callback}&error=backend_auth_required&message=${encodeURIComponent('Необхідно авторизуватися для доступу до AutoRia')}`;
  }

  return resp; // Return the 401 response for callers on the server side
}

