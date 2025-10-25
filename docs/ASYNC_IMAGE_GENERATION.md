# ⚡ Асинхронна Генерація Зображень з Консистентністю

## 📋 Зміст

1. [Огляд](#огляд)
2. [Консистентність (Один Автомобіль - Різні Ракурси)](#консистентність)
3. [Асинхронність (Паралельна Генерація)](#асинхронність)
4. [Архітектура](#архітектура)
5. [Використання](#використання)
6. [Приклад](#приклад)

---

## Огляд

Система генерації зображень забезпечує:

1. **Консистентність**: Всі ракурси відображають ОДИН і той же автомобіль
2. **Асинхронність**: Всі зображення генеруються паралельно для швидкості
3. **Web Search**: Динамічний пошук логотипів та референсних фото
4. **Fallback**: Багаторівневі fallback-и для надійності

---

## Консистентність

### Проблема

При генерації множини ракурсів (front, side, rear) AI може генерувати **РІЗНІ** автомобілі:
- Різні кольори
- Різні моделі
- Різні деталі

### Рішення: Session ID + Seed

```python
# 1. Єдиний Session ID для всієї серії
session_id = generate_consistent_session_id(brand, model, year, color, body_type)
# Приклад: "3f8a9b2c1d5e"

# 2. Унікальний Seed для кожного ракурсу (базується на session_id)
seed_front = generate_consistent_seed(session_id, "front")  # 123456
seed_side = generate_consistent_seed(session_id, "side")    # 654321
seed_rear = generate_consistent_seed(session_id, "rear")    # 789012
```

### Як це працює

#### 1. Генерація Session ID

```python
def generate_consistent_session_id(brand: str, model: str, year: int, 
                                    color: str, body_type: str) -> str:
    """
    Створює унікальний ID для серії зображень одного авто.
    """
    session_data = f"{brand}_{model}_{year}_{color}_{body_type}_{int(time.time())}"
    session_id = hashlib.md5(session_data.encode()).hexdigest()[:12]
    return session_id
```

#### 2. Генерація Seed для Ракурсу

```python
def generate_consistent_seed(session_id: str, angle: str) -> int:
    """
    Генерує seed для конкретного ракурсу.
    Один session_id + різні angles = різні seeds, але для ОДНОГО авто.
    """
    seed_data = f"{session_id}_{angle}"
    seed = abs(hash(seed_data)) % 1000000
    return seed
```

#### 3. Промпт з Consistency Hints

```python
prompt = f"""
{year} {brand} {model} {body_type}, {color}, {angle} view.

CONSISTENCY: Same vehicle across all angles (Session: {session_id}, Seed: {seed}).
Show {logo_description} on front grille, clearly visible.

Photorealistic automotive photography, authentic {brand} design.
Same exact vehicle from different angle, identical color and details.
"""
```

---

## Асинхронність

### Проблема

Послідовна генерація повільна:
- 3 ракурси × 10 секунд = **30 секунд**
- Користувач чекає довго
- Неефективне використання ресурсів

### Рішення: Async/Await + sync_to_async/async_to_sync

```python
# Паралельна генерація 3 ракурсів = ~10 секунд (замість 30)
angle_prompts = sync_generate_all_prompts(...)  # Паралельний web search
generated_images = sync_generate_all_images(...)  # Паралельна генерація
```

### Етапи Асинхронності

#### Етап 1: Паралельний Web Search

```python
async def async_generate_all_prompts(...):
    # 1. Web search для логотипу (один раз)
    logo_info = await async_web_search_for_logo(brand)
    
    # 2. Паралельний пошук референсних фото для ВСІХ ракурсів
    photo_tasks = [
        async_real_photo_search(brand, model, year, "front"),
        async_real_photo_search(brand, model, year, "side"),
        async_real_photo_search(brand, model, year, "rear"),
    ]
    
    references = await asyncio.gather(*photo_tasks)  # Паралельно!
    
    # 3. Паралельна генерація промптів
    prompt_tasks = [
        async_generate_prompt_for_angle(..., angle="front", ...),
        async_generate_prompt_for_angle(..., angle="side", ...),
        async_generate_prompt_for_angle(..., angle="rear", ...),
    ]
    
    prompts = await asyncio.gather(*prompt_tasks)  # Паралельно!
```

#### Етап 2: Паралельна Генерація Зображень

```python
async def async_generate_all_images(angle_prompts, ...):
    # Паралельна генерація ВСІХ зображень
    tasks = [
        async_generate_image_from_prompt(prompt_data_1, ...),
        async_generate_image_from_prompt(prompt_data_2, ...),
        async_generate_image_from_prompt(prompt_data_3, ...),
    ]
    
    images = await asyncio.gather(*tasks)  # Паралельно!
```

### Django Адаптери

```python
from asgiref.sync import sync_to_async, async_to_sync

# 1. Перетворюємо синхронну функцію на асинхронну
async_search = sync_to_async(search_brand_logo_info, thread_sensitive=False)
logo_info = await async_search(brand)

# 2. Перетворюємо асинхронну функцію на синхронну (для Django view)
sync_wrapper = async_to_sync(async_generate_all_prompts)
prompts = sync_wrapper(brand, model, year, color, body_type, angles)
```

---

## Архітектура

### Файлова Структура

```
backend/apps/chat/
├── views/
│   └── image_generation_views.py     # Django REST View (синхронний)
└── utils/
    ├── async_image_generation.py      # ⚡ Асинхронна логіка
    ├── brand_logo_search.py           # Web search (DuckDuckGo)
    └── brand_logo_descriptions.py     # Fallback база логотипів
```

### Потік Даних

```
┌─────────────────────────────────────────────────────────────────┐
│  Django View (синхронний)                                       │
│  generate_car_images_with_mock_algorithm()                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. sync_generate_all_prompts() [async_to_sync]                │
│     ├─ Web search для логотипу (async)                          │
│     ├─ Пошук референсних фото (async, паралельно)               │
│     └─ Генерація промптів (async, паралельно)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ angle_prompts (з session_id + seeds)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. sync_generate_all_images() [async_to_sync]                 │
│     ├─ Переклад промптів (async)                                │
│     ├─ DALL-E / Pollinations (async, паралельно)                │
│     └─ Створення image objects                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ generated_images
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Django Response                                                │
│  {images: [...], session_id: "...", success: true}             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Використання

### Виклик з Django View

```python
# backend/apps/chat/views/image_generation_views.py

from apps.chat.utils.async_image_generation import (
    sync_generate_all_prompts,
    sync_generate_all_images
)

# 1. Паралельна генерація промптів з web search
angle_prompts = sync_generate_all_prompts(
    brand="Renault",
    model="Clio",
    year=2019,
    color="blue",
    body_type="hatchback",
    angles=["front", "side", "rear"]
)

# 2. Паралельна генерація зображень
generated_images = sync_generate_all_images(
    angle_prompts=angle_prompts,
    canonical_data=canonical_data,
    mock_cmd=mock_cmd,
    get_angle_title=get_angle_title
)
```

### Fallback Механізм

```python
try:
    # Спробувати асинхронну генерацію
    generated_images = sync_generate_all_images(...)
except Exception as e:
    # Fallback на послідовну генерацію
    generated_images = []
    for angle_data in angle_prompts:
        # Послідовна генерація (старий підхід)
        ...
```

---

## Приклад

### Запит

```bash
POST /api/chat/generate-car-images/
{
  "car_data": {
    "brand": "Renault",
    "model": "Clio",
    "year": 2019,
    "color": "blue",
    "body_type": "hatchback"
  },
  "angles": ["front", "side", "rear"],
  "use_mock_algorithm": true
}
```

### Відповідь

```json
{
  "success": true,
  "session_id": "CAR-3f8a9b2c",
  "images": [
    {
      "url": "https://image.pollinations.ai/prompt/...",
      "angle": "front",
      "seed": 123456,
      "session_id": "CAR-3f8a9b2c",
      "isMain": true,
      "prompt": "2019 Renault Clio hatchback, blue, front view. CONSISTENCY: Same vehicle, session CAR-3f8a9b2c..."
    },
    {
      "url": "https://image.pollinations.ai/prompt/...",
      "angle": "side",
      "seed": 654321,
      "session_id": "CAR-3f8a9b2c",
      "isMain": false,
      "prompt": "2019 Renault Clio hatchback, blue, side view. CONSISTENCY: Same vehicle, session CAR-3f8a9b2c..."
    },
    {
      "url": "https://image.pollinations.ai/prompt/...",
      "angle": "rear",
      "seed": 789012,
      "session_id": "CAR-3f8a9b2c",
      "isMain": false,
      "prompt": "2019 Renault Clio hatchback, blue, rear view. CONSISTENCY: Same vehicle, session CAR-3f8a9b2c..."
    }
  ],
  "total_generated": 3,
  "debug": {
    "requested_angles": ["front", "side", "rear"],
    "generated_count": 3
  }
}
```

### Лог Виконання

```
[AsyncGen] 🚀 Starting parallel prompt generation for 3 angles
[AsyncSearch] ✅ Logo info found for Renault
[AsyncSearch] ✅ Reference photo found for front
[AsyncSearch] ✅ Reference photo found for side
[AsyncSearch] ⚠️ No reference photo for rear
[AsyncGen] ✅ Generated 3 prompts in parallel
[AsyncGen] 🔗 All prompts share session_id for consistency

[AsyncImages] 🚀 Starting parallel image generation for 3 angles
[AsyncImage] 🔄 Generating image for angle: front
[AsyncImage] 🔄 Generating image for angle: side
[AsyncImage] 🔄 Generating image for angle: rear
[AsyncImage] ✅ Generated front with seed 123456
[AsyncImage] ✅ Generated side with seed 654321
[AsyncImage] ✅ Generated rear with seed 789012
[AsyncImages] ✅ Generated 3/3 images in parallel
```

---

## 🎯 Результат

### Консистентність ✅
- Всі зображення мають **один session_id**: `CAR-3f8a9b2c`
- Кожен ракурс має **унікальний seed** (123456, 654321, 789012)
- AI генерує **ОДНЕ авто** з різних кутів (завдяки consistency hints в промптах)

### Швидкість ⚡
- **Раніше**: 3 ракурси × 10 сек = 30 секунд
- **Тепер**: 3 ракурси паралельно = ~10 секунд
- **Прискорення**: **3x швидше**

### Надійність 🛡️
- Web search fallback на локальну базу
- DALL-E fallback на Pollinations
- Async fallback на sync генерацію

---

## 📚 Додаткові Ресурси

- [Django Async Views](https://docs.djangoproject.com/en/stable/topics/async/)
- [asgiref.sync](https://github.com/django/asgiref)
- [Pollinations.ai API](https://pollinations.ai/)
- [OpenAI DALL-E 3](https://platform.openai.com/docs/guides/images)

