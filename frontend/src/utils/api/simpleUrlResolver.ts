/**
 * Упрощенная система определения URL на основе переменных среды
 *
 * Логика:
 * 1. Если IS_DOCKER=true (устанавливается в docker-compose) -> используем Docker URL
 * 2. Если IS_DOCKER не установлена или false -> используем локальные URL
 *
 * Все URL берутся из переменных среды:
 * - .env.local (для локального запуска)
 * - .env.docker (для Docker запуска)
 *
 * Константы (порты, протоколы, пути) жестко прописаны в коде
 */

import { PORTS, PROTOCOLS, API_PATHS, EXTERNAL_SERVICES } from '@/config/constants';

interface SimpleUrlConfig {
  backendUrl: string;
  wsHost: string;
  frontendUrl: string;
  isDocker: boolean;
}

class SimpleUrlResolver {
  private static config: SimpleUrlConfig | null = null;

  /**
   * Определяет, запущено ли приложение в Docker
   */
  private static isDockerEnvironment(): boolean {
    // Проверяем переменную IS_DOCKER, которая устанавливается только в docker-compose
    return process.env.IS_DOCKER === 'true';
  }

  /**
   * Получает конфигурацию URL на основе переменных среды
   */
  static getConfig(): SimpleUrlConfig {
    if (this.config) {
      return this.config;
    }

    const isDocker = this.isDockerEnvironment();

    // Получаем URL из переменных среды
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    // Проверяем, что все необходимые переменные установлены
    if (!backendUrl || !wsHost || !frontendUrl) {
      console.error('❌ Missing required environment variables:');
      console.error(`  NEXT_PUBLIC_BACKEND_URL: ${backendUrl || 'NOT_SET'}`);
      console.error(`  NEXT_PUBLIC_WS_HOST: ${wsHost || 'NOT_SET'}`);
      console.error(`  NEXT_PUBLIC_FRONTEND_URL: ${frontendUrl || 'NOT_SET'}`);
      
      // Fallback значения с использованием констант
      const fallbackConfig: SimpleUrlConfig = {
        backendUrl: isDocker
          ? `${PROTOCOLS.BACKEND}://localhost:${PORTS.BACKEND}` // Browser always connects to exposed ports
          : `${PROTOCOLS.BACKEND}://localhost:${PORTS.BACKEND}`,
        wsHost: isDocker
          ? `localhost:${PORTS.BACKEND}` // Browser always connects to exposed ports
          : `localhost:${PORTS.BACKEND}`,
        frontendUrl: isDocker
          ? `${PROTOCOLS.FRONTEND}://localhost:${PORTS.FRONTEND}` // Browser always connects to exposed ports
          : `${PROTOCOLS.FRONTEND}://localhost:${PORTS.FRONTEND}`,
        isDocker
      };
      
      console.warn('⚠️ Using fallback configuration:', fallbackConfig);
      this.config = fallbackConfig;
      return fallbackConfig;
    }

    this.config = {
      backendUrl,
      wsHost,
      frontendUrl,
      isDocker
    };

    console.log('🎯 Simple URL Configuration:');
    console.log(`  Environment: ${isDocker ? 'Docker' : 'Local'}`);
    console.log(`  Backend URL: ${backendUrl}`);
    console.log(`  WebSocket Host: ${wsHost}`);
    console.log(`  Frontend URL: ${frontendUrl}`);

    return this.config;
  }

  /**
   * Получает URL для API запросов к бэкенду
   */
  static getBackendUrl(path: string = ''): string {
    const config = this.getConfig();
    return `${config.backendUrl}${path}`;
  }

  /**
   * Получает WebSocket URL
   */
  static getWebSocketUrl(path: string = ''): string {
    const config = this.getConfig();
    const protocol = PROTOCOLS.WEBSOCKET; // Используем константу
    return `${protocol}://${config.wsHost}${path}`;
  }

  /**
   * Получает URL для Redis API (всегда через текущий фронтенд)
   */
  static getRedisUrl(key?: string): string {
    if (typeof window !== 'undefined') {
      // В браузере используем текущий origin
      const baseUrl = `${window.location.origin}/api/redis`;
      return key ? `${baseUrl}?key=${key}` : baseUrl;
    } else {
      // На сервере используем правильный URL фронтенда
      const config = this.getConfig();
      const baseUrl = `${config.frontendUrl}/api/redis`;
      return key ? `${baseUrl}?key=${key}` : baseUrl;
    }
  }

  /**
   * Получает URL фронтенда
   */
  static getFrontendUrl(path: string = ''): string {
    const config = this.getConfig();
    return `${config.frontendUrl}${path}`;
  }

  /**
   * Проверяет, запущено ли приложение в Docker
   */
  static isDocker(): boolean {
    return this.getConfig().isDocker;
  }

  /**
   * Сбрасывает кеш (для тестирования)
   */
  static clearCache(): void {
    this.config = null;
  }

  /**
   * Логирует текущую конфигурацию
   */
  static logConfig(): void {
    const config = this.getConfig();
    console.log('📋 Current URL Configuration:');
    console.log(`  Environment: ${config.isDocker ? 'Docker' : 'Local'}`);
    console.log(`  Backend URL: ${config.backendUrl}`);
    console.log(`  WebSocket Host: ${config.wsHost}`);
    console.log(`  Frontend URL: ${config.frontendUrl}`);
    console.log('');
    console.log('🔗 Generated URLs:');
    console.log(`  Backend API: ${this.getBackendUrl('/api/auth/login')}`);
    console.log(`  WebSocket: ${this.getWebSocketUrl('/api/chat/test/')}`);
    console.log(`  Redis API: ${this.getRedisUrl('backend_auth')}`);
  }
}

export default SimpleUrlResolver;
