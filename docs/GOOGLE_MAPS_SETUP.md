# Google Maps API Setup

## Настройка Google Maps API для отображения карт в профиле

### 1. Получение API ключа

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите следующие API:
   - **Google Maps JavaScript API**
   - **Google Maps Embed API**
   - **Google Maps Geocoding API** (уже используется в backend)

### 2. Создание API ключа

1. Перейдите в раздел "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "API Key"
3. Скопируйте созданный ключ

### 3. Настройка ограничений (рекомендуется)

1. Нажмите на созданный API ключ
2. В разделе "Application restrictions" выберите "HTTP referrers"
3. Добавьте домены:
   - `localhost:3000/*` (для разработки)
   - `yourdomain.com/*` (для продакшена)
4. В разделе "API restrictions" выберите "Restrict key" и выберите:
   - Google Maps JavaScript API
   - Google Maps Embed API

### 4. Шифрование и добавление ключа в проект

**Шаг 1: Зашифруйте ваш Google Maps API ключ**

```bash
cd backend
python core/security/key_encryption_tool.py -k GOOGLE_MAPS_API_KEY -a "ваш_google_maps_api_ключ_здесь"
```

**Шаг 2: Добавьте зашифрованный ключ в env-config/.env.secrets**

Скопируйте полученную строку `ENCRYPTED_GOOGLE_MAPS_API_KEY=...` и добавьте её в файл `env-config/.env.secrets` в секцию "ЗАШИФРОВАННЫЕ КЛЮЧИ ДЛЯ BACKEND".

### 5. Перезапуск сервера

После добавления ключа перезапустите Next.js сервер:

```bash
cd frontend
npm run dev
```

## Функциональность

После настройки API ключа в профиле пользователя будут доступны:

### ✅ Что работает сейчас:
- **Отображение пользовательского ввода** (input_region, input_locality)
- **Стандартизированные данные** от Google Maps (region, locality)
- **Координаты** (latitude, longitude)
- **Google Place ID** для уникальной идентификации
- **Ссылки на Google Maps** (работают без API ключа)

### 🗺️ Что появится после настройки API ключа:
- **Встроенные карты Google Maps** в каждой карточке адреса
- **Интерактивные карты** с возможностью масштабирования
- **Точное позиционирование** по Place ID или координатам

## Структура данных адресов

```typescript
interface RawAccountAddress {
  id: number;
  
  // Пользовательский ввод
  input_region: string;    // "Київська область"
  input_locality: string;  // "Київ"
  
  // Стандартизированные данные (Google Maps)
  region: string;          // "Kyiv Oblast"
  locality: string;        // "Kyiv"
  geo_code: string;        // "ChIJBUVa4U7P1EAR_kYBF9IxSXY"
  latitude: number;        // 50.4501
  longitude: number;       // 30.5234
  
  // Статус обработки
  is_geocoded: boolean;    // true/false
  geocoding_error?: string; // Ошибка если есть
}
```

## Безопасность

- API ключ ограничен только необходимыми сервисами
- Домены ограничены для предотвращения злоупотреблений
- Ключ хранится в переменных окружения, не в коде

## Альтернативы

Если не хотите настраивать Google Maps API:
- Ссылки "Open in Google Maps" работают без API ключа
- Координаты отображаются в текстовом виде
- Стандартизированные адреса доступны для сравнения
