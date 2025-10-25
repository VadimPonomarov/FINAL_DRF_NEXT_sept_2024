@echo off
REM =============================================================================
REM QUICK START - ЗАПУСК ПРОЕКТА ОДНОЙ КОМАНДОЙ (Windows)
REM =============================================================================
REM Этот скрипт автоматически запускает весь проект
REM Используется для учебного проекта - все конфигурации предустановлены
REM =============================================================================

echo.
echo ========================================
echo   AUTO RIA - QUICK START
echo ========================================
echo.

REM Проверка Docker
echo [1/3] Проверка Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен!
    echo.
    echo Пожалуйста, установите Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo ✅ Docker установлен

REM Проверка Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не установлен!
    pause
    exit /b 1
)
echo ✅ Docker Compose установлен

echo.
echo [2/3] Запуск backend сервисов (Docker)...
echo.
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Ошибка запуска Docker Compose
    pause
    exit /b 1
)

echo.
echo ✅ Backend сервисы запущены!
echo.
echo [3/3] Ожидание инициализации БД (30 сек)...
timeout /t 30 /nobreak >nul

echo.
echo ========================================
echo   ✅ ПРОЕКТ ЗАПУЩЕН!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/swagger/
echo 🔴 Redis: localhost:6379
echo 🐘 PostgreSQL: localhost:5432
echo.
echo 🎓 ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ:
echo    Email: admin@autoria.com
echo    Password: 12345678
echo    Role: Superuser
echo.
echo    Email: seller1@gmail.com  
echo    Password: 12345678
echo    Role: Seller
echo.
echo ========================================
echo   Для остановки нажмите Ctrl+C
echo ========================================
echo.

REM Запуск frontend (если Node.js установлен)
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [Дополнительно] Запуск frontend...
    cd frontend
    if not exist "node_modules" (
        echo Установка зависимостей...
        call npm install
    )
    echo.
    echo Запуск Next.js dev server...
    start cmd /k "npm run dev"
    cd ..
) else (
    echo.
    echo ⚠️  Node.js не установлен - frontend не запущен автоматически
    echo.
    echo Для запуска frontend вручную:
    echo   1. Установите Node.js: https://nodejs.org/
    echo   2. cd frontend
    echo   3. npm install
    echo   4. npm run dev
    echo.
)

echo.
echo Логи Docker контейнеров:
docker-compose logs -f

pause

