import { safeLogValue } from '@/lib/simple-crypto';

// Типы для публичных справочников
type Brand = { id: number; name: string; logo: string };
type Color = { id: number; name: string; hex: string };
type VehicleType = { id: number; name: string; icon: string };
type Region = { id: number; name: string; cities: number[] };
type City = { id: number; name: string; regionId: number };

// Mock данные для публичных справочников
const PUBLIC_REFERENCE_DATA: Record<string, any> = {
  brands: [
    { id: 1, name: 'Toyota', logo: '/brands/toyota.svg' },
    { id: 2, name: 'BMW', logo: '/brands/bmw.svg' },
    { id: 3, name: 'Audi', logo: '/brands/audi.svg' }
  ] as Brand[],
  colors: [
    { id: 1, name: 'Черный', hex: '#000000' },
    { id: 2, name: 'Белый', hex: '#FFFFFF' },
    { id: 3, name: 'Серый', hex: '#808080' }
  ] as Color[],
  vehicleTypes: [
    { id: 1, name: 'Седан', icon: 'sedan' },
    { id: 2, name: 'Хэтчбек', icon: 'hatchback' },
    { id: 3, name: 'Внедорожник', icon: 'suv' }
  ] as VehicleType[],
  regions: [
    { id: 1, name: 'Киевская обл.', cities: [1, 2] },
    { id: 2, name: 'Львовская обл.', cities: [3, 4] }
  ] as Region[],
  cities: [
    { id: 1, name: 'Киев', regionId: 1 },
    { id: 2, name: 'Бровары', regionId: 1 },
    { id: 3, name: 'Львов', regionId: 2 }
  ] as City[]
};

interface PublicApiOptions {
  type?: 'public';
  page_size?: number;
  page?: number;
}

/**
 * Получает данные из Redis или mock-данные по ключу
 * @param key - Ключ для поиска
 * @param options - Опции запроса
 * @returns Данные или null
 */
export async function getRedisData(key: string, options?: PublicApiOptions): Promise<any> {
  try {
    // Обработка публичных справочников
    if (options?.type === 'public') {
      const data = PUBLIC_REFERENCE_DATA[key];
      if (data) {
        safeLogValue(`[Public API Mock] Returning data for: ${key}`);
        return {
          results: data,
          count: data.length,
          page_size: options.page_size || 100,
          page: options.page || 1
        };
      }
    }

    // Стандартные Redis данные
        const mockData: Record<string, any> = {
          userSession: { token: 'mock-token', expiresAt: Date.now() + 3600000 },
          authProvider: 'backend',
          backend_auth: {
            access: 'mock-access-token',
            refresh: 'mock-refresh-token',
            user: { id: 1, email: 'user@example.com' },
            refreshAttempts: 0
          }
        };
        safeLogValue(`[Redis Mock] Retrieved data for key: ${key}`);
        return mockData[key] || null;
  } catch (error) {
    console.error(`[Redis Error] Failed to get data for key ${key}:`, error);
    return null;
  }
}

/**
 * Сохраняет данные в Redis по ключу
 * @param key - Ключ для сохранения
 * @param data - Данные для сохранения
 * @param ttl - Время жизни в секундах (опционально)
 * @returns Успешность операции
 */
export async function setRedisData(key: string, data: any, ttl?: number): Promise<boolean> {
  try {
    // В реальной реализации здесь будет вызов к Redis
    safeLogValue(`[Redis Mock] Saved data for key: ${key}, TTL: ${ttl}`);
    return true;
  } catch (error) {
    console.error(`[Redis Error] Failed to set data for key ${key}:`, error);
    return false;
  }
}