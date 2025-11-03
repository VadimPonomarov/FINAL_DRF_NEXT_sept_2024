"use server";

import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { createClient } from 'redis';

/**
 * API маршрут для работы с Redis в Docker
 * Подключается напрямую к Redis контейнеру
 */

// Получаем конфигурацию Redis из переменных окружения (устойчиво к различным окружениям)
const getRedisConfig = () => {
  // 1) Явные переменные окружения имеют приоритет
  const explicitUrl = process.env.NEXT_PUBLIC_REDIS_URL || process.env.REDIS_URL;
  if (explicitUrl) {
    return { host: '', port: 0, url: explicitUrl };
  }

  const explicitHost = process.env.NEXT_PUBLIC_REDIS_HOST || process.env.REDIS_HOST;
  const explicitPort = parseInt(process.env.NEXT_PUBLIC_REDIS_PORT || process.env.REDIS_PORT || '6379');
  if (explicitHost) {
    return { host: explicitHost, port: explicitPort, url: `redis://${explicitHost}:${explicitPort}/0` };
  }

  // 2) Определяем docker окружение
  const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true' || process.env.IS_DOCKER === 'true';
  if (isDocker) {
    return { host: 'redis', port: 6379, url: 'redis://redis:6379/0' };
  }

  // 3) Fallback: локальный Redis
  return { host: 'localhost', port: 6379, url: 'redis://localhost:6379/0' };
};

// Создаем Redis клиент
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const config = getRedisConfig();
    console.log(`[Redis API] Connecting to Redis at: ${config.url}`);

    redisClient = createClient({
      url: config.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis API] Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Redis API] Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis API] ✅ Connected to Redis');
    });

    redisClient.on('ready', () => {
      console.log('[Redis API] ✅ Redis client ready');
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * API маршрут для получения данных из Redis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Ключ обязателен' },
        { status: 400 }
      );
    }

    console.log(`[Redis API] GET запрос для ключа: ${key}`);

    const client = await getRedisClient();
    const value = await client.get(key);

    if (value) {
      console.log(`[Redis API] ✅ Данные найдены в Redis для ключа: ${key}`);
      return NextResponse.json({
        key,
        value,
        success: true,
        exists: true
      });
    } else {
      console.log(`[Redis API] Данные не найдены в Redis для ключа: ${key}`);
      return NextResponse.json({
        key,
        value: null,
        success: true,
        exists: false
      });
    }

  } catch (error) {
    console.error('[Redis API] Ошибка при получении данных:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', value: null },
      { status: 500 }
    );
  }
}

/**
 * API маршрут для сохранения данных в Redis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Ключ и значение обязательны' },
        { status: 400 }
      );
    }

    console.log(`[Redis API] POST запрос для ключа: ${key}`);

    const client = await getRedisClient();

    // Сохраняем в Redis с TTL (по умолчанию 1 час)
    const ttlSeconds = ttl || 3600;
    await client.setEx(key, ttlSeconds, value);

    console.log(`[Redis API] ✅ Данные успешно сохранены в Redis для ключа: ${key} (TTL: ${ttlSeconds}s)`);

    return NextResponse.json({
      success: true,
      message: 'Данные успешно сохранены в Redis',
      key,
      saved: true,
      backend: true
    });

  } catch (error) {
    console.error('[Redis API] Ошибка при сохранении данных:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', message: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}

/**
 * API маршрут для удаления данных из Redis
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Ключ обязателен' },
        { status: 400 }
      );
    }

    console.log(`[Redis API] DELETE запрос для ключа: ${key}`);

    const client = await getRedisClient();
    const deleted = await client.del(key);

    console.log(`[Redis API] ✅ Данные удалены из Redis для ключа: ${key} (deleted: ${deleted})`);

    return NextResponse.json({
      success: true,
      message: 'Данные удалены из Redis',
      key,
      deleted: deleted > 0
    });

  } catch (error) {
    console.error('[Redis API] Ошибка при удалении данных:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', message: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}