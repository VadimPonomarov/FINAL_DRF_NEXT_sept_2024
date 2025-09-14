// Small helper to centralize auth-aware fetch with a single refresh attempt
// Usage: await fetchWithAuth('/api/autoria/favorites/toggle', { method: 'POST', body: JSON.stringify({ car_ad_id }) })
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const resp = await fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (resp.status !== 401) return resp;

  // Try to refresh once via internal API
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const refresh = await fetch(`${origin}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
    if (refresh.ok) {
      const retry = await fetch(input, {
        ...init,
        credentials: init.credentials ?? 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        cache: 'no-store'
      });
      if (retry.status !== 401) return retry;
    }
  } catch (_) {}

  // Still unauthorized: redirect to /login with callback
  if (typeof window !== 'undefined') {
    const callback = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?callbackUrl=${callback}`;
  }
  return resp; // Return the 401 response for callers on the server side
}

