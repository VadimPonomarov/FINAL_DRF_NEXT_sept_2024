#!/usr/bin/env python3
"""
Скрипт для запуска Postman тестов с динамическими ID через Newman
"""

import subprocess
import json
import sys
from pathlib import Path

def check_newman_installed():
    """Проверяет, установлен ли Newman"""
    try:
        result = subprocess.run(['newman', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Newman установлен: {result.stdout.strip()}")
            return True
        else:
            print("❌ Newman не найден")
            return False
    except FileNotFoundError:
        print("❌ Newman не установлен")
        return False

def install_newman():
    """Устанавливает Newman через npm"""
    print("📦 Устанавливаем Newman...")
    try:
        result = subprocess.run(['npm', 'install', '-g', 'newman'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Newman успешно установлен")
            return True
        else:
            print(f"❌ Ошибка установки Newman: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ npm не найден. Установите Node.js сначала")
        return False

def run_setup_tests():
    """Запускает Setup тесты для получения ID"""
    print("🔧 Запускаем Setup тесты для получения ID...")
    
    collection_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS_FIXED.postman_collection.json"
    environment_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS.postman_environment.json"
    
    if not collection_file.exists():
        print(f"❌ Файл коллекции не найден: {collection_file}")
        return False
    
    if not environment_file.exists():
        print(f"❌ Файл окружения не найден: {environment_file}")
        return False
    
    # Запускаем только Setup папку
    cmd = [
        'newman', 'run', str(collection_file),
        '-e', str(environment_file),
        '--folder', '🔧 Setup - Get All IDs (Run First!)',
        '--delay-request', '1000',
        '--timeout-request', '10000',
        '--reporters', 'cli,json',
        '--reporter-json-export', 'setup_results.json'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=collection_file.parent)
        
        if result.returncode == 0:
            print("✅ Setup тесты выполнены успешно")
            print(result.stdout)
            return True
        else:
            print("❌ Ошибка в Setup тестах:")
            print(result.stderr)
            print(result.stdout)
            return False
            
    except Exception as e:
        print(f"❌ Ошибка запуска Newman: {e}")
        return False

def run_all_tests():
    """Запускает все тесты"""
    print("🚀 Запускаем все тесты...")
    
    collection_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS_FIXED.postman_collection.json"
    environment_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS.postman_environment.json"
    
    cmd = [
        'newman', 'run', str(collection_file),
        '-e', str(environment_file),
        '--delay-request', '1000',
        '--timeout-request', '10000',
        '--reporters', 'cli,json,htmlextra',
        '--reporter-json-export', 'dynamic_test_results.json',
        '--reporter-htmlextra-export', 'dynamic_test_results.html'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=collection_file.parent)
        
        print("📊 Результаты тестов:")
        print(result.stdout)
        
        if result.returncode == 0:
            print("✅ Все тесты выполнены")
        else:
            print("⚠️ Некоторые тесты не прошли")
            print(result.stderr)
        
        # Анализируем результаты
        analyze_results()
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Ошибка запуска Newman: {e}")
        return False

def analyze_results():
    """Анализирует результаты тестов"""
    results_file = Path(__file__).parent.parent / "dynamic_test_results.json"
    
    if not results_file.exists():
        print("❌ Файл результатов не найден")
        return
    
    try:
        with open(results_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        run_stats = results.get('run', {}).get('stats', {})
        
        print("\n📈 СТАТИСТИКА ТЕСТОВ:")
        print(f"  Всего запросов: {run_stats.get('requests', {}).get('total', 0)}")
        print(f"  Успешных запросов: {run_stats.get('requests', {}).get('pending', 0)}")
        print(f"  Неудачных запросов: {run_stats.get('requests', {}).get('failed', 0)}")
        
        print(f"  Всего тестов: {run_stats.get('assertions', {}).get('total', 0)}")
        print(f"  Прошедших тестов: {run_stats.get('assertions', {}).get('pending', 0)}")
        print(f"  Неудачных тестов: {run_stats.get('assertions', {}).get('failed', 0)}")
        
        # Показываем неудачные тесты
        failures = results.get('run', {}).get('failures', [])
        if failures:
            print(f"\n❌ НЕУДАЧНЫЕ ТЕСТЫ ({len(failures)}):")
            for i, failure in enumerate(failures[:10], 1):  # Показываем первые 10
                error = failure.get('error', {})
                print(f"  {i}. {error.get('name', 'Unknown error')}")
                print(f"     {error.get('message', 'No message')}")
        else:
            print("\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        
        # Сравнение с предыдущими результатами
        old_results_file = Path(__file__).parent.parent / "AutoRia API - Complete 184 Endpoints (Fixed for 100%).postman_test_run.json"
        if old_results_file.exists():
            with open(old_results_file, 'r', encoding='utf-8') as f:
                old_results = json.load(f)
            
            old_pass = old_results.get('totalPass', 0)
            old_fail = old_results.get('totalFail', 0)
            
            new_pass = run_stats.get('assertions', {}).get('pending', 0)
            new_fail = run_stats.get('assertions', {}).get('failed', 0)
            
            print(f"\n📊 СРАВНЕНИЕ С ПРЕДЫДУЩИМИ РЕЗУЛЬТАТАМИ:")
            print(f"  Было: {old_pass} успешных, {old_fail} неудачных")
            print(f"  Стало: {new_pass} успешных, {new_fail} неудачных")
            print(f"  Улучшение: {new_pass - old_pass:+d} успешных, {new_fail - old_fail:+d} неудачных")
        
    except Exception as e:
        print(f"❌ Ошибка анализа результатов: {e}")

def main():
    """Основная функция"""
    print("🧪 Запуск Postman тестов с динамическими ID")
    print("=" * 50)
    
    # Проверяем Newman
    if not check_newman_installed():
        if not install_newman():
            print("❌ Не удалось установить Newman. Установите вручную:")
            print("   npm install -g newman")
            print("   npm install -g newman-reporter-htmlextra")
            sys.exit(1)
    
    # Проверяем, что сервер запущен
    print("🔍 Проверяем, что сервер запущен...")
    try:
        import requests
        response = requests.get('http://localhost:8000/health/', timeout=5)
        if response.status_code == 200:
            print("✅ Сервер запущен")
        else:
            print(f"⚠️ Сервер отвечает с кодом {response.status_code}")
    except Exception as e:
        print(f"❌ Сервер не отвечает: {e}")
        print("   Запустите сервер: python manage.py runserver")
        sys.exit(1)
    
    # Запускаем Setup тесты
    if not run_setup_tests():
        print("❌ Setup тесты не прошли. Проверьте сервер и данные.")
        sys.exit(1)
    
    # Запускаем все тесты
    success = run_all_tests()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Тестирование завершено успешно!")
    else:
        print("⚠️ Тестирование завершено с ошибками")
    
    print("📄 Отчеты сохранены:")
    print("  - dynamic_test_results.json (JSON)")
    print("  - dynamic_test_results.html (HTML)")

if __name__ == "__main__":
    main()
