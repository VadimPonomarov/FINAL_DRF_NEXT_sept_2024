@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   ШВИДКИЙ ТЕСТ ASYNC ГЕНЕРАЦІЇ
echo ========================================
echo.
echo Перевірка backend...
curl -s http://localhost:8000/health/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend не запущений!
    echo.
    echo Запустіть backend у іншому терміналі:
    echo   cd backend
    echo   venv\Scripts\activate
    echo   python manage.py runserver
    echo.
    pause
    exit /b 1
)

echo ✅ Backend запущений
echo.
echo Запуск тесту...
echo.
python quick_test.py
echo.
echo ========================================
echo Тест завершено!
echo ========================================
pause

