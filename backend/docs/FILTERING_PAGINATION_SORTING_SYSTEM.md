# Система фильтрации, пагинации и сортировки AutoRia Backend

## Обзор

Система AutoRia использует Django REST Framework с django-filter для обеспечения мощных возможностей фильтрации, пагинации и сортировки объявлений о продаже автомобилей.

## 1. Система фильтрации

### 1.1 Основной класс фильтрации - CarAdFilter

Класс `CarAdFilter` в `backend/apps/ads/filters.py` предоставляет комплексную систему фильтрации объявлений:

```python
class CarAdFilter(django_filters.FilterSet):
    """
    Comprehensive filter for car advertisements.

    Supports filtering by:
    - Basic fields (price, year, mileage)
    - Location (region, city)
    - Car specifications (mark, model, color)
    - Status fields (validation, seller type)
    - Date ranges
    - Text search
    """
```

### 1.2 Типы фильтров

#### Фильтры по цене
- `price_min` - минимальная цена (gte)
- `price_max` - максимальная цена (lte)
- `price_range` - диапазон цен
- `currency` - валюта (USD, EUR, UAH)

#### Фильтры по местоположению
- `region` - регион (ModelChoiceFilter)
- `city` - город (ModelChoiceFilter)

#### Фильтры по характеристикам автомобиля
- `mark` - марка автомобиля (BMW, Toyota и т.д.)
- `model` - модель автомобиля
- `seller_type` - тип продавца (private, dealer, company)
- `exchange_status` - возможность обмена

#### Динамические фильтры (JSON поля)
- `year_min` / `year_max` - год выпуска
- `mileage_max` - максимальный пробег
- `engine_volume_min` / `engine_volume_max` - объем двигателя
- `fuel_type` - тип топлива
- `transmission` - тип коробки передач
- `body_type` - тип кузова
- `color` - цвет автомобиля
- `condition` - состояние автомобиля

#### Текстовый поиск
- `search` - поиск по заголовку и описанию
- `title_contains` - поиск в заголовке
- `description_contains` - поиск в описании

#### Фильтры по датам
- `created_after` / `created_before` - дата создания
- `updated_after` - дата обновления

### 1.3 Методы фильтрации динамических полей

```python
def filter_dynamic_field_gte(self, queryset, name, value):
    """Filter dynamic field with greater than or equal."""
    field_name = name.replace('_min', '')
    return queryset.filter(**{f'dynamic_fields__{field_name}__gte': value})

def filter_dynamic_field_lte(self, queryset, name, value):
    """Filter dynamic field with less than or equal."""
    field_name = name.replace('_max', '')
    return queryset.filter(**{f'dynamic_fields__{field_name}__lte': value})

def filter_dynamic_field_exact(self, queryset, name, value):
    """Filter dynamic field with exact match."""
    return queryset.filter(**{f'dynamic_fields__{name}__iexact': value})

def filter_search(self, queryset, name, value):
    """Search in title and description."""
    return queryset.filter(
        models.Q(title__icontains=value) |
        models.Q(description__icontains=value)
    )
```

### 1.4 Примеры использования API

#### Фильтрация по цене
```
GET /api/ads/cars/?price_min=10000&price_max=50000&currency=USD
```

#### Фильтрация по местоположению
```
GET /api/ads/cars/?region=1&city=5
```

#### Фильтрация по характеристикам
```
GET /api/ads/cars/?mark=1&year_min=2015&year_max=2023&fuel_type=petrol
```

#### Комбинированная фильтрация
```
GET /api/ads/cars/?mark=1&price_min=15000&price_max=30000&year_min=2018&region=1&search=BMW
```

## 2. Система пагинации

### 2.1 Классы пагинации

#### CustomPageNumberPagination (StandardResultsSetPagination)
```python
class CustomPageNumberPagination(PageNumberPagination):
    page_size = 50  # Размер страницы по умолчанию
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 10000  # Максимальный размер страницы
```

#### ReferenceDataPagination
```python
class ReferenceDataPagination(PageNumberPagination):
    page_size = 5000  # Большой размер для справочных данных
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 10000  # Максимум 10000 записей за раз
```

### 2.2 Формат ответа пагинации

```json
{
    "page": 1,
    "total": 150,
    "page_size": 50,
    "prev": false,
    "next": true,
    "results": [...]
}
```

### 2.3 Примеры использования

#### Базовая пагинация
```
GET /api/ads/cars/?page=1&page_size=20
```

#### Пагинация с фильтрами
```
GET /api/ads/cars/?page=2&page_size=30&mark=1&price_min=10000
```

## 3. Система сортировки

### 3.1 Настройка сортировки в views

```python
class CarAdListView(generics.ListAPIView):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    ordering_fields = ['created_at', 'updated_at', 'price', 'title']
    ordering = ['-created_at']  # Сортировка по умолчанию
```

### 3.2 Доступные поля для сортировки

#### Для объявлений (CarAdListView)
- `created_at` - дата создания
- `updated_at` - дата обновления
- `price` - цена
- `title` - заголовок
- `dynamic_fields__year` - год выпуска автомобиля
- `dynamic_fields__mileage` - пробег автомобиля

#### Для личных объявлений (MyCarAdsListView)
- `created_at` - дата создания
- `updated_at` - дата обновления
- `price` - цена
- `title` - заголовок
- `is_validated` - статус валидации
- `dynamic_fields__year` - год выпуска автомобиля
- `dynamic_fields__mileage` - пробег автомобиля

### 3.3 Примеры использования

#### Сортировка по цене (по возрастанию)
```
GET /api/ads/cars/?ordering=price
```

#### Сортировка по цене (по убыванию)
```
GET /api/ads/cars/?ordering=-price
```

#### Сортировка по дате создания
```
GET /api/ads/cars/?ordering=-created_at
```

#### Сортировка по году выпуска (новые сначала)
```
GET /api/ads/cars/?ordering=-dynamic_fields__year
```

#### Сортировка по пробегу (меньший пробег сначала)
```
GET /api/ads/cars/?ordering=dynamic_fields__mileage
```

#### Множественная сортировка
```
GET /api/ads/cars/?ordering=-price,created_at
```

## 4. Оптимизация производительности

### 4.1 Оптимизация запросов

#### select_related для связанных объектов
```python
def get_queryset(self):
    return CarAd.objects.filter(
        status=AdStatusEnum.ACTIVE
    ).select_related(
        'account', 'account__user', 'mark', 'moderated_by'
    )
```

#### prefetch_related для обратных связей
```python
.prefetch_related(
    Prefetch(
        'images',
        queryset=AddImageModel.objects.filter(
            Q(is_primary=True) | Q(image__isnull=False)
        ).order_by('-is_primary', 'id'),
        to_attr='prefetched_images'
    )
)
```

### 4.2 Индексы базы данных

```python
class Meta:
    indexes = [
        models.Index(fields=['created_at']),
        models.Index(fields=['seller_type']),
    ]
```

## 5. Интеграция с Frontend

### 5.1 Компонент пагинации

Frontend использует кастомный хук `usePaginationComponent` для управления пагинацией:

```typescript
const usePaginationComponent = ({ total, baseUrl }: IProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Логика управления пагинацией
}
```

### 5.2 Параметры URL

Frontend использует параметры `skip` и `limit` вместо `page` и `page_size`:
- `skip` - количество пропущенных записей
- `limit` - количество записей на странице

## 6. Конфигурация DRF

### 6.1 Настройки в settings.py

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('DRF_PAGE_SIZE', 20)),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

## 7. Справочные фильтры

### 7.1 CarMarkFilter
```python
class CarMarkFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    ordering = django_filters.OrderingFilter(
        fields=(('name', 'name'), ('created_at', 'created_at'))
    )
```

### 7.2 CarModelFilter
```python
class CarModelFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    mark = django_filters.ModelChoiceFilter(queryset=CarMarkModel.objects.all())
```

## 8. Рекомендации по использованию

1. **Используйте комбинированные фильтры** для точного поиска
2. **Оптимизируйте запросы** с помощью select_related и prefetch_related
3. **Добавляйте индексы** для часто используемых полей фильтрации
4. **Ограничивайте размер страницы** для лучшей производительности
5. **Кэшируйте справочные данные** для ускорения загрузки

## 9. Мониторинг и отладка

Для отладки запросов используйте Django Debug Toolbar или логирование SQL запросов:

```python
import logging
logging.getLogger('django.db.backends').setLevel(logging.DEBUG)
```

## 10. API Endpoints

### 10.1 Основные endpoints для объявлений

- `GET /api/ads/cars/` - список всех активных объявлений
- `GET /api/ads/cars/my` - список объявлений пользователя
- `GET /api/ads/cars/{id}/` - детали объявления

### 10.2 Справочные endpoints

- `GET /api/ads/reference/marks/` - список марок автомобилей
- `GET /api/ads/reference/car-models/` - список моделей
- `GET /api/ads/reference/car-models/by-mark?mark_id=1` - модели по марке
- `GET /api/ads/reference/car-colors/` - список цветов
- `GET /api/ads/reference/regions/` - список регионов
- `GET /api/ads/reference/cities/` - список городов
- `GET /api/ads/reference/cities/by-region?region_id=1` - города по региону

## 11. Примеры комплексных запросов

### 11.1 Поиск BMW X5 в Киеве до $30000
```
GET /api/ads/cars/?mark=1&model=5&region=1&price_max=30000&currency=USD&page=1&page_size=20
```

### 11.2 Поиск автомобилей 2018-2023 года с автоматической коробкой
```
GET /api/ads/cars/?year_min=2018&year_max=2023&transmission=automatic&ordering=-created_at
```

### 11.3 Текстовый поиск с фильтрацией по цене
```
GET /api/ads/cars/?search=BMW&price_min=15000&price_max=50000&ordering=price
```