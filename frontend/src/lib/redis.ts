/**
 * Redis stub для Next.js frontend
 * 
 * ВАЖЛИВО: У поточній архітектурі Redis працює тільки на бекенді (Django).
 * Фронтенд не має прямого доступу до Redis в Docker.
 * 
 * Цей файл - заглушка для сумісності зі старим кодом cleanup API routes.
 * Всі операції нічого не роблять, cleanup-функції мають fallback логіку.
 */

const redis = {
  async get(key: string) {
    console.log('[Redis stub] get() called -  нічого не робимо (Redis тільки на бекенді)');
    return null;
  },

  async set(key: string, value: string, options?: any) {
    console.log('[Redis stub] set() called - нічого не робимо (Redis тільки на бекенді)');
    return 'OK';
  },

  async del(...keys: string[]) {
    console.log('[Redis stub] del() called - нічого не робимо (Redis тільки на бекенді)');
    return 0;
  },

  async exists(...keys: string[]) {
    console.log('[Redis stub] exists() called - нічого не робимо (Redis тільки на бекенді)');
    return 0;
  },

  async expire(key: string, seconds: number) {
    console.log('[Redis stub] expire() called - нічого не робимо (Redis тільки на бекенді)');
    return 0;
  },

  async ttl(key: string) {
    console.log('[Redis stub] ttl() called - нічого не робимо (Redis тільки на бекенді)');
    return -2;
  },

  async keys(pattern: string) {
    console.log('[Redis stub] keys() called - нічого не робимо (Redis тільки на бекенді)');
    return [];
  },

  async flushall() {
    console.log('[Redis stub] flushall() called - нічого не робимо (Redis тільки на бекенді)');
    return 'OK';
  },

  async ping() {
    console.log('[Redis stub] ping() called - нічого не робимо (Redis тільки на бекенді)');
    return 'PONG';
  },
};

export { redis };
export default redis;

