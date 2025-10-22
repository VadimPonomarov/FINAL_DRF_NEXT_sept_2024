# Оптимизированная архитектура API

## Проблема
Ранее логика была разбросана по routes и helpers, что создавало:
- Дублирование кода
- Сложность тестирования
- Плохую переиспользуемость
- Смешанные ответственности

## Решение
Создана оптимизированная архитектура с разделением ответственности:

### 1. Параметризированные хелперы (`parameterized-helpers.ts`)
```typescript
// Процедуры с параметрами
const result = await ApiProcedures.get('/api/ads', { page: 1, limit: 10 }, {
  enableCache: true,
  cacheTtl: 300000,
  enableRetry: true,
  maxRetries: 3
});
```

### 2. Сервисы (`services/`)
```typescript
// Бизнес-логика вынесена в сервисы
const result = await TestAdsService.generateTestAds(request, {
  count: 10,
  includeImages: true,
  imageTypes: ['front', 'side']
});
```

### 3. Унифицированный API клиент (`unified-api-client.ts`)
```typescript
// Единый интерфейс для всех API
const client = ApiClientFactory.createBackendClient();
const result = await client.get('/api/ads', { page: 1 });
```

## Архитектура

### Слои ответственности:

1. **Routes** - только маршрутизация и валидация входных данных
2. **Services** - бизнес-логика и оркестрация
3. **Helpers** - параметризированные процедуры с настройками
4. **API Client** - унифицированный клиент для HTTP запросов

### Преимущества:

✅ **Разделение ответственности** - каждый слой имеет четкую роль  
✅ **Переиспользуемость** - сервисы можно использовать в разных местах  
✅ **Тестируемость** - легко тестировать отдельные компоненты  
✅ **Параметризация** - гибкие настройки для разных сценариев  
✅ **Кэширование** - встроенное кэширование с TTL  
✅ **Retry логика** - автоматические повторы при ошибках  
✅ **Логирование** - структурированное логирование  

## Использование

### В API Routes:
```typescript
export const POST = createAuthEndpoint(async (request: NextRequest) => {
  // Парсинг параметров
  const params = parseRequestParams(request);
  
  // Делегирование в сервис
  const result = await TestAdsService.generateTestAds(request, params);
  
  // Возврат результата
  return createSuccessResponse(result);
});
```

### В компонентах:
```typescript
// Прямое использование API клиента
const client = ApiClientFactory.createBackendClient();
const ads = await client.get('/api/ads', { page: 1 });

// Или через параметризированные процедуры
const ads = await ApiProcedures.get('/api/ads', { page: 1 }, {
  enableCache: true,
  cacheTtl: 300000
});
```

### В сервисах:
```typescript
export class TestAdsService {
  static async generateTestAds(request: NextRequest, params: TestAdsGenerationParams) {
    // Валидация
    this.validateParams(params);
    
    // Бизнес-логика
    const result = await this.createAdsWithImages(request, params);
    
    // Возврат результата
    return result;
  }
}
```

## Миграция

### Было:
```typescript
export async function POST(request: NextRequest) {
  // Вся логика в route
  const body = await request.json();
  const headers = await getAuthorizationHeaders();
  const response = await fetch(url, { headers, body });
  // ... обработка ответа
}
```

### Стало:
```typescript
export const POST = createAuthEndpoint(async (request: NextRequest) => {
  const params = parseRequestParams(request);
  const result = await TestAdsService.generateTestAds(request, params);
  return createSuccessResponse(result);
});
```

## Конфигурация

### Параметры процедур:
```typescript
interface ApiProcedureOptions {
  enableCache?: boolean;        // Включить кэширование
  cacheTtl?: number;           // TTL кэша в мс
  enableRetry?: boolean;       // Включить retry
  maxRetries?: number;         // Максимум попыток
  enableLogging?: boolean;     // Включить логирование
  enableValidation?: boolean;  // Включить валидацию
}
```

### Конфигурация API клиента:
```typescript
const client = new UnifiedApiClient({
  baseUrl: 'http://localhost:8000',
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryOn: [500, 502, 503, 504]
  },
  cacheConfig: {
    enabled: true,
    defaultTtl: 300000,
    maxSize: 100
  }
});
```

## Результат

- ✅ **Код стал чище** - routes содержат только маршрутизацию
- ✅ **Логика переиспользуема** - сервисы можно использовать везде
- ✅ **Легко тестировать** - каждый компонент изолирован
- ✅ **Гибкие настройки** - параметризация для разных сценариев
- ✅ **Автоматические возможности** - кэширование, retry, логирование
- ✅ **Единый интерфейс** - унифицированный API клиент
