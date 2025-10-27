# 🔧 Текущие проблемы и решения

## Дата: 27 октября 2025

### 1. ❌ Backend (Swagger) не загружается

**Проблема:** Internal Server Error при обращении к `/api/doc/?format=openapi`

**Статус:** Backend перезапускается

**Решение:**
```bash
# 1. Проверить статус
docker-compose ps app

# 2. Если не запущен или unhealthy, перезапустить
docker-compose restart app

# 3. Проверить логи
docker-compose logs app --tail=100

# 4. Если ошибки persist, полный перезапуск
docker-compose down
docker-compose up -d
```

**После перезапуска подождите 1-2 минуты** пока backend полностью запустится и станет healthy.

### 2. ❌ Git Push blocked by GitHub Secret Scanning

**Проблема:** GitHub блокирует push из-за обнаруженных секретов в старом коммите `74656fc`

**Файл:** `OAUTH_RESTART_INSTRUCTIONS.md` (уже удален в новых коммитах)

**Решение A (Рекомендуется для учебного проекта):**

Разрешить секреты через GitHub:
1. Перейти по ссылке из ошибки:
   - https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024/security/secret-scanning/unblock-secret/34fKuvEORCAm9MZgMRRazWVWBw4
   - https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024/security/secret-scanning/unblock-secret/34fKutnJoaXpYn3KiO8uXW1ogsi

2. Нажать "Allow this secret"

3. Повторить git push:
```bash
git push origin master
```

**Решение B (Очистка истории):**

⚠️ Использовать только если Решение A не подходит

```bash
# 1. Сделать backup
git branch backup-before-filter

# 2. Использовать git-filter-repo (рекомендуется вместо filter-branch)
git-filter-repo --path OAUTH_RESTART_INSTRUCTIONS.md --invert-paths

# 3. Force push
git push origin master --force
```

**Решение C (Новая ветка):**

```bash
# 1. Создать новую ветку от текущего состояния
git checkout -b clean-master

# 2. Запушить новую ветку
git push origin clean-master

# 3. На GitHub сделать PR и merge в master
# 4. Локально переключиться на master и pull
git checkout master
git pull origin master
```

## ✅ Текущее состояние кода

Все функциональные изменения закоммичены:
- ✅ Модерация - исправлена смена статусов для суперюзера
- ✅ UI - компактные кнопки
- ✅ UI - селекторы статусов с иконкой шестеренки
- ✅ Backend - суперюзер может менять статус на любой
- ✅ Frontend - добавлен статус SOLD
- ✅ Deployment checklist - создан
- ✅ OAuth guide - создан без секретов

## 📝 Что нужно сделать

1. **Дождаться запуска backend** (1-2 минуты)
2. **Проверить Swagger**: http://localhost:8000/swagger/
3. **Решить проблему с git push** (использовать Решение A)
4. **Запушить все изменения**

## 🚀 После решения проблем

```bash
# Проверить что все работает
docker-compose ps

# Проверить git статус  
git status

# Проверить что удаленный репозиторий синхронизирован
git log --oneline origin/master..HEAD
```

---

**Примечание:** Это учебный проект, поэтому разрешение секретов через GitHub (Решение A) - наиболее простой и быстрый способ.

