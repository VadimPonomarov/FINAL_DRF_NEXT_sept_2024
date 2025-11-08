/**
 * ОПТИМІЗОВАНА система авторизації з кешуванням та швидкими перевірками
 * Виправляє проблеми з повільними запитами та зайвими редиректами
 */

export interface OptimizedTokenResult {
  isValid: boolean;
  needsRedirect: boolean;
  redirectTo?: '/login' | '/api/auth/signin';
  message?: string;
  fromCache?: boolean;
}

// Кеш для результатів авторизації (5 хвилин)
const authCache = new Map<string, { result: OptimizedTokenResult; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 хвилин

/**
 * Швидка перевірка з кешем та коротким тайм-аутом
 */
async function quickAuthCheck(): Promise<OptimizedTokenResult> {
  const cacheKey = 'auth_status';
  const cached = authCache.get(cacheKey);
  
  // Повертаємо з кешу якщо свіжий
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.result, fromCache: true };
  }

  try {
    console.log('[quickAuthCheck] Checking auth status...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // Короткий тайм-аут
    
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Quick-Check': 'true', // Маркер для швидкої перевірки
      }
    });
    
    clearTimeout(timeoutId);

    let result: OptimizedTokenResult;

    if (response.ok) {
      const data = await response.json();
      result = {
        isValid: data.authenticated === true,
        needsRedirect: false,
      };
    } else if (response.status === 401) {
      result = {
        isValid: false,
        needsRedirect: true,
        redirectTo: '/login',
        message: 'Authentication required'
      };
    } else {
      // При помилках сервера - не редиректимо
      result = {
        isValid: true,
        needsRedirect: false,
        message: `Server error ${response.status}, assuming valid`
      };
    }

    // Кешуємо результат
    authCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;

  } catch (error: any) {
    console.warn('[quickAuthCheck] Error:', error.message);
    
    // При помилках мережі - не редиректимо, використовуємо кеш
    if (cached) {
      return { ...cached.result, fromCache: true, message: 'Network error, using cache' };
    }
    
    return {
      isValid: true,
      needsRedirect: false,
      message: 'Network error, assuming valid'
    };
  }
}

/**
 * Очищення кешу (викликати після логіну/логауту)
 */
export function clearAuthCache(): void {
  authCache.clear();
  console.log('[clearAuthCache] Auth cache cleared');
}

/**
 * Основна функція для перевірки авторизації
 */
export async function optimizedAuthCheck(): Promise<OptimizedTokenResult> {
  return await quickAuthCheck();
}

/**
 * Перевірка чи потрібна авторизація для сторінки
 */
export function requiresAuth(pathname: string): boolean {
  const protectedPaths = [
    '/autoria/analytics',
    '/autoria/my-ads',
    '/autoria/create',
    '/autoria/moderation',
    '/profile'
  ];
  
  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Швидка перевірка без кешу (для критичних операцій)
 */
export async function forceAuthCheck(): Promise<OptimizedTokenResult> {
  clearAuthCache();
  return await quickAuthCheck();
}
