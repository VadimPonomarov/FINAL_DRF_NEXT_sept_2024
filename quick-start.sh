#!/bin/bash
# =============================================================================
# QUICK START - ЗАПУСК ПРОЕКТА ОДНОЙ КОМАНДОЙ (Linux/Mac)
# =============================================================================
# Этот скрипт автоматически запускает весь проект
# Используется для учебного проекта - все конфигурации предустановлены
# =============================================================================

set -e

echo ""
echo "========================================"
echo "  AUTO RIA - QUICK START"
echo "========================================"
echo ""

# Проверка Docker
echo "[1/3] Проверка Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo ""
    echo "Пожалуйста, установите Docker:"
    echo "https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo "✅ Docker установлен"

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi
echo "✅ Docker Compose установлен"

echo ""
echo "[2/3] Запуск backend сервисов (Docker)..."
echo ""
docker-compose up -d

echo ""
echo "✅ Backend сервисы запущены!"
echo ""
echo "[3/3] Ожидание инициализации БД (30 сек)..."
sleep 30

echo ""
echo "========================================"
echo "  ✅ ПРОЕКТ ЗАПУЩЕН!"
echo "========================================"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/swagger/"
echo "🔴 Redis: localhost:6379"
echo "🐘 PostgreSQL: localhost:5432"
echo ""
echo "🎓 ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ:"
echo "   Email: admin@autoria.com"
echo "   Password: 12345678"
echo "   Role: Superuser"
echo ""
echo "   Email: seller1@gmail.com"
echo "   Password: 12345678"
echo "   Role: Seller"
echo ""
echo "========================================"
echo ""

# Запуск frontend (если Node.js установлен)
if command -v node &> /dev/null; then
    echo "[Дополнительно] Запуск frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Установка зависимостей..."
        npm install
    fi
    echo ""
    echo "Запуск Next.js dev server..."
    npm run dev &
    cd ..
else
    echo ""
    echo "⚠️  Node.js не установлен - frontend не запущен автоматически"
    echo ""
    echo "Для запуска frontend вручную:"
    echo "  1. Установите Node.js: https://nodejs.org/"
    echo "  2. cd frontend"
    echo "  3. npm install"
    echo "  4. npm run dev"
    echo ""
fi

echo ""
echo "Логи Docker контейнеров:"
docker-compose logs -f

