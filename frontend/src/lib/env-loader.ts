/**
 * Runtime environment variable loader for Next.js production
 * 
 * ВАЖНО: Next.js встраивает NEXT_PUBLIC_* переменные в код во время сборки.
 * Для серверных компонентов и API routes переменные должны быть доступны
 * во время выполнения. Этот модуль загружает их из env-config/.
 */

import fs from 'fs';
import path from 'path';

let envLoaded = false;

/**
 * Загружает переменные окружения из env-config/ во время выполнения
 */
export function loadRuntimeEnv() {
  if (envLoaded && process.env.NODE_ENV === 'production') {
    return; // Уже загружено
  }

  try {
    const rootDir = process.cwd();
    const envConfigDir = path.resolve(rootDir, 'env-config');
    
    const envFiles = [
      path.join(envConfigDir, '.env.base'),
      path.join(envConfigDir, '.env.secrets'),
      path.join(envConfigDir, '.env.local'),
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').trim();
            const keyTrimmed = key.trim();
            
            // Загружаем только если переменная еще не установлена
            if (keyTrimmed && !process.env[keyTrimmed]) {
              process.env[keyTrimmed] = value;
            }
          }
        }
      }
    }

    // Устанавливаем значения по умолчанию для критических переменных
    if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
      // Для локальной разработки используем прямое подключение к Django (http://localhost:8000)
      // Для production в Docker - используем внутренний сервис (http://app:8000)
      const isDocker = process.env.IS_DOCKER === 'true';
      process.env.NEXT_PUBLIC_BACKEND_URL = isDocker ? 'http://app:8000' : 'http://localhost:8000';
    }
    
    if (!process.env.BACKEND_URL) {
      // BACKEND_URL используется на сервере для прямого подключения к Django
      const isDocker = process.env.IS_DOCKER === 'true';
      process.env.BACKEND_URL = isDocker ? 'http://app:8000' : 'http://localhost:8000';
    }

    envLoaded = true;
    
    // Логируем для отладки (в development всегда, в production только при ошибках)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [Runtime Env Loader] Environment variables loaded from env-config/');
      console.log(`   NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);
      console.log(`   BACKEND_URL: ${process.env.BACKEND_URL}`);
      console.log(`   IS_DOCKER: ${process.env.IS_DOCKER || 'false'}`);
    }
  } catch (error) {
    console.error('❌ [Runtime Env Loader] Failed to load environment variables:', error);
    // Устанавливаем значения по умолчанию даже при ошибке
    if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost/api';
    }
    if (!process.env.BACKEND_URL) {
      process.env.BACKEND_URL = 'http://localhost:8000';
    }
  }
}

// Автоматически загружаем при импорте модуля
loadRuntimeEnv();

