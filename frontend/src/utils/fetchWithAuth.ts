/**
 * Centralized auth-aware fetch with automatic token refresh and user notifications
 *
 * Workflow:
 * 1. Makes initial request
 * 2. If 401 (Unauthorized), attempts to refresh tokens via /api/auth/refresh
 * 3. If refresh succeeds, retries the original request
 * 4. If refresh fails or second request returns 401, shows toast and redirects to /login
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

  if (resp.status !== 401) {
    console.log('[fetchWithAuth] Request successful, status:', resp.status);
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

  // Still unauthorized: show toast and redirect to /login with callback
  if (typeof window !== 'undefined') {
    console.log('[fetchWithAuth] 🔄 Redirecting to login page...');

    // Динамически импортируем toast для показа уведомления
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: "Требуется авторизация",
        description: "Ваша сессия истекла. Пожалуйста, войдите снова для доступа к ресурсам.",
        variant: "destructive",
        duration: 5000,
      });
    }).catch(err => {
      console.error('[fetchWithAuth] Failed to show toast:', err);
    });

    // Небольшая задержка для показа toast перед редиректом
    setTimeout(() => {
      const callback = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?callbackUrl=${callback}&message=${encodeURIComponent('Ваша сессия истекла. Пожалуйста, войдите снова.')}`;
    }, 500);
  }

  return resp; // Return the 401 response for callers on the server side
}

