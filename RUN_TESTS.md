# 🧪 Як запустити тести

## ✅ Що зроблено

1. **Асинхронна генерація зображень** - `backend/apps/chat/utils/async_image_generation.py`
2. **Консистентність** - session_id + seeds для одного авто на всіх ракурсах
3. **Django адаптери** - sync_to_async / async_to_sync
4. **Документація** - `docs/ASYNC_IMAGE_GENERATION.md`
5. **Тестові скрипти** - `test_async_image_generation.py` (повний), `quick_test.py` (швидкий)

---

## 🚀 Швидкий тест (2 зображення)

```bash
# 1. Запустити backend (якщо не запущений)
cd backend
venv\Scripts\activate
python manage.py runserver

# 2. У новому терміналі - швидкий тест
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024
python quick_test.py
```

**Очікувані результати**:
- ✅ Генерація за ~10-15 секунд
- ✅ 2 зображення з унікальними seeds
- ✅ Один session_id
- ✅ Consistency hints в промптах

---

## 🧪 Повний тест (5 тест-кейсів, ~15 зображень)

```bash
python test_async_image_generation.py
```

**Що тестується**:
1. ⚡ **Швидкість** - асинхронна vs послідовна генерація
2. 🔗 **Консистентність** - один автомобіль на всіх ракурсах
3. 🎯 **Релевантність** - відповідність параметрам (марка, модель, колір, рік, тип)
4. 🏷️ **Якість логотипів** - правильні brand badges

**Тест-кейси**:
- Renault Clio (проблемний логотип)
- Mercedes-Benz E-Class (популярний бренд)
- Great Wall H6 (китайський бренд)
- BMW X5 (червоний колір)
- Peugeot 308 (французький бренд)

**Очікуваний час**: ~2-3 хвилини

---

## 📊 Оцінка результатів

### Консистентність (30%)
- Єдиний session_id ✅
- Унікальні seeds ✅
- Consistency hints в промптах ✅

### Релевантність (40%)
- Brand в промпті ✅
- Model в промпті ✅
- Year в промпті ✅
- Color в промпті ✅
- Body type в промпті ✅

### Якість логотипів (30%)
- Правильний логотип згадується ✅
- Неправильні логотипи відсутні ✅
- Негативні інструкції (NOT ...) ⚠️
- Візуальний опис логотипу ✅

---

## 🔍 Перевірка результатів вручну

### 1. Відкрити згенеровані URLs у браузері
Скопіювати URLs з виводу тесту та візуально перевірити:
- Чи однаковий колір на всіх фото
- Чи той самий автомобіль
- Чи правильний логотип на решітці радіатора

### 2. Перевірити логи backend
```bash
# У вікні backend шукати:
[AsyncGen] Starting parallel prompt generation
[AsyncSearch] Logo info found
[AsyncSearch] Reference photo found
[AsyncImages] Starting parallel image generation
[AsyncImage] Generated front with seed 123456
```

### 3. Перевірити час виконання
- **Раніше** (послідовна): 3 ракурси × 10s = 30s
- **Зараз** (паралельна): 3 ракурси = ~10s
- **Прискорення**: 3x

---

## 🐛 Troubleshooting

### Backend не запускається
```bash
cd backend
docker-compose up -d pg redis rabbitmq
venv\Scripts\activate
python manage.py runserver
```

### Помилка "Connection refused"
Перевірити що backend на http://localhost:8000:
```bash
curl http://localhost:8000/health/
```

### Тест зависає
Збільшити timeout у тесті або запустити швидкий тест:
```bash
python quick_test.py
```

---

## 📝 Приклад успішного результату

```
🚀 Тест асинхронної генерації...
📋 Марка: Renault Clio
📸 Ракурси: 2

✅ Успіх! Час: 12.3s
📊 Згенеровано: 2 зображень
🔗 Session ID: CAR-3f8a9b2c
🎲 Seeds: [123456, 654321]
✓ Унікальні: ✅
✓ Consistency hints: 2/2

🖼️ Зображення:
   front: https://image.pollinations.ai/prompt/2019%20Renault%20...
   side: https://image.pollinations.ai/prompt/2019%20Renault%20...
```

---

## ✅ Критерії успіху

### Швидкість ⚡
- [x] 2 ракурси за ~10-15 секунд
- [x] 3 ракурси за ~10-20 секунд
- [x] Паралельна генерація працює

### Консистентність 🔗
- [x] Один session_id для всієї серії
- [x] Унікальні seeds для кожного ракурсу
- [x] Consistency hints в промптах

### Релевантність 🎯
- [x] Brand, model, year в промптах
- [x] Color в промптах
- [x] Body type в промптах

### Логотипи 🏷️
- [x] Web search для логотипів
- [x] Референсні фото автомобілів
- [x] Детальні описи логотипів

---

## 📚 Документація

- `docs/ASYNC_IMAGE_GENERATION.md` - повна документація
- `docs/CELERY_TASKS_AUDIT.md` - аудит Celery tasks
- `ASYNC_CONSISTENCY_UPDATE.md` - звіт про зміни

