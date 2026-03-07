import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

/**
 * Debug Redis API route with comprehensive error handling
 */

const getRedisConfig = () => {
  const explicitUrl = process.env.NEXT_PUBLIC_REDIS_URL || process.env.REDIS_URL;
  if (explicitUrl) {
    return { host: '', port: 0, url: explicitUrl };
  }

  const explicitHost = process.env.NEXT_PUBLIC_REDIS_HOST || process.env.REDIS_HOST;
  const explicitPort = parseInt(process.env.NEXT_PUBLIC_REDIS_PORT || process.env.REDIS_PORT || '6379');
  if (explicitHost) {
    return { host: explicitHost, port: explicitPort, url: `redis://${explicitHost}:${explicitPort}/0` };
  }

  const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true' || process.env.IS_DOCKER === 'true';
  if (isDocker) {
    return { host: 'redis', port: 6379, url: 'redis://redis:6379/0' };
  }

  return { host: 'localhost', port: 6379, url: 'redis://localhost:6379/0' };
};

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

    console.log(`[Redis Debug] POST запрос для ключа: ${key}`);
    
    // Debug Redis config
    const config = getRedisConfig();
    console.log(`[Redis Debug] Redis config:`, {
      url: config.url,
      host: config.host,
      port: config.port,
      envVars: {
        REDIS_URL: process.env.REDIS_URL,
        NEXT_PUBLIC_REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT
      }
    });

    const client = createClient({
      url: config.url,
      socket: {
        connectTimeout: 5000,
      }
    });

    client.on('error', (err) => {
      console.error('[Redis Debug] Redis Client Error:', err);
    });

    await client.connect();
    console.log('[Redis Debug] ✅ Connected to Redis');

    const ttlSeconds = ttl || 3600;
    await client.setEx(key, ttlSeconds, value);
    await client.disconnect();

    console.log(`[Redis Debug] ✅ Данные успешно сохранены в Redis для ключа: ${key}`);

    return NextResponse.json({
      success: true,
      message: 'Данные успешно сохранены в Redis',
      key,
      saved: true,
      debug: {
        config: {
          url: config.url,
          host: config.host,
          port: config.port
        }
      }
    });

  } catch (error) {
    console.error('[Redis Debug] Ошибка при сохранении данных:', error);
    console.error('[Redis Debug] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { 
        error: 'Ошибка сервера', 
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        debug: {
          envVars: {
            REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT_SET',
            NEXT_PUBLIC_REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL ? 'SET' : 'NOT_SET',
            REDIS_HOST: process.env.REDIS_HOST ? 'SET' : 'NOT_SET',
            REDIS_PORT: process.env.REDIS_PORT ? 'SET' : 'NOT_SET'
          },
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: (error as any)?.code,
            name: error instanceof Error ? error.name : 'Unknown'
          }
        }
      },
      { status: 500 }
    );
  }
}
