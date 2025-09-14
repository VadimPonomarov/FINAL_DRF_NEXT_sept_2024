/**
 * Универсальный хелпер для разрешения URL сервисов с приоритетной системой.
 * Работает как на клиенте, так и на сервере Next.js.
 * Принцип DRY - одна логика для всех сервисов и сред.
 */

interface ServiceConfig {
  host: string;
  port?: number;
  protocol: string;
}

interface ServiceInfo {
  serviceName: string;
  environment: string;
  isClient: boolean;
  sourcesChecked: string[];
  finalUrl: string;
  sourceUsed: string;
}

type Environment = 'local' | 'docker' | 'production';
type RedisGetter = (key: string) => Promise<any>;

class ServiceUrlResolver {
  private environment: Environment;
  private isClient: boolean;
  private redisGetter?: RedisGetter;

  constructor(redisGetter?: RedisGetter) {
    this.redisGetter = redisGetter;
    this.isClient = typeof window !== 'undefined';
    this.environment = this.detectEnvironment();
  }

  /**
   * Разрешает URL сервиса с использованием приоритетной системы
   */
  async resolveUrl(serviceName: string, path: string = ''): Promise<string> {
    // Проверяем наличие сервиса в Redis Service Registry
    const isServiceInRedis = await this.isServiceRegisteredInRedis(serviceName);

    if (isServiceInRedis) {
      // Docker среда: сервис найден в Redis
      console.debug(`🐳 Service '${serviceName}' found in Redis - using Docker environment`);

      // Браузер ВСЕГДА работает на хосте, даже если фронтенд в Docker
      // Поэтому всегда используем внешние порты для браузерных запросов
      const externalUrl = this.getDockerExternalUrl(serviceName, path);
      this.logSource(serviceName, 'Docker External (Browser always on host)', externalUrl);
      return externalUrl;
    } else {
      // Локальная среда: сервиса нет в Redis
      console.debug(`🏠 Service '${serviceName}' not found in Redis - using local environment`);

      // Приоритет 1: Переменные окружения из frontend/.env.local
      const localEnvUrl = this.getFromEnvironment(serviceName, path);
      if (localEnvUrl) {
        this.logSource(serviceName, 'Environment Variables (frontend/.env.local)', localEnvUrl);
        return localEnvUrl;
      }
    }

    // Приоритет 3: Fallback значения (localhost по умолчанию)
    const defaultUrl = this.getFromDefaults(serviceName, path);
    this.logSource(serviceName, 'Fallback Values (localhost)', defaultUrl);
    return defaultUrl;
  }

  /**
   * Получает подробную информацию о разрешении URL для отладки
   */
  async getServiceInfo(serviceName: string): Promise<ServiceInfo> {
    const info: ServiceInfo = {
      serviceName,
      environment: this.environment,
      isClient: this.isClient,
      sourcesChecked: [],
      finalUrl: '',
      sourceUsed: ''
    };

    // Проверяем Redis
    const redisUrl = await this.getFromRedis(serviceName);
    if (redisUrl) {
      info.sourcesChecked.push('redis');
      info.finalUrl = redisUrl;
      info.sourceUsed = 'redis';
      return info;
    } else {
      info.sourcesChecked.push('redis (not available)');
    }

    // Проверяем Environment
    const envUrl = this.getFromEnvironment(serviceName);
    if (envUrl) {
      info.sourcesChecked.push('environment');
      info.finalUrl = envUrl;
      info.sourceUsed = 'environment';
      return info;
    } else {
      info.sourcesChecked.push('environment (not set)');
    }

    // Используем defaults
    const defaultUrl = this.getFromDefaults(serviceName);
    info.sourcesChecked.push('defaults');
    info.finalUrl = defaultUrl;
    info.sourceUsed = 'defaults';

    return info;
  }

  private async getFromRedis(serviceName: string, path: string = ''): Promise<string | null> {
    if (!this.redisGetter) {
      return null;
    }

    try {
      const serviceData = await this.redisGetter(`service_registry:${serviceName}`);
      if (!serviceData) {
        // Redis может быть пустым после перезапуска - это нормально
        console.debug(`Service '${serviceName}' not found in Redis (may be after restart)`);
        return null;
      }

      // Парсим данные если это строка
      const parsedData = typeof serviceData === 'string'
        ? JSON.parse(serviceData)
        : serviceData;

      let config: ServiceConfig = {
        host: parsedData.host || 'localhost',
        port: parsedData.port,
        protocol: parsedData.protocol || 'http'
      };

      // Преобразуем внутренние Docker URL только если фронтенд НЕ в Docker
      const isDockerEnvironment = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
      if (this.isClient && !isDockerEnvironment) {
        config = this.transformDockerUrlForClient(config, serviceName);
      }

      console.debug(`Service '${serviceName}' found in Redis:`, config);
      return this.buildUrl(config, path);

    } catch (error) {
      // Redis недоступен или данные повреждены - используем fallback
      console.debug(`Redis unavailable for service '${serviceName}':`, error);
      return null;
    }
  }

  private getDockerInternalUrl(serviceName: string, path: string = ''): string {
    /**
     * Возвращает внутренний Docker URL для межконтейнерного общения
     */
    const dockerInternalMapping: Record<string, ServiceConfig> = {
      'app': { host: 'app', port: 8000, protocol: 'http' },
      'backend': { host: 'app', port: 8000, protocol: 'http' },
      'frontend': { host: 'frontend', port: 3000, protocol: 'http' },
      'redis': { host: 'redis', port: 6379, protocol: 'redis' },
      'pg': { host: 'pg', port: 5432, protocol: 'postgresql' },
      'postgres': { host: 'pg', port: 5432, protocol: 'postgresql' },
      'rabbitmq': { host: 'rabbitmq', port: 5672, protocol: 'amqp' },
      'flower': { host: 'flower', port: 5555, protocol: 'http' },
      'redis-insight': { host: 'redis-insight', port: 5540, protocol: 'http' },
      'minio': { host: 'minio', port: 9000, protocol: 'http' },
      'mailing': { host: 'mailing', port: 8000, protocol: 'http' },
    };

    const config = dockerInternalMapping[serviceName] || {
      host: serviceName,
      port: 8000,
      protocol: 'http'
    };

    console.debug(`🐳 Docker internal URL for '${serviceName}':`, config);
    return this.buildUrl(config, path);
  }

  private getDockerExternalUrl(serviceName: string, path: string = ''): string {
    /**
     * Возвращает внешний Docker URL для доступа с хоста
     */
    const dockerExternalMapping: Record<string, ServiceConfig> = {
      'app': { host: 'localhost', port: 8000, protocol: 'http' }, // Унифицированный порт
      'backend': { host: 'localhost', port: 8000, protocol: 'http' },
      'frontend': { host: 'localhost', port: 3000, protocol: 'http' },
      'redis': { host: 'localhost', port: 6379, protocol: 'redis' },
      'pg': { host: 'localhost', port: 5432, protocol: 'postgresql' },
      'postgres': { host: 'localhost', port: 5432, protocol: 'postgresql' },
      'rabbitmq': { host: 'localhost', port: 5672, protocol: 'amqp' },
      'flower': { host: 'localhost', port: 5555, protocol: 'http' },
      'redis-insight': { host: 'localhost', port: 5540, protocol: 'http' },
      'minio': { host: 'localhost', port: 9000, protocol: 'http' },
      'mailing': { host: 'localhost', port: 8001, protocol: 'http' }, // MAILING_EXTERNAL_PORT
    };

    const config = dockerExternalMapping[serviceName] || {
      host: 'localhost',
      port: 8000,
      protocol: 'http'
    };

    console.debug(`🌐 Docker external URL for '${serviceName}':`, config);
    return this.buildUrl(config, path);
  }

  private async isServiceRegisteredInRedis(serviceName: string): Promise<boolean> {
    /**
     * Проверяет, зарегистрирован ли сервис в Redis Service Registry
     */
    if (!this.redisGetter) {
      return false;
    }

    try {
      const serviceData = await this.redisGetter(`service_registry:${serviceName}`);
      return !!serviceData;
    } catch (error) {
      console.debug(`Failed to check service '${serviceName}' in Redis:`, error);
      return false;
    }
  }

  private transformDockerUrlForClient(config: ServiceConfig, serviceName: string): ServiceConfig {
    /**
     * Преобразует внутренние Docker URL в внешние для клиентской стороны.
     * Например: app:8000 -> localhost:8000
     */

    // Маппинг внутренних Docker хостов на внешние порты
    const dockerToExternalMapping: Record<string, { host: string; port?: number }> = {
      'app': { host: 'localhost', port: 8000 }, // Унифицированный порт Django
      'backend': { host: 'localhost', port: 8000 }, // Унифицированный порт Django
      'frontend': { host: 'localhost', port: 3000 },
      'redis': { host: 'localhost', port: 6379 },
      'pg': { host: 'localhost', port: 5432 },
      'rabbitmq': { host: 'localhost', port: 5672 },
      'flower': { host: 'localhost', port: 5555 },
      'redis-insight': { host: 'localhost', port: 5540 },
      'minio': { host: 'localhost', port: 9000 },
    };

    // Если хост является внутренним Docker именем, преобразуем его
    const mapping = dockerToExternalMapping[config.host];
    if (mapping) {
      console.debug(`🔄 Transforming Docker URL for client: ${config.host}:${config.port} -> ${mapping.host}:${mapping.port || config.port}`);
      return {
        host: mapping.host,
        port: mapping.port || config.port,
        protocol: config.protocol
      };
    }

    // Если хост уже внешний (localhost, IP, домен), оставляем как есть
    return config;
  }

  private getFromEnvironment(serviceName: string, path: string = ''): string | null {
    const serviceUpper = serviceName.toUpperCase().replace('-', '_');

    // В клиентской среде используем только NEXT_PUBLIC_ переменные
    const envPrefix = this.isClient ? 'NEXT_PUBLIC_' : '';

    // Читаем переменные из frontend/.env.local (для локальной среды)

    // Проверяем полный URL
    const fullUrlVar = `${envPrefix}${serviceUpper}_URL`;
    const fullUrl = this.getEnvVar(fullUrlVar);
    if (fullUrl) {
      console.debug(`🔧 Found full URL for '${serviceName}' from environment:`, fullUrl);
      return this.appendPath(fullUrl, path);
    }

    // Собираем URL из компонентов
    const host = this.getEnvVar(`${envPrefix}${serviceUpper}_HOST`);
    const portStr = this.getEnvVar(`${envPrefix}${serviceUpper}_PORT`);
    const protocol = this.getEnvVar(`${envPrefix}${serviceUpper}_PROTOCOL`) || 'http';

    if (!host) {
      console.debug(`🔧 No host found for '${serviceName}' in environment variables`);
      return null;
    }

    const port = portStr ? parseInt(portStr, 10) : undefined;
    const config: ServiceConfig = { host, port, protocol };

    console.debug(`🔧 Built URL for '${serviceName}' from environment variables:`, config);
    return this.buildUrl(config, path);
  }

  private getFromDefaults(serviceName: string, path: string = ''): string {
    // Если мы дошли до defaults, значит сервиса нет в Docker Registry
    // Используем только локальные значения (localhost)
    const localDefaults = this.getLocalDefaults();
    const config = localDefaults[serviceName] || {
      host: 'localhost',
      port: 8000,
      protocol: 'http'
    };

    console.debug(`🏠 Using local defaults for '${serviceName}':`, config);
    return this.buildUrl(config, path);
  }

  private getLocalDefaults(): Record<string, ServiceConfig> {
    // Всегда возвращаем localhost конфигурацию для локальной среды
    return {
      backend: { host: 'localhost', port: 8000, protocol: 'http' }, // Унифицированный порт Django
      app: { host: 'localhost', port: 8000, protocol: 'http' }, // Унифицированный порт Django
      frontend: { host: 'localhost', port: 3000, protocol: 'http' },
      postgres: { host: 'localhost', port: 5432, protocol: 'postgresql' },
      redis: { host: 'localhost', port: 6379, protocol: 'redis' },
      rabbitmq: { host: 'localhost', port: 5672, protocol: 'amqp' },
      minio: { host: 'localhost', port: 9000, protocol: 'http' },
      flower: { host: 'localhost', port: 5555, protocol: 'http' },
      'redis-insight': { host: 'localhost', port: 5540, protocol: 'http' },
    };
  }

  private detectEnvironment(): Environment {
    const isDocker = this.getEnvVar('IS_DOCKER') === 'true';
    const isProduction = this.getEnvVar('NODE_ENV') === 'production';

    if (isDocker) return 'docker';
    if (isProduction) return 'production';
    return 'local';
  }

  private getDefaultConfigs(): Record<string, ServiceConfig> {
    switch (this.environment) {
      case 'docker':
        return {
          backend: { host: 'app', port: 8000, protocol: 'http' },
          frontend: { host: 'frontend', port: 3000, protocol: 'http' },
          postgres: { host: 'pg', port: 5432, protocol: 'postgresql' },
          redis: { host: 'redis', port: 6379, protocol: 'redis' },
          rabbitmq: { host: 'rabbitmq', port: 5672, protocol: 'amqp' },
          minio: { host: 'minio', port: 9000, protocol: 'http' },
          mailing: { host: 'mailing', port: 8000, protocol: 'http' },
          flower: { host: 'flower', port: 5555, protocol: 'http' },
          'redis-insight': { host: 'redis-insight', port: 5540, protocol: 'http' },
        };

      case 'production':
        return {
          backend: { host: 'api.yourdomain.com', port: 443, protocol: 'https' },
          frontend: { host: 'yourdomain.com', port: 443, protocol: 'https' },
          postgres: { host: 'db.yourdomain.com', port: 5432, protocol: 'postgresql' },
          redis: { host: 'redis.yourdomain.com', port: 6379, protocol: 'redis' },
          rabbitmq: { host: 'rabbitmq.yourdomain.com', port: 5672, protocol: 'amqp' },
          minio: { host: 'storage.yourdomain.com', port: 443, protocol: 'https' },
        };

      default: // local
        return {
          backend: { host: 'localhost', port: 8000, protocol: 'http' }, // Исправлено: Django работает на 8000
          frontend: { host: 'localhost', port: 3000, protocol: 'http' },
          postgres: { host: 'localhost', port: 5432, protocol: 'postgresql' },
          redis: { host: 'localhost', port: 6379, protocol: 'redis' },
          rabbitmq: { host: 'localhost', port: 5672, protocol: 'amqp' },
          minio: { host: 'localhost', port: 9000, protocol: 'http' },
        };
    }
  }

  private buildUrl(config: ServiceConfig, path: string = ''): string {
    let baseUrl: string;
    
    if (config.port && config.port !== 80 && config.port !== 443) {
      baseUrl = `${config.protocol}://${config.host}:${config.port}`;
    } else {
      baseUrl = `${config.protocol}://${config.host}`;
    }

    return this.appendPath(baseUrl, path);
  }

  private appendPath(baseUrl: string, path: string): string {
    if (!path) return baseUrl;
    
    const cleanPath = path.replace(/^\/+/, '');
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    
    return `${cleanBaseUrl}/${cleanPath}`;
  }

  private getEnvVar(name: string): string | undefined {
    if (this.isClient) {
      // В браузере доступны только NEXT_PUBLIC_ переменные
      return process.env[name];
    } else {
      // На сервере доступны все переменные
      return process.env[name];
    }
  }

  private logSource(serviceName: string, source: string, url: string): void {
    const context = this.isClient ? 'Client' : 'Server';
    console.debug(`[${context}] Service '${serviceName}' resolved from ${source}: ${url}`);
  }
}

// Глобальные экземпляры для повторного использования
let globalResolver: ServiceUrlResolver | null = null;
let globalResolverWithRedis: ServiceUrlResolver | null = null;

/**
 * Создает или возвращает глобальный резолвер без Redis
 */
export function getResolver(): ServiceUrlResolver {
  if (!globalResolver) {
    globalResolver = new ServiceUrlResolver();
  }
  return globalResolver;
}

/**
 * Создает или возвращает глобальный резолвер с Redis
 */
export function getResolverWithRedis(redisGetter: RedisGetter): ServiceUrlResolver {
  if (!globalResolverWithRedis) {
    globalResolverWithRedis = new ServiceUrlResolver(redisGetter);
  }
  return globalResolverWithRedis;
}

/**
 * Быстрая функция для разрешения URL сервиса
 * Автоматически определяет доступность Redis
 */
export async function resolveServiceUrl(
  serviceName: string, 
  path: string = '',
  redisGetter?: RedisGetter
): Promise<string> {
  const resolver = redisGetter 
    ? getResolverWithRedis(redisGetter)
    : getResolver();
    
  return resolver.resolveUrl(serviceName, path);
}

/**
 * Получает подробную информацию о разрешении URL для отладки
 */
export async function getServiceInfo(
  serviceName: string,
  redisGetter?: RedisGetter
): Promise<ServiceInfo> {
  const resolver = redisGetter 
    ? getResolverWithRedis(redisGetter)
    : getResolver();
    
  return resolver.getServiceInfo(serviceName);
}

// Экспортируем класс для расширенного использования
export { ServiceUrlResolver };
export type { ServiceConfig, ServiceInfo, RedisGetter };
