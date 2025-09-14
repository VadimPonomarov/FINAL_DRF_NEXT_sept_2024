/**
 * Next.js API Route для работы с Service Registry в Redis
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

// Типы для запросов
interface ServiceConfig {
  host: string;
  port: number;
  protocol: string;
  service_type: string;
  version?: string;
  registered_at?: string;
  environment?: string;
  pid?: number;
}

interface RegistryRequest {
  action: 'register' | 'get' | 'list' | 'refresh' | 'unregister';
  serviceName?: string;
  config?: ServiceConfig;
  ttl?: number;
}

// Конфигурация Redis
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

const REDIS_KEY_PREFIX = 'service_registry';

// Создание Redis клиента
async function createRedisClient() {
  const client = createClient({
    socket: {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
    },
    database: REDIS_CONFIG.db,
  });

  await client.connect();
  return client;
}

// Обработчик POST запросов
export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body: RegistryRequest = await request.json();
    const { action, serviceName, config, ttl } = body;

    // Создаем подключение к Redis
    client = await createRedisClient();

    switch (action) {
      case 'register':
        if (!serviceName || !config) {
          return NextResponse.json(
            { success: false, error: 'Service name and config are required for registration' },
            { status: 400 }
          );
        }

        try {
          const key = `${REDIS_KEY_PREFIX}:${serviceName}`;
          const value = JSON.stringify(config);
          const ttlValue = ttl || 300; // 5 минут по умолчанию

          await client.setEx(key, ttlValue, value);

          return NextResponse.json({
            success: true,
            message: `Service '${serviceName}' registered successfully`,
          });

        } catch (error) {
          console.error(`Failed to register service '${serviceName}':`, error);
          return NextResponse.json(
            { success: false, error: 'Failed to register service' },
            { status: 500 }
          );
        }

      case 'get':
        if (!serviceName) {
          return NextResponse.json(
            { success: false, error: 'Service name is required' },
            { status: 400 }
          );
        }

        try {
          const key = `${REDIS_KEY_PREFIX}:${serviceName}`;
          const value = await client.get(key);

          if (value) {
            const serviceConfig = JSON.parse(value);
            return NextResponse.json({
              success: true,
              data: serviceConfig,
            });
          } else {
            return NextResponse.json({
              success: false,
              error: `Service '${serviceName}' not found`,
            });
          }

        } catch (error) {
          console.error(`Failed to get service '${serviceName}':`, error);
          return NextResponse.json(
            { success: false, error: 'Failed to get service' },
            { status: 500 }
          );
        }

      case 'list':
        try {
          const pattern = `${REDIS_KEY_PREFIX}:*`;
          const keys = await client.keys(pattern);

          const services: Record<string, ServiceConfig> = {};

          for (const key of keys) {
            const serviceName = key.split(':')[1];
            const value = await client.get(key);
            
            if (value) {
              services[serviceName] = JSON.parse(value);
            }
          }

          return NextResponse.json({
            success: true,
            data: services,
          });

        } catch (error) {
          console.error('Failed to list services:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to list services' },
            { status: 500 }
          );
        }

      case 'refresh':
        if (!serviceName) {
          return NextResponse.json(
            { success: false, error: 'Service name is required' },
            { status: 400 }
          );
        }

        try {
          const key = `${REDIS_KEY_PREFIX}:${serviceName}`;
          const ttlValue = ttl || 300;
          
          const result = await client.expire(key, ttlValue);

          if (result) {
            return NextResponse.json({
              success: true,
              message: `TTL refreshed for service '${serviceName}'`,
            });
          } else {
            return NextResponse.json({
              success: false,
              error: `Service '${serviceName}' not found`,
            });
          }

        } catch (error) {
          console.error(`Failed to refresh TTL for service '${serviceName}':`, error);
          return NextResponse.json(
            { success: false, error: 'Failed to refresh TTL' },
            { status: 500 }
          );
        }

      case 'unregister':
        if (!serviceName) {
          return NextResponse.json(
            { success: false, error: 'Service name is required' },
            { status: 400 }
          );
        }

        try {
          const key = `${REDIS_KEY_PREFIX}:${serviceName}`;
          const result = await client.del(key);

          if (result) {
            return NextResponse.json({
              success: true,
              message: `Service '${serviceName}' unregistered successfully`,
            });
          } else {
            return NextResponse.json({
              success: false,
              error: `Service '${serviceName}' not found`,
            });
          }

        } catch (error) {
          console.error(`Failed to unregister service '${serviceName}':`, error);
          return NextResponse.json(
            { success: false, error: 'Failed to unregister service' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Service Registry API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );

  } finally {
    // Закрываем подключение к Redis
    if (client) {
      try {
        await client.quit();
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }
  }
}

// Обработчик GET запросов для получения списка сервисов
export async function GET() {
  let client;
  
  try {
    client = await createRedisClient();
    
    const pattern = `${REDIS_KEY_PREFIX}:*`;
    const keys = await client.keys(pattern);

    const services: Record<string, ServiceConfig> = {};

    for (const key of keys) {
      const serviceName = key.split(':')[1];
      const value = await client.get(key);
      
      if (value) {
        services[serviceName] = JSON.parse(value);
      }
    }

    return NextResponse.json({
      success: true,
      data: services,
    });

  } catch (error) {
    console.error('Failed to list services:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list services' },
      { status: 500 }
    );

  } finally {
    if (client) {
      try {
        await client.quit();
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }
  }
}
