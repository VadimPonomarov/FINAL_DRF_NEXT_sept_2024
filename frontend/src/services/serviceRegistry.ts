/**
 * Service Registry для Frontend - централизованная система регистрации сервисов в Redis.
 * Каждый сервис при старте регистрирует свои домен и порт в Redis.
 */

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

interface ServiceRegistryResponse {
  success: boolean;
  data?: ServiceConfig;
  error?: string;
}

class ServiceRegistry {
  private static instance: ServiceRegistry;
  private readonly REDIS_KEY_PREFIX = 'service_registry';
  private readonly DEFAULT_TTL = 300; // 5 минут

  private constructor() {}

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Регистрирует сервис в Redis через Next.js API
   */
  async registerService(serviceName: string, config: ServiceConfig): Promise<boolean> {
    try {
      const registrationData = {
        ...config,
        registered_at: new Date().toISOString(),
        environment: this.detectEnvironment(),
        pid: typeof window !== 'undefined' ? undefined : process.pid,
      };

      const response = await fetch('/api/service-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          serviceName,
          config: registrationData,
          ttl: this.DEFAULT_TTL,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to register service '${serviceName}': ${response.status}`);
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`Service '${serviceName}' registered successfully:`, registrationData);
        return true;
      } else {
        console.error(`Failed to register service '${serviceName}':`, result.error);
        return false;
      }

    } catch (error) {
      console.error(`Error registering service '${serviceName}':`, error);
      return false;
    }
  }

  /**
   * Получает конфигурацию сервиса из Redis
   */
  async getService(serviceName: string): Promise<ServiceConfig | null> {
    try {
      const response = await fetch('/api/service-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get',
          serviceName,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to get service '${serviceName}': ${response.status}`);
        return null;
      }

      const result: ServiceRegistryResponse = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }

      return null;

    } catch (error) {
      console.error(`Error getting service '${serviceName}':`, error);
      return null;
    }
  }

  /**
   * Формирует URL для сервиса
   */
  async getServiceUrl(serviceName: string, path: string = ''): Promise<string | null> {
    const serviceConfig = await this.getService(serviceName);
    
    if (!serviceConfig) {
      return null;
    }

    const { protocol, host, port } = serviceConfig;

    // Формируем базовый URL
    let baseUrl: string;
    if (port === 80 || port === 443) {
      baseUrl = `${protocol}://${host}`;
    } else {
      baseUrl = `${protocol}://${host}:${port}`;
    }

    // Добавляем путь если указан
    if (path) {
      path = path.replace(/^\/+/, ''); // Убираем ведущие слеши
      return `${baseUrl}/${path}`;
    }

    return baseUrl;
  }

  /**
   * Получает список всех зарегистрированных сервисов
   */
  async listServices(): Promise<Record<string, ServiceConfig>> {
    try {
      const response = await fetch('/api/service-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list',
        }),
      });

      if (!response.ok) {
        console.error(`Failed to list services: ${response.status}`);
        return {};
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data || {};
      }

      return {};

    } catch (error) {
      console.error('Error listing services:', error);
      return {};
    }
  }

  /**
   * Обновляет TTL для сервиса (heartbeat)
   */
  async refreshServiceTTL(serviceName: string): Promise<boolean> {
    try {
      const response = await fetch('/api/service-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh',
          serviceName,
          ttl: this.DEFAULT_TTL,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to refresh TTL for service '${serviceName}': ${response.status}`);
        return false;
      }

      const result = await response.json();
      return result.success || false;

    } catch (error) {
      console.error(`Error refreshing TTL for service '${serviceName}':`, error);
      return false;
    }
  }

  /**
   * Определяет среду выполнения
   */
  private detectEnvironment(): string {
    if (typeof window !== 'undefined') {
      // Browser environment
      return window.location.hostname === 'localhost' ? 'local' : 'production';
    } else {
      // Node.js environment
      return process.env.NODE_ENV === 'production' ? 'production' : 'local';
    }
  }
}

/**
 * Регистрирует текущий Frontend сервис в реестре
 */
export async function registerCurrentService(): Promise<void> {
  try {
    const registry = ServiceRegistry.getInstance();
    
    // Определяем конфигурацию текущего сервиса
    const isProduction = process.env.NODE_ENV === 'production';
    const port = parseInt(process.env.PORT || '3000', 10);
    
    let host: string;
    if (typeof window !== 'undefined') {
      // Browser environment
      host = window.location.hostname;
    } else {
      // Server environment
      host = process.env.FRONTEND_HOST || 'localhost';
    }

    const config: ServiceConfig = {
      host,
      port,
      protocol: 'http',
      service_type: 'nextjs_frontend',
      version: process.env.npm_package_version || '1.0.0',
    };

    // Регистрируем сервис
    const success = await registry.registerService('frontend', config);

    if (success) {
      console.log('Frontend service registered successfully:', config);
    } else {
      console.error('Failed to register frontend service');
    }

  } catch (error) {
    console.error('Error registering frontend service:', error);
  }
}

/**
 * Приоритетная система получения URL сервиса:
 * 1. Redis Service Registry (если доступен)
 * 2. Переменные окружения
 * 3. Значения по умолчанию
 */
export async function getServiceUrl(serviceName: string, path: string = ''): Promise<string> {
  // Приоритет 1: Пытаемся получить из Redis Service Registry
  try {
    const registry = ServiceRegistry.getInstance();
    const url = await registry.getServiceUrl(serviceName, path);

    if (url) {
      console.debug(`Service '${serviceName}' URL from Redis:`, url);
      return url;
    }
  } catch (error) {
    console.debug(`Redis Service Registry unavailable for '${serviceName}':`, error);
  }

  // Приоритет 2: Переменные окружения
  const envUrl = getServiceUrlFromEnv(serviceName, path);
  if (envUrl) {
    console.info(`Service '${serviceName}' URL from environment:`, envUrl);
    return envUrl;
  }

  // Приоритет 3: Значения по умолчанию
  const defaultUrl = getServiceUrlDefault(serviceName, path);
  console.warn(`Service '${serviceName}' URL from defaults:`, defaultUrl);
  return defaultUrl;
}

/**
 * Получает URL сервиса из переменных окружения
 */
function getServiceUrlFromEnv(serviceName: string, path: string = ''): string | null {
  const serviceUpper = serviceName.toUpperCase();

  // Проверяем полный URL
  const fullUrlVar = `NEXT_PUBLIC_${serviceUpper}_URL`;
  const fullUrl = process.env[fullUrlVar];
  if (fullUrl) {
    if (path) {
      path = path.replace(/^\/+/, '');
      return `${fullUrl.replace(/\/+$/, '')}/${path}`;
    }
    return fullUrl;
  }

  // Собираем URL из компонентов
  const hostVar = `NEXT_PUBLIC_${serviceUpper}_HOST`;
  const portVar = `NEXT_PUBLIC_${serviceUpper}_PORT`;
  const protocolVar = `NEXT_PUBLIC_${serviceUpper}_PROTOCOL`;

  const host = process.env[hostVar];
  const port = process.env[portVar];
  const protocol = process.env[protocolVar] || 'http';

  if (!host) {
    return null;
  }

  // Формируем URL
  let baseUrl: string;
  if (port && port !== '80' && port !== '443') {
    baseUrl = `${protocol}://${host}:${port}`;
  } else {
    baseUrl = `${protocol}://${host}`;
  }

  if (path) {
    path = path.replace(/^\/+/, '');
    return `${baseUrl}/${path}`;
  }

  return baseUrl;
}

/**
 * Возвращает URL сервиса по умолчанию
 */
function getServiceUrlDefault(serviceName: string, path: string = ''): string {
  // Определяем среду выполнения
  const isDocker = process.env.IS_DOCKER === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  let defaultConfigs: Record<string, {host: string, port: number, protocol: string}>;

  if (isDocker) {
    // Docker окружение - используем имена контейнеров
    defaultConfigs = {
      backend: { host: 'app', port: 8000, protocol: 'http' },
      frontend: { host: 'frontend', port: 3000, protocol: 'http' },
      postgres: { host: 'pg', port: 5432, protocol: 'postgresql' },
      redis: { host: 'redis', port: 6379, protocol: 'redis' },
      rabbitmq: { host: 'rabbitmq', port: 5672, protocol: 'amqp' },
      minio: { host: 'minio', port: 9000, protocol: 'http' },
      mailing: { host: 'mailing', port: 8000, protocol: 'http' },
      flower: { host: 'flower', port: 5555, protocol: 'http' },
    };
  } else if (isProduction) {
    // Production окружение
    defaultConfigs = {
      backend: { host: 'api.yourdomain.com', port: 443, protocol: 'https' },
      frontend: { host: 'yourdomain.com', port: 443, protocol: 'https' },
      postgres: { host: 'db.yourdomain.com', port: 5432, protocol: 'postgresql' },
      redis: { host: 'redis.yourdomain.com', port: 6379, protocol: 'redis' },
      rabbitmq: { host: 'rabbitmq.yourdomain.com', port: 5672, protocol: 'amqp' },
      minio: { host: 'storage.yourdomain.com', port: 443, protocol: 'https' },
    };
  } else {
    // Локальное окружение
    defaultConfigs = {
      backend: { host: 'localhost', port: 8000, protocol: 'http' },
      frontend: { host: 'localhost', port: 3000, protocol: 'http' },
      postgres: { host: 'localhost', port: 5432, protocol: 'postgresql' },
      redis: { host: 'localhost', port: 6379, protocol: 'redis' },
      rabbitmq: { host: 'localhost', port: 5672, protocol: 'amqp' },
      minio: { host: 'localhost', port: 9000, protocol: 'http' },
    };
  }

  const config = defaultConfigs[serviceName] || {
    host: 'localhost',
    port: 80,
    protocol: 'http'
  };

  // Формируем URL
  let baseUrl: string;
  if (config.port !== 80 && config.port !== 443) {
    baseUrl = `${config.protocol}://${config.host}:${config.port}`;
  } else {
    baseUrl = `${config.protocol}://${config.host}`;
  }

  if (path) {
    path = path.replace(/^\/+/, '');
    return `${baseUrl}/${path}`;
  }

  return baseUrl;
}

// Экспортируем singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Экспортируем типы
export type { ServiceConfig, ServiceRegistryResponse };
