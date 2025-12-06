/**
 * Middleware для кеширования API запросов
 * Добавляет заголовки кеширования для справочных данных
 */

import { NextRequest, NextResponse } from 'next/server';

// Конфигурация кеширования для разных типов данных
const CACHE_CONFIG = {
  // 🚀 СПРАВОЧНЫЕ ДАННЫЕ - УНИФИЦИРОВАННОЕ ДОЛГОЕ КЕШИРОВАНИЕ (данные стабильные, не меняются)
  'reference/brands': { maxAge: 86400, staleWhileRevalidate: 172800 },      // 24 часа / 48 часов
  'reference/models': { maxAge: 86400, staleWhileRevalidate: 172800 },      // 24 часа / 48 часов
  'reference/vehicle-types': { maxAge: 86400, staleWhileRevalidate: 172800 }, // 24 часа / 48 часов
  'reference/colors': { maxAge: 86400, staleWhileRevalidate: 172800 },     // 24 часа / 48 часов
  'reference/regions': { maxAge: 86400, staleWhileRevalidate: 172800 },   // 24 часа / 48 часов
  'reference/cities': { maxAge: 86400, staleWhileRevalidate: 172800 },     // 24 часа / 48 часов
  'reference/fuel-types': { maxAge: 86400, staleWhileRevalidate: 172800 }, // 24 часа / 48 часов
  'reference/transmissions': { maxAge: 86400, staleWhileRevalidate: 172800 }, // 24 часа / 48 часов
  'reference/body-types': { maxAge: 86400, staleWhileRevalidate: 172800 }, // 24 часа / 48 часов
  'reference': { maxAge: 86400, staleWhileRevalidate: 172800 },            // 24 часа / 48 часов (общий паттерн)
  
  // Пользовательские данные - короткое кеширование
  'user/contacts': { maxAge: 60, staleWhileRevalidate: 120 },          // 1 мин / 2 мин
  'user/profile': { maxAge: 120, staleWhileRevalidate: 240 },          // 2 мин / 4 мин
  
  // Объявления - очень короткое кеширование
  'cars': { maxAge: 30, staleWhileRevalidate: 60 },                    // 30 сек / 1 мин
  'ads/search': { maxAge: 60, staleWhileRevalidate: 120 },             // 1 мин / 2 мин
  
  // По умолчанию - минимальное кеширование
  'default': { maxAge: 60, staleWhileRevalidate: 120 }                 // 1 мин / 2 мин
};

/**
 * Определяет конфигурацию кеширования для URL
 */
function getCacheConfig(pathname: string) {
  // Ищем подходящую конфигурацию
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pattern !== 'default' && pathname.includes(pattern)) {
      return config;
    }
  }
  
  return CACHE_CONFIG.default;
}

/**
 * Добавляет заголовки кеширования к ответу
 */
export function addCacheHeaders(request: NextRequest, response: NextResponse) {
  const pathname = request.nextUrl.pathname;
  
  // Применяем кеширование только к API запросам
  if (!pathname.startsWith('/api/')) {
    return response;
  }
  
  // Получаем конфигурацию кеширования
  const cacheConfig = getCacheConfig(pathname);
  
  // Устанавливаем заголовки кеширования
  const headers = new Headers(response.headers);
  
  // Cache-Control для браузера и CDN
  headers.set(
    'Cache-Control',
    `public, max-age=${cacheConfig.maxAge}, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`
  );
  
  // ETag для условных запросов
  const etag = generateETag(request);
  if (etag) {
    headers.set('ETag', etag);
  }
  
  // Vary для правильного кеширования с параметрами
  headers.set('Vary', 'Accept, Accept-Encoding, Authorization');
  
  // Last-Modified для дополнительной валидации
  headers.set('Last-Modified', new Date().toUTCString());
  
  // Заголовки для отладки кеширования
  if (process.env.NODE_ENV === 'development') {
    headers.set('X-Cache-Config', JSON.stringify(cacheConfig));
    headers.set('X-Cache-Pattern', pathname);
  }
  
  console.log(`[CacheMiddleware] 🚀 Applied cache config for ${pathname}:`, cacheConfig);
  
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Генерирует ETag для запроса
 */
function generateETag(request: NextRequest): string | null {
  try {
    const url = request.nextUrl.toString();
    const method = request.method;
    const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // Обновляется каждые 5 минут
    
    // Простой хеш на основе URL, метода и временной метки
    const hash = btoa(`${method}:${url}:${timestamp}`).slice(0, 16);
    return `"${hash}"`;
  } catch (error) {
    console.warn('[CacheMiddleware] Failed to generate ETag:', error);
    return null;
  }
}

/**
 * Проверяет условные заголовки запроса
 */
export function checkConditionalHeaders(request: NextRequest): NextResponse | null {
  const ifNoneMatch = request.headers.get('If-None-Match');
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  
  // Проверяем ETag
  if (ifNoneMatch) {
    const currentETag = generateETag(request);
    if (currentETag && ifNoneMatch === currentETag) {
      console.log('[CacheMiddleware] 🎯 ETag match, returning 304');
      return new NextResponse(null, { status: 304 });
    }
  }
  
  // Проверяем Last-Modified (упрощенная логика)
  if (ifModifiedSince) {
    const modifiedSince = new Date(ifModifiedSince);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    if (modifiedSince > fiveMinutesAgo) {
      console.log('[CacheMiddleware] 🎯 Not modified, returning 304');
      return new NextResponse(null, { status: 304 });
    }
  }
  
  return null;
}

/**
 * Middleware для предварительной обработки кеширования
 */
export function cachePreprocessor(request: NextRequest): NextResponse | null {
  // Проверяем условные заголовки
  const conditionalResponse = checkConditionalHeaders(request);
  if (conditionalResponse) {
    return conditionalResponse;
  }
  
  // Добавляем заголовки для отладки
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheMiddleware] 📥 Processing request: ${request.method} ${request.nextUrl.pathname}`);
  }
  
  return null;
}

/**
 * Утилиты для работы с кешем
 */
export const CacheUtils = {
  /**
   * Очищает кеш браузера программно
   */
  async clearBrowserCache() {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[CacheUtils] 🗑️ Browser cache cleared');
    }
  },

  /**
   * Получает статистику кеширования
   */
  async getCacheStats() {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      const stats = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return {
            name,
            entries: keys.length,
            urls: keys.map(req => req.url).slice(0, 5) // Первые 5 URL для примера
          };
        })
      );
      return stats;
    }
    return [];
  },

  /**
   * Предварительно загружает критические данные в кеш
   */
  async preloadCriticalData() {
    const criticalUrls = [
      '/api/public/reference/vehicle-types?page_size=30',
      '/api/public/reference/regions?page_size=30',
      '/api/public/reference/colors?page_size=100',
      '/api/public/reference/fuel-types?page_size=20',
      '/api/public/reference/transmissions?page_size=10'
    ];

    console.log('[CacheUtils] 🚀 Preloading critical data...');
    
    try {
      await Promise.all(
        criticalUrls.map(url => 
          fetch(url, { 
            method: 'GET',
            headers: { 'X-Preload': 'true' }
          }).catch(err => 
            console.warn(`[CacheUtils] Failed to preload ${url}:`, err)
          )
        )
      );
      console.log('[CacheUtils] ✅ Critical data preloaded');
    } catch (error) {
      console.error('[CacheUtils] ❌ Failed to preload critical data:', error);
    }
  }
};

/**
 * Хук для управления кешем в React компонентах
 */
export function useCacheManager() {
  return {
    clearCache: CacheUtils.clearBrowserCache,
    getCacheStats: CacheUtils.getCacheStats,
    preloadCriticalData: CacheUtils.preloadCriticalData
  };
}
