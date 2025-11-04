/**
 * Утилита для правильного чтения переменных окружения во время выполнения
 * Решает проблему кэширования переменных Next.js во время сборки
 */

export interface RuntimeEnv {
  IS_DOCKER: boolean;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_URL: string;
  NODE_ENV: string;
}

/**
 * Canonical runtime environment detection for Docker and local environments
 * Server-side: reads directly from process.env (from .env.docker in Docker)
 * Client-side: uses NEXT_PUBLIC_* variables
 */
export const getRuntimeEnv = (): RuntimeEnv => {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // SERVER-SIDE: Direct access to environment variables
    const isDocker = process.env.IS_DOCKER === 'true';

    if (isDocker) {
      // DOCKER ENVIRONMENT: Use canonical Docker variables from .env.docker
      return {
        IS_DOCKER: true,
        REDIS_HOST: process.env.REDIS_HOST || 'redis',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
        NODE_ENV: process.env.NODE_ENV || 'production'
      };
    } else {
      // LOCAL ENVIRONMENT: Use localhost defaults
      return {
        IS_DOCKER: false,
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        NODE_ENV: process.env.NODE_ENV || 'development'
      };
    }
  } else {
    // CLIENT-SIDE: Use NEXT_PUBLIC_* variables only
    const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';

    if (isDocker) {
      // DOCKER ENVIRONMENT: Use Docker service names for internal communication
      return {
        IS_DOCKER: true,
        REDIS_HOST: process.env.NEXT_PUBLIC_REDIS_HOST || 'redis',
        REDIS_PORT: process.env.NEXT_PUBLIC_REDIS_PORT || '6379',
        REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL || 'redis://redis:6379',
        NODE_ENV: process.env.NODE_ENV || 'production'
      };
    } else {
      // LOCAL ENVIRONMENT: Use localhost
      return {
        IS_DOCKER: false,
        REDIS_HOST: process.env.NEXT_PUBLIC_REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.NEXT_PUBLIC_REDIS_PORT || '6379',
        REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL || 'redis://localhost:6379',
        NODE_ENV: process.env.NODE_ENV || 'development'
      };
    }
  }
};

/**
 * Логирует текущие переменные окружения для отладки
 */
export const logRuntimeEnv = (prefix: string = '[Runtime Env]') => {
  const env = getRuntimeEnv();
  const isServer = typeof window === 'undefined';
  
  console.log(`${prefix} Environment (${isServer ? 'server' : 'client'}):`);
  console.log(`  IS_DOCKER: ${env.IS_DOCKER}`);
  console.log(`  REDIS_HOST: ${env.REDIS_HOST}`);
  console.log(`  REDIS_PORT: ${env.REDIS_PORT}`);
  console.log(`  REDIS_URL: ${env.REDIS_URL}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  
  return env;
};
