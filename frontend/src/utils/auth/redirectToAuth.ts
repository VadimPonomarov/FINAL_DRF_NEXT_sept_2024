/**
 * Утиліта для коректного редиректу з урахуванням багаторівневої системи авторизації
 *
 * Порядок перевірок:
 * 1. Рівень 1: сесія NextAuth (signin) — перевіряється через API
 * 2. Рівень 2: backend-токени — перевіряються на сторінці /login
 *
 * Якщо токени не знайдено (404 від refresh):
 * - Якщо є сесія NextAuth → редирект на /login для отримання backend-токенів
 * - Якщо немає сесії NextAuth → редирект на /api/auth/signin для отримання сесії
 */

/**
 * Перевіряє наявність сесії NextAuth через API статусу
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
    console.error('[redirectToAuth] Помилка під час перевірки сесії NextAuth:', error);
    return false;
  }
}

/**
 * Коректно перенаправляє користувача з урахуванням багаторівневої системи
 *
 * @param currentPath - поточний шлях для callbackUrl
 * @param reason - причина редиректу (для повідомлення користувачу)
 */
export async function redirectToAuth(
  currentPath?: string,
  reason: 'session_expired' | 'tokens_not_found' | 'auth_required' = 'session_expired'
): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('[redirectToAuth] Виклик на сервері, редирект пропущено');
    return;
  }

  // Глобальний захист від циклів редиректів: не частіше, ніж раз на 10 секунд
  try {
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem('auth:lastRedirectTs') || '0');
    if (now - last < 10000) {
      console.warn('[redirectToAuth] Редирект придушено (тротлінг)');
      return;
    }
    window.sessionStorage.setItem('auth:lastRedirectTs', String(now));
  } catch {}

  const path = currentPath || window.location.pathname + window.location.search;
  const messages: Record<string, string> = {
    session_expired: 'Сесія закінчилася. Будь ласка, увійдіть знову.',
    tokens_not_found: 'Потрібна авторизація. Будь ласка, увійдіть.',
    auth_required: 'Потрібна авторизація для доступу до цього ресурсу.'
  };

  const message = messages[reason] || messages.session_expired;

  // Захист від циклів: якщо вже перебуваємо на /login або /api/auth/signin — нічого не робимо
  const currentPathname = window.location.pathname;
  if (currentPathname.startsWith('/login')) {
    console.warn('[redirectToAuth] Вже на /login, пропускаємо редирект щоб уникнути циклу');
    return;
  }
  if (currentPathname.startsWith('/api/auth/signin')) {
    console.warn('[redirectToAuth] Вже на /api/auth/signin, пропускаємо редирект щоб уникнути циклу');
    return;
  }

  console.log('[redirectToAuth] Перевіряємо сесію NextAuth перед редиректом...');

  // Перевіряємо наявність сесії NextAuth
  const hasSession = await checkNextAuthSession();

  if (hasSession) {
    // Рівень 1 пройдено (сесія NextAuth існує)
    // Редиректимо на /login для отримання backend-токенів (рівень 2)
    console.log('[redirectToAuth] ✅ Сесія NextAuth є, виконуємо редирект на /login за backend-токенами');
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(path)}&error=${reason}&message=${encodeURIComponent(message)}`;
    console.log('[redirectToAuth] Executing redirect to:', loginUrl);
    window.location.replace(loginUrl); // Використовуємо replace замість href для примусового редиректу
  } else {
    // Рівень 1 не пройдено (сесії NextAuth немає)
    // Редиректимо на /api/auth/signin для отримання сесії
    console.log('[redirectToAuth] ❌ Сесія NextAuth відсутня, редирект на /api/auth/signin');
    try {
      await fetch('/api/auth/signout-full', { method: 'POST', credentials: 'include', cache: 'no-store' });
    } catch (e) {
      console.warn('[redirectToAuth] Повне очищення перед signin не вдалося (ігноруємо)', e);
    }
    const signinUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
    console.log('[redirectToAuth] Виконуємо редирект на:', signinUrl);
    window.location.replace(signinUrl); // Використовуємо replace замість href для примусового редиректу
  }
}

/**
 * Синхронна версія (без перевірки сесії через API)
 * Використовується, коли впевнені, що сесії немає
 */
export function redirectToSignin(currentPath?: string): void {
  if (typeof window === 'undefined') return;

  const path = currentPath || window.location.pathname + window.location.search;
  const signinUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
  console.log('[redirectToSignin] Виконуємо редирект на signin:', signinUrl);
  window.location.replace(signinUrl);
}

/**
 * Синхронна версія для редиректу на /login (коли сесія точно є)
 */
export function redirectToLogin(currentPath?: string, reason?: string): void {
  if (typeof window === 'undefined') return;

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
  console.log('[redirectToLogin] Виконуємо редирект на login:', loginUrl);
  window.location.replace(loginUrl);
}

