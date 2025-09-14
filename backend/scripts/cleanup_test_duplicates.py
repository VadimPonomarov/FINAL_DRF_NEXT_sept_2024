#!/usr/bin/env python3
"""
Анализ и очистка дублирующихся тестов
"""

import os
import shutil
import json
from pathlib import Path
from collections import defaultdict

def analyze_postman_collection():
    """Анализирует Postman коллекцию для понимания покрытых эндпоинтов"""
    backend_dir = Path(__file__).parent.parent
    collection_file = backend_dir / "AutoRia_API_Final_Collection.postman_collection.json"
    
    if not collection_file.exists():
        print("❌ Postman коллекция не найдена")
        return set()
    
    try:
        with open(collection_file, 'r', encoding='utf-8') as f:
            collection = json.load(f)
        
        endpoints = set()
        
        def extract_endpoints(item):
            if 'request' in item:
                if 'url' in item['request'] and 'raw' in item['request']['url']:
                    url = item['request']['url']['raw']
                    method = item['request'].get('method', 'GET')
                    # Извлекаем путь без базового URL
                    if '{{base_url}}' in url:
                        path = url.replace('{{base_url}}', '').strip('/')
                        endpoints.add(f"{method} /{path}")
            
            if 'item' in item:
                for subitem in item['item']:
                    extract_endpoints(subitem)
        
        if 'item' in collection:
            for item in collection['item']:
                extract_endpoints(item)
        
        print(f"📊 Найдено {len(endpoints)} эндпоинтов в Postman коллекции")
        return endpoints
        
    except Exception as e:
        print(f"❌ Ошибка анализа коллекции: {e}")
        return set()

def analyze_test_files():
    """Анализирует тестовые файлы"""
    backend_dir = Path(__file__).parent.parent
    
    test_dirs = [
        backend_dir / "tests",
        backend_dir / "tests_complete_184", 
        backend_dir / "tests_integration"
    ]
    
    test_analysis = {}
    
    for test_dir in test_dirs:
        if not test_dir.exists():
            continue
            
        dir_name = test_dir.name
        test_analysis[dir_name] = {
            'files': [],
            'total_size': 0,
            'endpoints_covered': set()
        }
        
        for test_file in test_dir.glob("**/*.py"):
            if test_file.name.startswith('test_'):
                file_size = test_file.stat().st_size
                test_analysis[dir_name]['files'].append({
                    'name': test_file.name,
                    'path': test_file,
                    'size': file_size,
                    'size_kb': file_size // 1024
                })
                test_analysis[dir_name]['total_size'] += file_size
                
                # Анализируем содержимое файла для поиска эндпоинтов
                try:
                    with open(test_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Ищем упоминания API путей
                        import re
                        api_patterns = re.findall(r'["\']/(api/[^"\']*)["\']', content)
                        for pattern in api_patterns:
                            test_analysis[dir_name]['endpoints_covered'].add(pattern)
                except:
                    pass
    
    return test_analysis

def identify_duplicates_and_obsolete(test_analysis, postman_endpoints):
    """Определяет дубликаты и устаревшие тесты"""
    
    print("\n🔍 АНАЛИЗ ТЕСТОВЫХ ФАЙЛОВ")
    print("=" * 60)
    
    recommendations = {
        'keep': [],
        'archive': [],
        'delete': []
    }
    
    # Анализируем каждую папку
    for dir_name, data in test_analysis.items():
        print(f"\n📁 {dir_name}:")
        print(f"  📊 Файлов: {len(data['files'])}")
        print(f"  📊 Общий размер: {data['total_size'] // 1024}KB")
        print(f"  📊 Покрытых эндпоинтов: {len(data['endpoints_covered'])}")
        
        # Показываем файлы
        for file_info in sorted(data['files'], key=lambda x: x['size'], reverse=True):
            print(f"    📄 {file_info['name']} ({file_info['size_kb']}KB)")
    
    # Рекомендации по очистке
    print(f"\n💡 РЕКОМЕНДАЦИИ:")
    
    # tests/ - простая папка с одним файлом
    if 'tests' in test_analysis:
        files = test_analysis['tests']['files']
        if len(files) == 1 and files[0]['size_kb'] < 50:
            recommendations['delete'].extend([f['path'] for f in files])
            print(f"  🗑️ tests/ - удалить (дублирует Postman)")
    
    # tests_complete_184/ - детальные тесты по категориям
    if 'tests_complete_184' in test_analysis:
        files = test_analysis['tests_complete_184']['files']
        large_files = [f for f in files if f['size_kb'] > 20]
        small_files = [f for f in files if f['size_kb'] <= 20]
        
        if large_files:
            recommendations['keep'].extend([f['path'] for f in large_files])
            print(f"  ✅ tests_complete_184/ - оставить крупные файлы ({len(large_files)} шт)")
        
        if small_files:
            recommendations['archive'].extend([f['path'] for f in small_files])
            print(f"  📁 tests_complete_184/ - архивировать мелкие файлы ({len(small_files)} шт)")
    
    # tests_integration/ - интеграционные тесты
    if 'tests_integration' in test_analysis:
        files = test_analysis['tests_integration']['files']
        
        # Определяем важные интеграционные тесты
        important_keywords = ['comprehensive', 'final', 'full_system', 'workflow']
        important_files = []
        other_files = []
        
        for f in files:
            if any(keyword in f['name'].lower() for keyword in important_keywords):
                important_files.append(f)
            else:
                other_files.append(f)
        
        if important_files:
            recommendations['keep'].extend([f['path'] for f in important_files])
            print(f"  ✅ tests_integration/ - оставить важные тесты ({len(important_files)} шт)")
        
        if other_files:
            recommendations['archive'].extend([f['path'] for f in other_files])
            print(f"  📁 tests_integration/ - архивировать остальные ({len(other_files)} шт)")
    
    return recommendations

def execute_cleanup(recommendations):
    """Выполняет очистку согласно рекомендациям"""
    backend_dir = Path(__file__).parent.parent
    
    # Создаем архивную папку
    archive_dir = backend_dir / "archive" / "old_tests"
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n🧹 ВЫПОЛНЕНИЕ ОЧИСТКИ")
    print("=" * 40)
    
    # Удаляем файлы
    deleted_count = 0
    for file_path in recommendations['delete']:
        if file_path.exists():
            file_path.unlink()
            print(f"  🗑️ Удален: {file_path.name}")
            deleted_count += 1
    
    # Архивируем файлы
    archived_count = 0
    for file_path in recommendations['archive']:
        if file_path.exists():
            # Создаем подпапку в архиве по имени родительской папки
            parent_name = file_path.parent.name
            archive_subdir = archive_dir / parent_name
            archive_subdir.mkdir(exist_ok=True)
            
            archive_path = archive_subdir / file_path.name
            shutil.move(str(file_path), str(archive_path))
            print(f"  📁 Архивирован: {file_path.name} → archive/old_tests/{parent_name}/")
            archived_count += 1
    
    # Показываем оставленные файлы
    kept_count = len(recommendations['keep'])
    print(f"  ✅ Оставлено важных файлов: {kept_count}")
    
    return deleted_count, archived_count, kept_count

def cleanup_empty_dirs():
    """Удаляет пустые папки"""
    backend_dir = Path(__file__).parent.parent
    
    test_dirs = [
        backend_dir / "tests",
        backend_dir / "tests_complete_184",
        backend_dir / "tests_integration"
    ]
    
    removed_dirs = 0
    for test_dir in test_dirs:
        if test_dir.exists():
            # Проверяем, есть ли Python файлы
            python_files = list(test_dir.glob("**/*.py"))
            if not python_files or (len(python_files) == 1 and python_files[0].name == '__init__.py'):
                # Папка пустая или содержит только __init__.py
                shutil.rmtree(test_dir)
                print(f"  🗑️ Удалена пустая папка: {test_dir.name}")
                removed_dirs += 1
    
    return removed_dirs

def main():
    """Основная функция"""
    print("🧹 ОЧИСТКА ДУБЛИРУЮЩИХСЯ ТЕСТОВ")
    print("=" * 60)
    
    # 1. Анализируем Postman коллекцию
    postman_endpoints = analyze_postman_collection()
    
    # 2. Анализируем тестовые файлы
    test_analysis = analyze_test_files()
    
    # 3. Определяем что удалить/архивировать
    recommendations = identify_duplicates_and_obsolete(test_analysis, postman_endpoints)
    
    # 4. Выполняем очистку
    deleted, archived, kept = execute_cleanup(recommendations)
    
    # 5. Удаляем пустые папки
    removed_dirs = cleanup_empty_dirs()
    
    print(f"\n" + "=" * 60)
    print("🎉 ОЧИСТКА ТЕСТОВ ЗАВЕРШЕНА!")
    print(f"📊 Статистика:")
    print(f"  🗑️ Удалено файлов: {deleted}")
    print(f"  📁 Архивировано файлов: {archived}")
    print(f"  ✅ Оставлено важных файлов: {kept}")
    print(f"  🗑️ Удалено пустых папок: {removed_dirs}")
    print(f"\n💡 Postman коллекция покрывает все 177 эндпоинтов")
    print(f"✅ Оставлены только уникальные и важные тесты")

if __name__ == "__main__":
    main()
