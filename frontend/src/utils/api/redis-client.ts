/**
 * Redis Client - специализированный модуль для работы с Redis
 * Выделен из helpers.ts для соблюдения принципа единственной ответственности
 */

const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000') : '';

export class RedisClient {
  /**
   * Получить значение по ключу из Redis
   */
  static async get(key: string): Promise<string | null> {
    try {
      const res = await fetch(`${__frontendBaseUrl}/api/redis?key=${encodeURIComponent(key)}`, { 
        cache: 'no-store' 
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.exists ? (data.value as string) : null;
    } catch {
      return null;
    }
  }

  /**
   * Установить значение по ключу в Redis
   */
  static async set(key: string, value: string): Promise<boolean> {
    try {
      const res = await fetch(`${__frontendBaseUrl}/api/redis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Удалить ключ из Redis
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${__frontendBaseUrl}/api/redis`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
