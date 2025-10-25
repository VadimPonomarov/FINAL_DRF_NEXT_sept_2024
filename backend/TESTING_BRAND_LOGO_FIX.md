# 🧪 Тестування Рішення Проблеми Неправильних Логотипів

## 📊 Мета Тестування

Перевірити, що після впровадження brand-agnostic підходу:
- ✅ На автомобілях НЕ з'являються неправильні логотипи
- ✅ Renault не має логотипу Toyota
- ✅ Рідкісні бренди (Atlas, Great Wall, Foton) НЕ мають логотипів популярних брендів
- ✅ Зображення відповідають візуальному стилю бренду (навіть без логотипу)

---

## 🔬 Тестові Кейси

### Група 1: Французькі Бренди (найпроблемніші)

**Кейс 1.1: Renault Clio**
```json
{
  "brand": "Renault",
  "model": "Clio",
  "year": 2019,
  "color": "blue",
  "body_type": "hatchback",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Toyota на решітці
- ✅ Зараз: Чиста решітка без логотипів, French modern design з C-shaped headlights

**Кейс 1.2: Peugeot 308**
```json
{
  "brand": "Peugeot",
  "model": "308",
  "year": 2020,
  "color": "black",
  "body_type": "sedan",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Honda або Hyundai
- ✅ Зараз: Чиста решітка, fang-shaped LED lights, French elegant sporty design

---

### Група 2: Китайські Бренди (дуже проблемні)

**Кейс 2.1: Great Wall Haval**
```json
{
  "brand": "Great Wall",
  "model": "H6",
  "year": 2021,
  "color": "white",
  "body_type": "suv",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Toyota або BMW
- ✅ Зараз: Чиста решітка, Chinese SUV-focused design, rugged SUV character

**Кейс 2.2: BYD Tang**
```json
{
  "brand": "BYD",
  "model": "Tang",
  "year": 2022,
  "color": "red",
  "body_type": "suv",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Hyundai або Kia
- ✅ Зараз: Smooth closed front panel (electric), full-width LED bar, modern electric design

---

### Група 3: Спецтехніка (критично проблемна)

**Кейс 3.1: Atlas Excavator**
```json
{
  "brand": "Atlas",
  "model": "160W",
  "year": 2020,
  "color": "yellow",
  "body_type": "excavator",
  "vehicle_type": "special"
}
```
**Очікування:**
- ❌ Раніше: Логотип Mercedes або Caterpillar
- ✅ Зараз: Чисте обладнання без логотипів, German construction precision, industrial yellow

**Кейс 3.2: Caterpillar 320**
```json
{
  "brand": "Caterpillar",
  "model": "320",
  "year": 2019,
  "color": "yellow",
  "body_type": "excavator",
  "vehicle_type": "special"
}
```
**Очікування:**
- ❌ Раніше: Правильний логотип CAT, але це може бути проблематично
- ✅ Зараз: Чисте обладнання, signature yellow industrial finish, NO CAT logo

---

### Група 4: Рідкісні/Екзотичні Бренди

**Кейс 4.1: Lada Vesta**
```json
{
  "brand": "Lada",
  "model": "Vesta",
  "year": 2020,
  "color": "silver",
  "body_type": "sedan",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Renault або Dacia
- ✅ Зараз: Чиста решітка, Russian practical rugged design

**Кейс 4.2: Dacia Duster**
```json
{
  "brand": "Dacia",
  "model": "Duster",
  "year": 2021,
  "color": "orange",
  "body_type": "suv",
  "vehicle_type": "car"
}
```
**Очікування:**
- ❌ Раніше: Логотип Renault
- ✅ Зараз: Чиста решітка, Y-shaped LED signature, Romanian value practical design

---

## 🚀 Як Запустити Тести

### Метод 1: Через API напряму

```bash
# Backend повинен бути запущений
cd backend
source venv/bin/activate  # або venv\Scripts\activate на Windows
python manage.py runserver

# В іншому терміналі:
curl -X POST http://localhost:8000/api/chat/generate-car-images/ \
  -H "Content-Type: application/json" \
  -d '{
    "car_data": {
      "brand": "Renault",
      "model": "Clio",
      "year": 2019,
      "color": "blue",
      "body_type": "hatchback",
      "vehicle_type_name": "car"
    },
    "angles": ["front", "side", "rear"],
    "style": "realistic"
  }'
```

### Метод 2: Через Frontend

1. Запустити frontend dev server:
```bash
cd frontend
npm run dev
```

2. Відкрити http://localhost:3000/autoria/ads/new

3. Заповнити форму з тестовими даними:
   - Бренд: Renault
   - Модель: Clio
   - Рік: 2019
   - Колір: Blue
   - Тип кузову: Hatchback

4. Натиснути "Генерувати зображення"

5. **Перевірити результат:**
   - ❌ Якщо бачите логотип Toyota - FAILED
   - ✅ Якщо бачите чисту решітку без логотипів - PASSED

### Метод 3: Django Management Command

```bash
cd backend
python manage.py shell

# В Python shell:
from apps.chat.views.image_generation_views import create_car_image_prompt

test_car_data = {
    "brand": "Renault",
    "model": "Clio",
    "year": 2019,
    "color": "blue",
    "body_type": "hatchback",
    "vehicle_type_name": "car"
}

prompt = create_car_image_prompt(test_car_data, "front", "realistic")
print("Generated Prompt:")
print(prompt)
print("\n=== Перевірка ===")
print("✅ PASSED" if "Renault" not in prompt else "❌ FAILED - Brand name found in prompt!")
print("✅ PASSED" if "NO logo" in prompt or "BLANK" in prompt else "⚠️ WARNING - No logo prevention found")
```

---

## 📋 Критерії Успіху

### ✅ PASSED - якщо:
1. **Промпт НЕ містить назву бренду** (напр. "Renault" відсутній в промпті)
2. **Промпт містить візуальні характеристики** (напр. "French modern design", "C-shaped LED")
3. **Промпт містить інструкції про відсутність логотипів** (напр. "NO logo", "BLANK grille")
4. **Згенероване зображення НЕ має неправильних логотипів**
5. **Згенероване зображення відповідає візуальному стилю бренду**

### ❌ FAILED - якщо:
1. Промпт містить назву бренду напряму
2. На зображенні з'являється неправильний логотип (Toyota на Renault)
3. Візуальний стиль не відповідає очікуваному (German style на French car)

### ⚠️ WARNING - якщо:
1. Промпт містить назву бренду, але зображення коректне
2. Зображення має логотип, але правильний (це OK для популярних брендів)

---

## 📊 Форма Звіту

### Тест Звіт: [Дата]

**Тестував:** [Ім'я]

| № | Бренд | Модель | Очікування | Результат | Статус | Коментар |
|---|-------|--------|------------|-----------|--------|----------|
| 1.1 | Renault | Clio | Без Toyota logo | ✅ Чиста решітка | ✅ PASSED | French design збережений |
| 1.2 | Peugeot | 308 | Без Honda logo | ✅ Чиста решітка | ✅ PASSED | Fang-shaped lights присутні |
| 2.1 | Great Wall | H6 | Без Toyota logo | ✅ Чиста решітка | ✅ PASSED | Chinese SUV design OK |
| 2.2 | BYD | Tang | Без Hyundai logo | ✅ Чиста решітка | ✅ PASSED | Electric design видно |
| 3.1 | Atlas | 160W | Без Mercedes logo | ❌ Caterpillar logo | ❌ FAILED | Потрібно покращення |
| 3.2 | Caterpillar | 320 | Без CAT logo | ✅ Чисте обладнання | ✅ PASSED | Industrial design OK |

**Загальний результат:** X/Y тестів пройшло (XX%)

**Рекомендації:**
- [ ] Покращити візуальні характеристики для спецтехніки
- [ ] Додати більше деталей для рідкісних брендів
- [ ] Протестувати на більшій вибірці зображень

---

## 🔄 Rollback Plan

Якщо нове рішення НЕ працює:

```python
# В backend/apps/chat/views/image_generation_views.py
# Закоментувати рядки 593-616 (новий brand-agnostic підхід)
# Розкоментувати рядки 618-993 (legacy fallback код)

# АБО встановити feature flag:
USE_BRAND_AGNOSTIC_PROMPTS = False  # змінити на False для rollback
```

---

## 📞 Support

Якщо тести не проходять, перевірте:

1. **Чи встановлений модуль brand_visual_mapping?**
```bash
ls backend/apps/chat/utils/brand_visual_mapping.py
```

2. **Чи є помилки в логах?**
```bash
# Дивитись логи backend
python manage.py runserver
# Шукати "[ImageGen] ⚠️ Brand-agnostic approach failed"
```

3. **Чи правильно працює g4f?**
```bash
python -c "from g4f import Client; print('g4f OK')"
```

---

## ✅ Фінальна Валідація

Після успішного проходження всіх тестів:

1. ✅ Renault НЕ має логотипу Toyota
2. ✅ Great Wall НЕ має логотипу BMW
3. ✅ Atlas НЕ має логотипу Mercedes/Caterpillar
4. ✅ Візуальний стиль відповідає бренду
5. ✅ Зображення виглядають реалістично
6. ✅ Промпти НЕ містять назв брендів
7. ✅ Fallback працює при помилках

**Дата останнього тесту:** [Заповнити після тестування]
**Статус:** [PASSED / FAILED / IN PROGRESS]

