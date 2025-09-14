#!/usr/bin/env python3
"""
Скрипт для запуска полных тестов с 184 эндпоинтами
"""

import subprocess
import json
import sys
from pathlib import Path

def run_full_tests():
    """Запускает полные тесты с Newman"""
    print("🧪 Запуск полных тестов с 184 эндпоинтами")
    print("=" * 50)
    
    collection_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_FULL_SWAGGER.postman_collection.json"
    environment_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS.postman_environment.json"
    
    if not collection_file.exists():
        print(f"❌ Файл коллекции не найден: {collection_file}")
        return False
    
    if not environment_file.exists():
        print(f"❌ Файл окружения не найден: {environment_file}")
        return False
    
    print(f"📁 Коллекция: {collection_file.name}")
    print(f"🌍 Окружение: {environment_file.name}")
    
    # Команда Newman
    cmd = [
        'newman', 'run', str(collection_file),
        '-e', str(environment_file),
        '--delay-request', '500',  # Уменьшаем задержку
        '--timeout-request', '10000',
        '--reporters', 'cli,json',
        '--reporter-json-export', 'full_test_results.json',
        '--bail'  # Останавливаемся при первой критической ошибке
    ]
    
    try:
        print("🚀 Запускаем Newman...")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=collection_file.parent)
        
        print("📊 Результаты тестов:")
        print(result.stdout)
        
        if result.stderr:
            print("⚠️ Предупреждения:")
            print(result.stderr)
        
        # Анализируем результаты
        analyze_results()
        
        return result.returncode == 0
        
    except FileNotFoundError:
        print("❌ Newman не найден. Установите Newman:")
        print("   npm install -g newman")
        return False
    except Exception as e:
        print(f"❌ Ошибка запуска Newman: {e}")
        return False

def analyze_results():
    """Анализирует результаты тестов"""
    results_file = Path(__file__).parent.parent / "full_test_results.json"
    
    if not results_file.exists():
        print("❌ Файл результатов не найден")
        return
    
    try:
        with open(results_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        run_stats = results.get('run', {}).get('stats', {})
        
        print("\n📈 ДЕТАЛЬНАЯ СТАТИСТИКА:")
        print(f"  📊 Всего запросов: {run_stats.get('requests', {}).get('total', 0)}")
        print(f"  ✅ Успешных запросов: {run_stats.get('requests', {}).get('total', 0) - run_stats.get('requests', {}).get('failed', 0)}")
        print(f"  ❌ Неудачных запросов: {run_stats.get('requests', {}).get('failed', 0)}")
        
        print(f"  🧪 Всего тестов: {run_stats.get('assertions', {}).get('total', 0)}")
        print(f"  ✅ Прошедших тестов: {run_stats.get('assertions', {}).get('total', 0) - run_stats.get('assertions', {}).get('failed', 0)}")
        print(f"  ❌ Неудачных тестов: {run_stats.get('assertions', {}).get('failed', 0)}")
        
        # Показываем неудачные тесты
        failures = results.get('run', {}).get('failures', [])
        if failures:
            print(f"\n❌ НЕУДАЧНЫЕ ТЕСТЫ ({len(failures)}):")
            
            # Группируем ошибки по типам
            error_types = {}
            for failure in failures:
                error = failure.get('error', {})
                error_name = error.get('name', 'Unknown error')
                
                if error_name not in error_types:
                    error_types[error_name] = []
                error_types[error_name].append(failure)
            
            # Показываем по типам
            for error_type, type_failures in error_types.items():
                print(f"\n  🔴 {error_type} ({len(type_failures)} случаев):")
                for i, failure in enumerate(type_failures[:5], 1):  # Показываем первые 5
                    source = failure.get('source', {})
                    request_name = source.get('name', 'Unknown request')
                    print(f"    {i}. {request_name}")
                
                if len(type_failures) > 5:
                    print(f"    ... и еще {len(type_failures) - 5} случаев")
        else:
            print("\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        
        # Показываем HTTP ошибки
        executions = results.get('run', {}).get('executions', [])
        http_errors = {}
        
        for execution in executions:
            response = execution.get('response', {})
            code = response.get('code')
            
            if code and code >= 400:
                if code not in http_errors:
                    http_errors[code] = []
                
                request = execution.get('item', {})
                request_name = request.get('name', 'Unknown')
                http_errors[code].append(request_name)
        
        if http_errors:
            print(f"\n🚨 HTTP ОШИБКИ:")
            for code, requests in http_errors.items():
                print(f"  {code}: {len(requests)} запросов")
                for req in requests[:3]:  # Показываем первые 3
                    print(f"    - {req}")
                if len(requests) > 3:
                    print(f"    ... и еще {len(requests) - 3}")
        
    except Exception as e:
        print(f"❌ Ошибка анализа результатов: {e}")

def main():
    """Основная функция"""
    success = run_full_tests()
    
    if success:
        print("\n🎉 Тестирование завершено успешно!")
    else:
        print("\n⚠️ Тестирование завершено с ошибками")
        print("📋 Следующие шаги:")
        print("1. Проанализируйте ошибки выше")
        print("2. Исправьте проблемы в коде API")
        print("3. Запустите тесты снова")

if __name__ == "__main__":
    main()
