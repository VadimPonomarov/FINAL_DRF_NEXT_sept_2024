# Анализ проблем генерации тестовых объявлений

## 🚨 Выявленные проблемы

### 1. **Проблема с типом транспорта (всегда "мото")**
**Причина**: В коде `frontend/src/utils/mockData.ts` используется endpoint `/api/ads/reference/models/random/`, который использует `order_by('?')` для случайного выбора. Но если в базе данных большинство моделей относятся к мотоциклам, то случайный выбор будет склоняться к ним.

**Решение**: 
- Добавить весовое распределение по типам транспорта
- Или использовать отдельные endpoints для каждого типа транспорта

### 2. **Отсутствие повторной генерации при отсутствии фото**
**Причина**: В коде нет логики retry при неудачной генерации изображений.

**Текущий код**:
```typescript
if ((genData.success || genData.status === 'ok') && Array.isArray(genData.images)) {
  // Обработка изображений
} else {
  console.error(`❌ [TestAds] Image generation returned no images or invalid response`);
  // НЕТ ПОВТОРНОЙ ПОПЫТКИ!
}
```

**Решение**: Добавить retry логику с экспоненциальной задержкой.

### 3. **Медленная работа генератора**
**Причины**:
- Последовательные API вызовы вместо параллельных
- Отсутствие кеширования
- Синхронная обработка изображений
- Множественные запросы к backend

**Текущие проблемы**:
```typescript
// Последовательные вызовы
const regionsResp = await currentAuthFetch(`${backendUrl}/api/ads/reference/regions/`);
const citiesResp = await currentAuthFetch(`${backendUrl}/api/ads/reference/cities/?region_id=${resolvedRegionId}`);

// Синхронная обработка изображений
for (let idx = 0; idx < genData.images.length; idx++) {
  const saveResp = await currentAuthFetch(`${backendUrl}/api/ads/${createdAd.id}/images`, {
    // Синхронный вызов
  });
}
```

## 🎯 План исправлений

### 1. **Исправить выбор типа транспорта**
- Добавить весовое распределение в backend endpoint
- Или создать отдельные endpoints для каждого типа

### 2. **Добавить retry логику для изображений**
- Максимум 3 попытки с экспоненциальной задержкой
- Логирование неудачных попыток

### 3. **Оптимизировать производительность**
- Параллельные API вызовы
- Кеширование данных
- Асинхронная обработка изображений
- Batch операции

### 4. **Добавить мониторинг**
- Логирование времени выполнения
- Метрики успешности
- Отслеживание ошибок

## 🔧 Технические детали

### Backend оптимизации
```python
# Вместо order_by('?') использовать весовое распределение
def get_weighted_random_models(count):
    vehicle_types = VehicleType.objects.all()
    weights = [vt.weight or 1 for vt in vehicle_types]  # Добавить поле weight
    selected_types = random.choices(vehicle_types, weights=weights, k=count)
    # Выбираем модели для каждого типа
```

### Frontend оптимизации
```typescript
// Параллельные вызовы
const [regionsResp, citiesResp] = await Promise.all([
  currentAuthFetch(`${backendUrl}/api/ads/reference/regions/`),
  currentAuthFetch(`${backendUrl}/api/ads/reference/cities/`)
]);

// Retry логика
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## 📊 Ожидаемые улучшения

- **Случайность типов транспорта**: 100% равномерное распределение
- **Надежность изображений**: 95%+ успешность генерации
- **Производительность**: 3-5x ускорение генерации
- **Мониторинг**: Полная видимость процесса

