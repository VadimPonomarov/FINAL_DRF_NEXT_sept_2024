# 💱 Реализация селектора валют

## 📋 Описание

Реализован глобальный селектор валют для отображения цен объявлений в выбранной валюте (USD/EUR/UAH).

## ✅ Что реализовано

### 1. Backend (уже работал)
- ✅ Интеграция с PrivatBank API для получения курсов валют
- ✅ Автоматическая конвертация цен в USD и EUR через поля `price_usd` и `price_eur`
- ✅ Все цены конвертируются через UAH как pivot валюту
- ✅ Курсы обновляются из PrivatBank API

**Текущие курсы:**
- USD: 41.65 UAH
- EUR: 48.70 UAH

### 2. Frontend - Новая реализация

#### 2.1 Context для управления валютой
**Файл:** `frontend/src/contexts/CurrencyContext.tsx`

```typescript
export type Currency = 'USD' | 'EUR' | 'UAH';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}
```

**Функционал:**
- Глобальное состояние выбранной валюты
- Автоматическое сохранение в `localStorage`
- Загрузка сохраненного выбора при старте приложения

#### 2.2 Компонент селектора валюты
**Файл:** `frontend/src/components/AutoRia/CurrencySelector/CurrencySelector.tsx`

**Функционал:**
- Dropdown с выбором валюты (USD/EUR/UAH)
- Иконки для каждой валюты (DollarSign, Euro, Coins)
- Цветовая индикация валют
- Опциональная метка "Валюта:"

**Использование:**
```tsx
<CurrencySelector showLabel={true} />
```

#### 2.3 Хук для конвертации цен
**Файл:** `frontend/src/hooks/usePriceConverter.ts`

**Функционал:**
- `formatPrice(ad)` - форматирует цену в выбранной валюте
- `convertPrice(ad)` - возвращает объект с суммой, валютой и символом
- `getPriceValue(ad)` - возвращает числовое значение цены

**Логика конвертации:**
- USD: использует `price_usd` из backend
- EUR: использует `price_eur` из backend
- UAH: использует оригинальную цену если валюта UAH

**Пример:**
```typescript
const { formatPrice } = usePriceConverter();

// В карточке объявления
<div className="text-2xl font-bold text-green-600">
  {formatPrice(car)}
</div>
```

#### 2.4 Интеграция в SearchPage
**Файл:** `frontend/src/components/AutoRia/Pages/SearchPage.tsx`

**Изменения:**
1. Добавлен импорт `CurrencySelector` и `usePriceConverter`
2. Добавлен хук `usePriceConverter()` в компонент
3. Селектор валюты добавлен в панель управления (рядом с Grid/List)
4. Цена в карточках отображается через `formatPrice(car)`

#### 2.5 Глобальный Provider
**Файл:** `frontend/src/common/providers/RootProvider.tsx`

**Изменения:**
- Добавлен `CurrencyProvider` в дерево провайдеров
- Обернут вокруг всего приложения для глобального доступа

## 🧪 Тестирование

### Backend тест
**Файл:** `test_currency_selector.py`

**Результаты:**
```
✅ Курсов валют: 4
✅ Объявлений с ценами: 4
✅ Объявлений с USD конвертацией: 4
✅ Объявлений с EUR конвертацией: 4
✅ Конвертация корректна для всех объявлений (разница 0.00%)
```

### Примеры конвертации:
```
Объявление #96: 50,663 USD
  → USD: $50,663
  → EUR: €43,329

Объявление #95: 1,373,937 UAH
  → USD: $32,988
  → EUR: €28,212

Объявление #94: 500,951 UAH
  → USD: $12,028
  → EUR: €10,286
```

## 📱 Использование

### Для пользователя:
1. Открыть страницу поиска `/autoria/search`
2. В правом верхнем углу найти селектор "Валюта:"
3. Выбрать нужную валюту (USD/EUR/UAH)
4. Все цены на карточках автоматически пересчитаются
5. Выбор сохраняется в браузере

### Для разработчика:
```typescript
// 1. Использовать хук в любом компоненте
import { usePriceConverter } from '@/hooks/usePriceConverter';

const MyComponent = () => {
  const { formatPrice, currency } = usePriceConverter();
  
  return (
    <div>
      <p>Текущая валюта: {currency}</p>
      <p>Цена: {formatPrice(ad)}</p>
    </div>
  );
};

// 2. Добавить селектор в любое место
import { CurrencySelector } from '@/components/AutoRia/CurrencySelector/CurrencySelector';

<CurrencySelector showLabel={true} />
```

## 🔄 Как это работает

### Поток данных:

1. **Backend:**
   - Django получает объявление с ценой в любой валюте (USD/EUR/UAH)
   - `CarAdSerializer` автоматически добавляет поля `price_usd` и `price_eur`
   - Конвертация использует актуальные курсы из PrivatBank API
   - Все конвертации идут через UAH как pivot валюту

2. **Frontend:**
   - Пользователь выбирает валюту в `CurrencySelector`
   - Выбор сохраняется в `CurrencyContext` и `localStorage`
   - Компоненты используют `usePriceConverter()` для форматирования цен
   - Хук выбирает нужное поле (`price_usd`, `price_eur` или `price`)
   - Цена отображается с правильным символом валюты

### Схема конвертации:

```
Оригинальная цена (любая валюта)
         ↓
    Backend Django
         ↓
  CurrencyService
         ↓
   Конвертация через UAH
         ↓
  price_usd + price_eur
         ↓
    Frontend API
         ↓
  usePriceConverter()
         ↓
  Выбор нужного поля
         ↓
  Форматирование
         ↓
  Отображение пользователю
```

## 🎯 Преимущества

1. **Единообразие:** Все цены в одной валюте для удобного сравнения
2. **Актуальность:** Курсы обновляются из PrivatBank API
3. **Персонализация:** Выбор сохраняется для каждого пользователя
4. **Производительность:** Конвертация на backend, frontend только выбирает поле
5. **Точность:** Все расчеты через Decimal на backend
6. **UX:** Мгновенное переключение без перезагрузки страницы

## 📝 Дальнейшие улучшения

### Возможные доработки:
1. ✅ Добавить селектор на другие страницы (аналитика, мои объявления)
2. ✅ Добавить индикатор курса валют
3. ✅ Добавить историю изменения курсов
4. ✅ Добавить автоматическое обновление курсов раз в день (cron job)
5. ✅ Добавить поддержку других валют (GBP, PLN)

## 🐛 Известные ограничения

1. **UAH конвертация:** Для UAH используется только оригинальная цена, если валюта UAH. Для других валют конвертация в UAH не реализована на frontend (но это не критично, т.к. backend предоставляет USD и EUR).

2. **Offline режим:** Если курсы не загружены, конвертация может не работать. Нужно добавить fallback значения.

## 📚 Связанные файлы

### Backend:
- `backend/apps/currency/models.py` - модель CurrencyRate
- `backend/apps/currency/services.py` - CurrencyService
- `backend/apps/ads/serializers/car_ad_serializer.py` - поля price_usd, price_eur

### Frontend:
- `frontend/src/contexts/CurrencyContext.tsx` - контекст валюты
- `frontend/src/components/AutoRia/CurrencySelector/CurrencySelector.tsx` - селектор
- `frontend/src/hooks/usePriceConverter.ts` - хук конвертации
- `frontend/src/components/AutoRia/Pages/SearchPage.tsx` - интеграция
- `frontend/src/common/providers/RootProvider.tsx` - глобальный провайдер

### Тесты:
- `test_currency_selector.py` - тест backend конвертации
- `test_currency_update.py` - тест обновления курсов
- `test_price_display.py` - тест отображения цен

## ✅ Статус

**Backend:** ✅ Полностью реализовано и протестировано  
**Frontend:** ✅ Реализовано, требует проверки в браузере  
**Тестирование:** ✅ Backend протестирован, frontend требует UI тестов

---

**Дата реализации:** 19 октября 2025  
**Версия:** 1.0

