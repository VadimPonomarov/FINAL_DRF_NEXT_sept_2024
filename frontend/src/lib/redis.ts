/**
 * Redis client для Next.js
 * Використовується для кешування та зберігання сесій
 */

import { Redis } from '@upstash/redis';

// Створюємо Redis клієнт
// Якщо UPSTASH_REDIS_REST_URL не встановлено, використовуємо mock клієнт
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : createMockRedis();

// Mock Redis клієнт для розробки (якщо UPSTASH не налаштовано)
function createMockRedis() {
  const store = new Map<string, { value: string; expiry?: number }>();

  console.warn('⚠️ [Redis] Using in-memory mock Redis client. Configure UPSTASH_REDIS_REST_URL for production.');

  return {
    async get(key: string) {
      const item = store.get(key);
      if (!item) return null;
      
      // Перевіряємо expiry
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      
      return item.value;
    },

    async set(key: string, value: string, options?: { ex?: number; px?: number }) {
      const expiry = options?.ex 
        ? Date.now() + (options.ex * 1000)
        : options?.px 
          ? Date.now() + options.px
          : undefined;
      
      store.set(key, { value, expiry });
      return 'OK';
    },

    async del(...keys: string[]) {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
      }
      return count;
    },

    async exists(...keys: string[]) {
      let count = 0;
      for (const key of keys) {
        if (store.has(key)) count++;
      }
      return count;
    },

    async expire(key: string, seconds: number) {
      const item = store.get(key);
      if (!item) return 0;
      
      item.expiry = Date.now() + (seconds * 1000);
      store.set(key, item);
      return 1;
    },

    async ttl(key: string) {
      const item = store.get(key);
      if (!item) return -2; // key doesn't exist
      if (!item.expiry) return -1; // key exists but has no expiry
      
      const remaining = Math.floor((item.expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    },

    async keys(pattern: string) {
      // Простий pattern matching для mock
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(store.keys()).filter(key => regex.test(key));
    },

    async flushall() {
      store.clear();
      return 'OK';
    },

    async ping() {
      return 'PONG';
    },
  };
}

export { redis };
export default redis;

