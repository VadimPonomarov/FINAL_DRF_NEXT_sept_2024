# Обновленный процесс модерации объявлений

## Обзор изменений

Система модерации была обновлена для интеграции с задачей 4 (аналитика объявлений) и включает:

1. **Новые поля статуса** в модели CarAd
2. **Интеграция с существующей системой модерации**
3. **Отслеживание модераторов** (человек или автомодерация)
4. **Обновленная аналитика** с учетом статусов

## Статусы объявлений (AdStatusEnum)

```python
class AdStatusEnum(models.TextChoices):
    DRAFT = 'draft', 'Черновик'
    NEEDS_REVIEW = 'needs_review', 'Требует проверки'
    ACTIVE = 'active', 'Активно'
    REJECTED = 'rejected', 'Отклонено'
    INACTIVE = 'inactive', 'Неактивно'
```

## Новые поля модели CarAd

```python
# Статус объявления
status = models.CharField(
    max_length=20,
    choices=AdStatusEnum.choices,
    default=AdStatusEnum.DRAFT,
    help_text='Current status of the advertisement'
)

# Кто проводил модерацию
moderated_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='moderated_ads',
    help_text='User who moderated this ad (null for auto-moderation)'
)

# Когда была проведена модерация
moderated_at = models.DateTimeField(
    null=True,
    blank=True,
    help_text='When the ad was last moderated'
)

# Причина решения модерации
moderation_reason = models.TextField(
    blank=True,
    help_text='Reason for moderation decision'
)
```

## Процесс создания объявления

### 1. Создание (CarAdCreateView)
```python
def perform_create(self, serializer):
    # 1. Создать объявление в статусе DRAFT
    ad = serializer.save(
        account=account,
        status=AdStatusEnum.DRAFT,
        is_validated=False
    )
    
    # 2. Запустить полный процесс модерации
    success, message, details = AdModerationService.moderate_ad(ad)
    
    # 3. Обработать результат
    if success:
        # Объявление ACTIVE, готово к показу
        ad.is_validated = True
        ad.moderated_at = timezone.now()
        ad.moderation_reason = message
    else:
        # Объявление отклонено или требует правок
        ad.validation_errors = details
        ad.moderation_reason = message
        ad.moderated_at = timezone.now()
        # moderated_by = None (автомодерация)
```

### 2. Редактирование (CarAdUpdateView)
```python
def perform_update(self, serializer):
    # 1. Сохранить изменения
    ad = serializer.save()
    
    # 2. Если изменился контент - перемодерировать
    if content_changed:
        ad.status = AdStatusEnum.NEEDS_REVIEW
        ad.is_validated = False
        
        # 3. Запустить модерацию
        success, message, details = AdModerationService.moderate_ad(ad)
        
        # 4. Обновить статус
        if success:
            # Объявление снова ACTIVE
        else:
            # Объявление требует правок или отклонено
```

## Интеграция с AdModerationService

### Обновленная логика модерации
```python
class AdModerationService:
    @classmethod
    def moderate_ad(cls, ad) -> Tuple[bool, str, Dict]:
        # 1. Проверка прав (менеджер/админ → автоодобрение)
        if can_bypass_moderation(ad.account.user):
            ad.status = AdStatusEnum.ACTIVE
            ad.moderated_by = ad.account.user  # Человек-модератор
            ad.moderated_at = timezone.now()
            ad.save()
            return True, "Автоодобрено для менеджера"
        
        # 2. Проверка лимита попыток (3 раза)
        if ModerationTracker.has_exceeded_attempts_limit(ad):
            ad.status = AdStatusEnum.REJECTED
            ad.moderated_by = None  # Автомодерация
            ad.moderated_at = timezone.now()
            ad.save()
            return False, "Превышен лимит попыток"
        
        # 3. Проверка контента через LLM
        result, details = ContentModerator.check_content(ad.description, ad.title)
        
        if result == ModerationResult.APPROVED:
            ad.status = AdStatusEnum.ACTIVE
            ad.moderated_by = None  # Автомодерация
            ad.moderated_at = timezone.now()
            ad.save()
            return True, "Автоодобрено"
        
        elif result == ModerationResult.NEEDS_REVIEW:
            ad.status = AdStatusEnum.NEEDS_REVIEW
            ad.moderated_by = None  # Автомодерация
            ad.moderated_at = timezone.now()
            ad.save()
            return False, "Требует правок"
```

## Отображение объявлений

### Публичные списки (CarAdListView, CarAdDetailView)
- Показывают только объявления со статусом `ACTIVE`
- Фильтрация: `queryset = CarAd.objects.filter(status=AdStatusEnum.ACTIVE)`

### Личный кабинет (MyCarAdsListView)
- Показывает все объявления пользователя независимо от статуса
- Включает информацию о статусе модерации

## Аналитика с учетом модерации

### Информация о модерации в аналитике
```json
{
  "ad_id": 123,
  "title": "Toyota Camry",
  "status": "active",
  "is_validated": true,
  "moderated_at": "2024-01-15T10:30:00Z",
  "moderated_by": "Auto-moderation",
  "views": {...},
  "pricing": {...}
}
```

### Сравнение цен
- Для расчета средних цен используются только `ACTIVE` объявления
- Исключаются объявления в статусах DRAFT, NEEDS_REVIEW, REJECTED, INACTIVE

## Уведомления

### Автоматические уведомления через Celery
1. **Объявление одобрено**: `notify_ad_approved.delay(ad_id, user_id)`
2. **Требует правок**: `notify_ad_needs_edit.delay(ad_id, user_id, reason, attempts)`
3. **Превышен лимит**: `notify_ad_max_attempts_reached.delay(ad_id, user_id, attempts)`

## Логирование модерации

### AdModerationLog
- Ведется детальный лог всех действий модерации
- Отслеживание попыток редактирования
- История решений модераторов

### ModerationTracker
- Подсчет попыток модерации
- Проверка лимитов
- Получение истории модерации

## API изменения

### Новые поля в ответах API
```json
{
  "status": "active",
  "moderated_at": "2024-01-15T10:30:00Z",
  "moderated_by": "Auto-moderation",
  "moderation_reason": "Автоодобрено"
}
```

### Ошибки модерации
```json
{
  "moderation_error": "Знайдено неприйнятний контент",
  "details": {
    "attempts_count": 2,
    "remaining_attempts": 1,
    "violations": ["inappropriate_content"]
  }
}
```

## Миграция данных

### Миграция 0002_add_moderation_status_fields
- Добавляет поля: `status`, `moderated_by`, `moderated_at`, `moderation_reason`
- Устанавливает статус `ACTIVE` для всех `is_validated=True` объявлений
- Устанавливает статус `DRAFT` для остальных

## Тестирование

### Обновленные тесты
- Тесты создания объявлений с модерацией
- Тесты редактирования с перемодерацией
- Тесты аналитики с учетом статусов
- Тесты отслеживания просмотров

### Запуск тестов
```bash
python manage.py test apps.ads.tests.test_ad_analytics
python manage.py test apps.ads.tests.test_moderation
```

## Безопасность

### Контроль доступа
- Только владельцы могут видеть аналитику своих объявлений
- Модераторы могут видеть все объявления
- Публичный доступ только к ACTIVE объявлениям

### Валидация
- Проверка прав на редактирование
- Валидация статусов при переходах
- Защита от спама через лимиты попыток
