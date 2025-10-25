# Smart Caching Guide

## 🧠 Умное кеширование для AutoRia API

### Принципы работы

#### 1. **Рациональные TTL (Time To Live)**
```typescript
// Статические данные - долгий кеш (30 минут)
reference_data, vehicle_types, brands

// Пользовательские данные - средний кеш (2 минуты)  
user_ads, my_ads

// Статистика модерации - короткий кеш (1 минута)
moderation_stats

// Очередь модерации - очень короткий кеш (30 секунд)
moderation_queue

// Поиск - средний кеш (3 минуты)
search_results

// Детали объявления - средний кеш (5 минут)
ad_details
```

#### 2. **Умная инвалидация кеша**
```typescript
// При изменении объявления
invalidateCache('ad', adId); // Очищает ad_details, search, user_ads

// При модерации
invalidateCache('moderation'); // Очищает moderation_queue, moderation_stats

// При изменении пользователя
invalidateCache('user', userId); // Очищает user_ads, my_ads
```

#### 3. **Управление памятью**
- **Максимум 1000 записей** в кеше
- **Максимум 50MB** памяти
- **Автоматическая очистка** каждую минуту
- **LRU (Least Recently Used)** стратегия вытеснения

### Использование в сервисах

#### ModerationService
```typescript
// Кеширование статистики (1 минута)
const stats = await moderationService.getStats();

// Кеширование очереди (30 секунд)
const queue = await moderationService.getQueue(filters);

// Автоматическая инвалидация при модерации
await moderationService.approveAd(adId);
// Очищает: moderation_queue, moderation_stats, moderation_analytics
```

#### SearchService
```typescript
// Кеширование поиска (3 минуты)
const results = await searchService.searchAds(filters);

// Кеширование деталей объявления (5 минут)
const ad = await searchService.getAdDetails(adId);

// Автоматическая инвалидация при изменении объявления
// Очищает: ad_details, search, user_ads
```

### Мониторинг кеша

#### Получение статистики
```typescript
import { ServiceUtils } from '@/modules/services/autoria';

// Статистика кеша
const stats = ServiceUtils.getCacheStats();
console.log({
  size: stats.size,           // Количество записей
  memoryUsage: stats.memoryUsage, // Использование памяти (MB)
  hitRate: stats.hitRate,     // Процент попаданий
  entries: stats.entries      // Детали записей
});
```

#### Health Check
```typescript
// Проверка здоровья сервисов
const health = await ServiceUtils.healthCheck();
console.log({
  status: health.status,      // healthy | degraded | unhealthy
  services: health.services,  // Статус каждого сервиса
  cache: health.cache        // Статистика кеша
});
```

### Оптимизация производительности

#### 1. **Предзагрузка данных**
```typescript
// Предзагрузка часто используемых данных
await ServiceUtils.preloadCommonData();

// Прогрев кеша
await ServiceUtils.warmUpCaches();
```

#### 2. **Очистка кеша**
```typescript
// Очистка всего кеша
ServiceUtils.clearAllCaches();

// Очистка по паттерну
moderationService.clearModerationCache();
searchService.clearSearchCache();
```

#### 3. **Мониторинг производительности**
```typescript
// Встроенное логирование
// Автоматически логирует:
// - cache_hit/cache_miss
// - api_request/api_failed
// - retry_scheduled
// - performance metrics
```

### Лучшие практики

#### ✅ Рекомендуется
```typescript
// Использовать сервисы как синглтоны
const moderationService = ModerationService.getInstance();

// Полагаться на автоматическую инвалидацию
await moderationService.approveAd(adId); // Автоматически очистит кеш

// Мониторить статистику кеша
const stats = ServiceUtils.getCacheStats();
if (stats.hitRate < 0.5) {
  console.warn('Low cache hit rate:', stats.hitRate);
}
```

#### ❌ Не рекомендуется
```typescript
// Ручная очистка кеша без необходимости
moderationService.clearModerationCache(); // Только если нужно

// Игнорирование ошибок кеша
try {
  const data = await service.getData();
} catch (error) {
  // Обрабатывать ошибки кеша
}

// Создание множественных экземпляров сервисов
const service1 = new ModerationService(); // ❌
const service2 = new ModerationService(); // ❌
```

### Конфигурация кеша

#### Настройка параметров
```typescript
// В CacheManager можно настроить:
const config = {
  maxSize: 1000,        // Максимум записей
  defaultTTL: 300000,   // TTL по умолчанию (5 минут)
  maxMemoryUsage: 50,   // Максимум памяти (MB)
  cleanupInterval: 60000 // Интервал очистки (1 минута)
};
```

#### Мониторинг в реальном времени
```typescript
// Подписка на события кеша
setInterval(() => {
  const stats = ServiceUtils.getCacheStats();
  console.log(`Cache: ${stats.size} entries, ${stats.memoryUsage.toFixed(2)}MB, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
}, 30000); // Каждые 30 секунд
```

### Отладка кеша

#### Логирование
```typescript
// Включить детальное логирование
localStorage.setItem('debug_cache', 'true');

// Просмотр записей кеша
const stats = ServiceUtils.getCacheStats();
stats.entries.forEach(entry => {
  console.log(`${entry.key}: ${entry.hits} hits, ${entry.age}ms old`);
});
```

#### Профилирование
```typescript
// Измерение производительности
const start = performance.now();
const data = await moderationService.getStats();
const duration = performance.now() - start;
console.log(`getStats took ${duration.toFixed(2)}ms`);
```

---

**Результат**: Умное кеширование предотвращает повторяющиеся запросы, оптимизирует производительность и управляет памятью в рациональных пределах.




