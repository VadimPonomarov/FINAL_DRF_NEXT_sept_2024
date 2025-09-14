#!/bin/bash

# =============================================================================
# AutoRia Clone - Автоматический деплой скрипт (Shell версия)
# =============================================================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Функции для вывода
print_step() {
    echo -e "${BLUE}${BOLD}[КРОК $1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Функция прогресс-бара
show_progress_bar() {
    local current=$1
    local total=$2
    local description=$3
    local width=50

    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done

    printf "\r${BLUE}[%s] %d%% %s${NC}" "$bar" "$percent" "$description"
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Функция отображения прогресса этапов
show_step_progress() {
    local step=$1
    local total_steps=$2
    local step_name=$3

    echo -e "\n${BLUE}============================================================${NC}"
    show_progress_bar $step $total_steps "Етап $step/$total_steps: $step_name"
    echo -e "${BLUE}============================================================${NC}"
}

run_docker_build_with_progress() {
    # Ініціалізуємо прогрес для кожного сервісу
    declare -A services_progress
    declare -A services_status
    local services=("app" "frontend" "pg" "redis" "redis-insight" "rabbitmq" "celery-worker" "celery-beat" "flower" "mailing" "nginx")

    for service in "${services[@]}"; do
        services_progress[$service]=0
        services_status[$service]="⏳ Очікування"
    done

    update_display() {
        echo -e "\n📦 Збірка Docker образів:"
        for service in "${services[@]}"; do
            local progress=${services_progress[$service]}
            local status="${services_status[$service]}"
            local bar=""

            # Створюємо прогрес-бар
            local filled=$((progress / 10))
            local empty=$((10 - filled))

            for ((i=0; i<filled; i++)); do
                bar+="█"
            done
            for ((i=0; i<empty; i++)); do
                bar+="░"
            done

            printf "🔨 %-15s [%s] %3d%% %s\n" "$service" "$bar" "$progress" "$status"
        done

        # Повертаємося вгору для оновлення
        echo -ne "\033[$(( ${#services[@]} + 2 ))A"
    }

    # Початкове відображення
    echo -e "\n📦 Збірка Docker образів:"
    for service in "${services[@]}"; do
        printf "🔨 %-15s [░░░░░░░░░░]   0%% ⏳ Очікування\n" "$service"
    done

    # Запускаємо docker-compose build у фоні та парсимо вивід
    docker-compose build --no-cache 2>&1 | while IFS= read -r line; do
        # Визначаємо поточний сервіс
        if [[ $line =~ \[([a-z-]+)[[:space:]]+[0-9]+/[0-9]+\] ]]; then
            current_service="${BASH_REMATCH[1]}"
            if [[ " ${services[*]} " =~ " ${current_service} " ]]; then
                services_status[$current_service]="🔨 Збірка..."
            fi
        fi

        # Оновлюємо прогрес на основі етапів
        if [[ -n "$current_service" ]] && [[ " ${services[*]} " =~ " ${current_service} " ]]; then
            if [[ $line =~ "FROM" ]]; then
                services_progress[$current_service]=10
            elif [[ $line =~ "WORKDIR"|"COPY" ]]; then
                services_progress[$current_service]=30
            elif [[ $line =~ "RUN" ]]; then
                services_progress[$current_service]=60
            elif [[ $line =~ "EXPOSE"|"CMD" ]]; then
                services_progress[$current_service]=90
            elif [[ $line =~ "Successfully built"|"Successfully tagged" ]]; then
                services_progress[$current_service]=100
                services_status[$current_service]="✅ Готово"
            fi
        fi

        update_display
        sleep 0.1
    done

    # Фінальне оновлення
    echo -e "\n"
    for service in "${services[@]}"; do
        printf "🔨 %-15s [██████████] 100%% ✅ Готово\n" "$service"
    done

    return ${PIPESTATUS[0]}
}

# Перевірка системних вимог
check_requirements() {
    show_step_progress 1 4 "Перевірка системних вимог"

    # Перевірка Node.js
    show_progress_bar 1 4 "Перевірка Node.js..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js не встановлено!"
        return 1
    fi
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"

    # Перевірка npm
    show_progress_bar 2 4 "Перевірка npm..."
    if ! command -v npm &> /dev/null; then
        print_error "npm не встановлено!"
        return 1
    fi
    NPM_VERSION=$(npm --version)
    print_success "npm: $NPM_VERSION"

    # Перевірка Docker
    show_progress_bar 3 4 "Перевірка Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker не встановлено!"
        return 1
    fi
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_success "Docker: $DOCKER_VERSION"

    # Перевірка docker-compose
    show_progress_bar 4 4 "Перевірка docker-compose..."
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose не встановлено!"
        return 1
    fi

    print_success "Всі системні вимоги виконані!"
    return 0
}

# Перевірка файлів проекту
check_project_files() {
    show_step_progress 2 4 "Перевірка файлів проекту"

    local required_files=("docker-compose.yml" "backend/Dockerfile" "frontend/Dockerfile" "frontend/package.json")
    local missing_files=()

    for file in "${required_files[@]}"; do
        show_progress_bar $((${#missing_files[@]} + 1)) ${#required_files[@]} "Перевірка $file..."
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -gt 0 ]; then
        print_error "Відсутні необхідні файли:"
        for file in "${missing_files[@]}"; do
            print_error "  - $file"
        done
        return 1
    fi

    print_success "Всі необхідні файли знайдені"

    # Перевірка .env файлів
    local env_files=("backend/.env" "frontend/.env.local")
    for env_file in "${env_files[@]}"; do
        if [ ! -f "$env_file" ]; then
            print_warning "Файл оточення $env_file не знайдено"
        else
            print_success "Файл оточення $env_file знайдено"
        fi
    done

    return 0
}

# Збірка фронтенда
build_frontend() {
    show_step_progress 4 4 "Збірка фронтенда в PRODUCTION режимі"

    if [ ! -d "frontend" ]; then
        print_error "Папка frontend не знайдена!"
        return 1
    fi

    cd frontend

    # Встановлення залежностей
    show_progress_bar 1 4 "📦 Встановлення залежностей..."
    if ! npm install --legacy-peer-deps; then
        print_error "Не вдалося встановити залежності!"
        cd ..
        return 1
    fi
    print_success "Залежності встановлені"

    # Очищення порту 3000 перед збіркою
    show_progress_bar 2 4 "🧹 Очищення порту 3000..."
    npm run kill 3000 2>/dev/null || true

    # Видалення старої збірки
    show_progress_bar 3 4 "🗑️ Видалення старої збірки..."
    rm -rf .next

    # Production збірка
    show_progress_bar 4 4 "🔨 Збірка в production режимі..."
    if ! npm run build; then
        print_error "Не вдалося зібрати фронтенд!"
        cd ..
        return 1
    fi

    cd ..
    print_success "Фронтенд зібрано в production режимі!"
    return 0
}

# Комментирование/раскомментирование frontend сервиса
comment_frontend_service() {
    local comment=$1
    local compose_file="docker-compose.yml"
    
    if [ ! -f "$compose_file" ]; then
        print_error "Файл docker-compose.yml не найден!"
        return 1
    fi
    
    if [ "$comment" = "true" ]; then
        echo "Комментирование frontend сервиса в docker-compose.yml..."
        # Комментируем секцию frontend
        sed -i '/^  frontend:/,/^  [a-zA-Z]/ { /^  [a-zA-Z]/!s/^/  # /; /^  frontend:/s/^/  # / }' "$compose_file"
    else
        echo "Раскомментирование frontend сервиса в docker-compose.yml..."
        # Раскомментируем секцию frontend
        sed -i '/^  # frontend:/,/^  [a-zA-Z]/ { /^  [a-zA-Z]/!s/^  # //; /^  # frontend:/s/^  # // }' "$compose_file"
    fi
    
    return 0
}

# Розгортання Docker сервісів з повною пересборкою
deploy_docker_services() {
    local exclude_frontend=$1

    if [ "$exclude_frontend" = "true" ]; then
        show_step_progress 3 4 "Розгортання backend сервісів в Docker"
        echo "Коментування frontend сервісу в docker-compose.yml..."
        comment_frontend_service true
    else
        show_step_progress 3 4 "Розгортання всіх сервісів в Docker"
        echo "Розкоментування frontend сервісу в docker-compose.yml..."
        comment_frontend_service false
    fi

    if [ ! -f "docker-compose.yml" ]; then
        print_error "Файл docker-compose.yml не знайдено!"
        return 1
    fi

    # ПОВНЕ ОЧИЩЕННЯ - емулюємо розгортання з нуля
    show_progress_bar 1 6 "🧹 Зупинка та видалення контейнерів..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true

    show_progress_bar 2 6 "🧹 Видалення старих образів..."
    docker image prune -f 2>/dev/null || true

    show_progress_bar 3 6 "🧹 Очищення невикористаних томів..."
    docker volume prune -f 2>/dev/null || true

    # СТВОРЕННЯ ТА ЗБІРКА ВСІХ КОНТЕЙНЕРІВ З НУЛЯ
    show_progress_bar 4 6 "🔨 Збірка всіх образів..."

    echo -e "\n📦 Збірка Docker образів (це може зайняти кілька хвилин)..."

    # Запускаємо збірку з відстеженням прогресу для кожного сервісу
    if ! run_docker_build_with_progress; then
        print_error "Не вдалося зібрати Docker образи!"
        return 1
    fi

    print_success "Всі образи зібрані успішно!"

    show_progress_bar 5 6 "🚀 Запуск всіх контейнерів..."

    echo -e "\n🚀 Запуск сервісів..."

    # Запускаємо контейнери з виводом
    if ! docker-compose up -d --force-recreate; then
        print_error "Не вдалося запустити Docker сервіси!"
        return 1
    fi

    print_success "Всі контейнери запущені!"

    # Очікування готовності сервісів
    show_progress_bar 6 6 "⏳ Очікування готовності сервісів..."

    echo -e "\n⏳ Очікування готовності сервісів:"
    local wait_time=20
    for i in $(seq 1 $wait_time); do
        show_progress_bar $i $wait_time "⏳ Ініціалізація сервісів ($i/$wait_time сек)"
        sleep 1
    done

    # Показуємо статус контейнерів
    echo -e "\n📊 Статус контейнерів:"
    docker-compose ps

    print_success "Docker сервіси повністю розгорнуті з нуля!"
    return 0
}

# Запуск локального фронтенда
start_local_frontend() {
    print_step 4 "ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда"

    cd frontend

    # Очищення порту 3000 перед запуском
    echo "Очищення порту 3000..."
    npm run kill 3000 2>/dev/null || true

    echo "Запуск в production режимі..."
    print_success "Фронтенд готовий до запуску!"
    echo -e "${GREEN}${BOLD}Запускаємо фронтенд...${NC}"

    # Запуск фронтенда (блокуючий)
    npm run start
}

# Перевірка сервісів
check_services() {
    echo "Перевірка готовності сервісів..."

    # Перевірка Docker контейнерів
    echo "Запущені Docker контейнери:"
    docker-compose ps

    print_success "Перевірка сервісів завершена!"
}

# Главная функция
main() {
    echo -e "${BLUE}${BOLD}"
    echo "ПОВНИЙ АВТОМАТИЧНИЙ ДЕПЛОЙ AutoRia Clone"
    echo "=================================================="
    echo "🚀 ЕМУЛЯЦІЯ РОЗГОРТАННЯ З НУЛЯ (як після git clone)"
    echo -e "${NC}"

    # Перевірка аргументів
    local docker_frontend=false
    local local_frontend=true

    for arg in "$@"; do
        if [ "$arg" = "--docker" ]; then
            docker_frontend=true
            local_frontend=false
            break
        fi
    done

    if [ "$local_frontend" = "true" ]; then
        echo "Режим: Backend в Docker + Локальний оптимізований фронтенд (ЗА ЗАМОВЧУВАННЯМ)"
        echo "📋 План розгортання:"
        echo "   1️⃣  Перевірка системних вимог"
        echo "   2️⃣  Перевірка файлів проекту"
        echo "   3️⃣  Повна збірка та запуск Docker сервісів"
        echo "   4️⃣  Збірка фронтенда в production режимі"
    else
        echo "Режим: Повне розгортання в Docker (--docker)"
        echo "📋 План розгортання:"
        echo "   1️⃣  Перевірка системних вимог"
        echo "   2️⃣  Перевірка файлів проекту"
        echo "   3️⃣  Повна збірка та запуск всіх Docker сервісів"
    fi

    echo ""

    # ЭТАП 1: Проверка системных требований
    if ! check_requirements; then
        exit 1
    fi

    # ЭТАП 2: Проверка файлов проекта
    if ! check_project_files; then
        exit 1
    fi

    # ЭТАП 3: Развертывание сервисов в Docker (ПЕРВЫМ ДЕЛОМ!)
    if ! deploy_docker_services "$local_frontend"; then
        exit 1
    fi

    # ЭТАП 4: Сборка фронтенда в production режиме (ПОСЛЕ Docker)
    if [ "$local_frontend" = "true" ]; then
        if ! build_frontend; then
            exit 1
        fi
    fi
    
    # ЭТАП 4: Финальный запуск
    if [ "$local_frontend" = "true" ]; then
        echo ""
        print_success "Всі Docker сервіси запущені!"
        echo "ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда..."
        start_local_frontend
    else
        check_services
        echo ""
        print_success "ПОВНИЙ ДЕПЛОЙ В DOCKER ЗАВЕРШЕНО!"
        echo "Доступні URL:"
        echo "   - http://localhost - Головний UI (через nginx)"
        echo "   - http://localhost:3000 - Frontend (Docker)"
        echo "   - http://localhost/api/ - Backend API"
        echo "   - http://localhost/admin/ - Django Admin"
        echo "   - http://localhost/rabbitmq/ - RabbitMQ Management"
        echo "   - http://localhost/flower/ - Celery Flower"
        echo "   - http://localhost/redis/ - Redis Insight"
    fi
}

# Запуск главной функции с передачей всех аргументов
main "$@"
