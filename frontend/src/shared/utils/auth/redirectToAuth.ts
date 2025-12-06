/**
 * Утилита для правильного редиректа с учетом многоуровневой системы авторизации
 * 
 * Порядок проверок:
 * 1. Уровень 1: NextAuth сессия (signin) - проверяется через API
 * 2. Уровень 2: Backend токены - проверяется на странице /login
 * 
 * Если токены не найдены (404 от refresh):
 * - Если есть NextAuth сессия → редирект на /login для получения backend токенов
 * - Если нет NextAuth сессии → редирект на /api/auth/signin для получения сессии
 */

/**
 * Проверяет наличие NextAuth сессии через API статуса
 */
async function checkNextAuthSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return !!data?.user;
  } catch (error) {
    console.error('[redirectToAuth] Error checking NextAuth session:', error);
    return false;
  }
}

/**
 * Правильно перенаправляет пользователя с учетом многоуровневой системы
 * 
 * @param currentPath - текущий путь для callbackUrl
 * @param reason - причина редиректа (для сообщения пользователю)
 */
export async function redirectToAuth(
  currentPath?: string,
  reason: 'session_expired' | 'tokens_not_found' | 'auth_required' = 'session_expired'
): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('[redirectToAuth] Called on server, skipping redirect');
    return;
  }

  // Глобальная защита от циклов редиректов: не чаще одного раза в 10 секунд
  try {
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem('auth:lastRedirectTs') || '0');
    if (now - last < 10000) {
      console.warn('[redirectToAuth] Suppress redirect (throttled)');
      return;
    }
    window.sessionStorage.setItem('auth:lastRedirectTs', String(now));
  } catch (error) {
    console.warn('[redirectToAuth] Failed to access sessionStorage', error);
  }

  const path = currentPath || window.location.pathname + window.location.search;
  const messages: Record<string, string> = {
    session_expired: 'Сесія закінчилася. Будь ласка, увійдіть знову.',
    tokens_not_found: 'Потрібна авторизація. Будь ласка, увійдіть.',
    auth_required: 'Потрібна авторизація для доступу до цього ресурсу.'
  };

  const message = messages[reason] || messages.session_expired;

  // Защита от циклов: если уже на /login или на странице signin — ничего не делаем
  const currentPathname = window.location.pathname;
  if (currentPathname.startsWith('/login')) {
    console.warn('[redirectToAuth] Already on /login, skip redirect to avoid loop');
    return;
  }
  if (currentPathname.startsWith('/api/auth/signin')) {
    console.warn('[redirectToAuth] Already on /api/auth/signin, skip redirect to avoid loop');
    return;
  }

  console.log('[redirectToAuth] Checking NextAuth session before redirect...');

  // Проверяем наличие NextAuth сессии
  const hasSession = await checkNextAuthSession();

  if (hasSession) {
    // Уровень 1 пройден (NextAuth сессия есть)
    // Редиректим на /login для получения backend токенов (уровень 2)
    console.log('[redirectToAuth] ✅ NextAuth session exists, redirecting to /login for backend tokens');
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(path)}&error=${reason}&message=${encodeURIComponent(message)}`;
    console.log('[redirectToAuth] Executing redirect to:', loginUrl);
    window.location.replace(loginUrl); // Используем replace вместо href для принудительного редиректа
  } else {
    // Уровень 1 не пройден (нет NextAuth сессии)
    // Редиректим на /api/auth/signin для получения сессии
    console.log('[redirectToAuth] ❌ No NextAuth session, redirecting to /api/auth/signin');
    try {
      await fetch('/api/auth/signout-full', { method: 'POST', credentials: 'include', cache: 'no-store' });
    } catch (e) {
      console.warn('[redirectToAuth] Full cleanup before signin failed (ignored)', e);
    }
    const signinUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
    console.log('[redirectToAuth] Executing redirect to:', signinUrl);
    window.location.replace(signinUrl); // Используем replace вместо href для принудительного редиректа
  }
}

/**
 * Синхронная версия (без проверки сессии через API)
 * Используется когда мы уверены, что сессии нет
 */
export function redirectToSignin(currentPath?: string): void {
  if (typeof window === 'undefined') return;

  const path = currentPath || window.location.pathname + window.location.search;
  const signinUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
  console.log('[redirectToSignin] Executing redirect to signin:', signinUrl);
  window.location.replace(signinUrl);
}

/**
 * Синхронная версия для редиректа на /login (когда сессия точно есть)
 */
export function redirectToLogin(currentPath?: string, reason?: string): void {
  if (typeof window === 'undefined') return;

  // Защита от циклов: если уже на /login, не создаём новый redirect с ещё более вложенным callbackUrl
  const currentPathname = window.location.pathname;
  if (currentPathname.startsWith('/login')) {
    console.warn('[redirectToLogin] Already on /login, skip redirect to avoid loop');
    return;
  }

  const path = currentPath || window.location.pathname + window.location.search;
  const params = new URLSearchParams({
    callbackUrl: path
  });
  
  if (reason) {
    params.set('error', reason);
    params.set('message', reason === 'session_expired' 
      ? 'Сесія закінчилася. Будь ласка, увійдіть знову.'
      : 'Потрібна авторизація для доступу до цього ресурсу.'
    );
  }

  const loginUrl = `/login?${params.toString()}`;
  console.log('[redirectToLogin] Executing redirect to login:', loginUrl);
  window.location.replace(loginUrl);
}

