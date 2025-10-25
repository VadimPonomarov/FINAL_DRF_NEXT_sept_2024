#!/usr/bin/env python3
"""
Docker Cleanup Script - Очистка Docker від сміття
===================================================

Автоматична очистка Docker перед розгортанням для звільнення місця та
уникнення конфліктів застарілих images/containers/volumes.

Використання:
    python docker-cleanup.py                    # Інтерактивний режим
    python docker-cleanup.py --auto             # Автоматична очистка
    python docker-cleanup.py --deep             # Глибока очистка (все)
    python docker-cleanup.py --safe             # Безпечна очистка (тільки stopped)

Що очищається:
- Stopped контейнери
- Dangling images (без тегів)
- Unused volumes
- Build cache
- Networks (крім default)
"""

import subprocess
import sys
import argparse
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(message):
    """Виводить заголовок"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(message):
    """Виводить повідомлення про успіх"""
    print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")

def print_warning(message):
    """Виводить попередження"""
    print(f"{Colors.WARNING}⚠️  {message}{Colors.ENDC}")

def print_error(message):
    """Виводить помилку"""
    print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")

def print_info(message):
    """Виводить інформацію"""
    print(f"{Colors.OKCYAN}ℹ️  {message}{Colors.ENDC}")

def run_command(command, description, ignore_errors=False):
    """Виконує команду Docker"""
    print(f"{Colors.OKBLUE}🔧 {description}...{Colors.ENDC}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            output = result.stdout.strip()
            if output:
                print(f"   {output}")
            print_success(f"{description} - завершено")
            return True
        else:
            if ignore_errors:
                print_warning(f"{description} - пропущено (немає даних для очистки)")
                return True
            else:
                print_error(f"{description} - помилка: {result.stderr}")
                return False
    except Exception as e:
        print_error(f"{description} - виняток: {str(e)}")
        return False

def get_docker_info():
    """Отримує інформацію про використання Docker"""
    print_header("📊 АНАЛІЗ ВИКОРИСТАННЯ DOCKER")
    
    commands = [
        ("docker system df", "Використання дискового простору"),
        ("docker ps -a --format 'table {{.Names}}\t{{.Status}}'", "Контейнери"),
        ("docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'", "Images"),
    ]
    
    for cmd, desc in commands:
        print(f"\n{Colors.OKCYAN}{desc}:{Colors.ENDC}")
        subprocess.run(cmd, shell=True)

def safe_cleanup():
    """Безпечна очистка (тільки stopped контейнери та dangling images)"""
    print_header("🧹 БЕЗПЕЧНА ОЧИСТКА DOCKER")
    
    tasks = [
        ("docker container prune -f", "Видалення stopped контейнерів", True),
        ("docker image prune -f", "Видалення dangling images", True),
        ("docker network prune -f", "Видалення unused networks", True),
    ]
    
    for cmd, desc, ignore in tasks:
        run_command(cmd, desc, ignore)

def moderate_cleanup():
    """Помірна очистка (+ unused volumes та build cache)"""
    print_header("🧹 ПОМІРНА ОЧИСТКА DOCKER")
    
    safe_cleanup()
    
    additional_tasks = [
        ("docker volume prune -f", "Видалення unused volumes", True),
        ("docker builder prune -f", "Очистка build cache", True),
    ]
    
    for cmd, desc, ignore in additional_tasks:
        run_command(cmd, desc, ignore)

def deep_cleanup():
    """Глибока очистка (все, крім running контейнерів)"""
    print_header("🧹 ГЛИБОКА ОЧИСТКА DOCKER")
    
    print_warning("Це видалить ВСІ unused Docker об'єкти!")
    
    if not auto_mode:
        response = input(f"{Colors.WARNING}Продовжити? (y/N): {Colors.ENDC}").lower()
        if response != 'y':
            print_info("Глибока очистка скасована")
            return
    
    tasks = [
        ("docker system prune -a -f --volumes", "Глибока очистка системи", True),
    ]
    
    for cmd, desc, ignore in tasks:
        run_command(cmd, desc, ignore)

def project_specific_cleanup():
    """Очистка специфічна для проекту"""
    print_header("🎯 ОЧИСТКА ПРОЕКТУ AutoRia")
    
    project_name = "final_drf_next_sept_2024"
    
    print_info(f"Зупинка контейнерів проекту {project_name}...")
    run_command("docker-compose down", "Зупинка docker-compose", True)
    
    print_info(f"Видалення volumes проекту...")
    run_command(
        f"docker volume ls -q -f name={project_name} | ForEach-Object {{ docker volume rm $_ }}",
        "Видалення project volumes",
        True
    )
    
    print_info(f"Видалення images проекту...")
    run_command(
        f"docker images -q {project_name}* | ForEach-Object {{ docker rmi $_ }}",
        "Видалення project images",
        True
    )

def interactive_menu():
    """Інтерактивне меню вибору режиму очистки"""
    print_header("🐳 DOCKER CLEANUP - МЕНЮ")
    
    print("Оберіть режим очистки:\n")
    print("1. 🔍 Аналіз (тільки показати інформацію)")
    print("2. 🧹 Безпечна очистка (stopped контейнери + dangling images)")
    print("3. 🧽 Помірна очистка (+ unused volumes + build cache)")
    print("4. 💥 Глибока очистка (ВСЕ unused об'єкти)")
    print("5. 🎯 Очистка проекту (специфічна для AutoRia)")
    print("0. ❌ Вихід\n")
    
    choice = input(f"{Colors.OKCYAN}Ваш вибір (0-5): {Colors.ENDC}").strip()
    
    if choice == '1':
        get_docker_info()
    elif choice == '2':
        safe_cleanup()
    elif choice == '3':
        moderate_cleanup()
    elif choice == '4':
        deep_cleanup()
    elif choice == '5':
        project_specific_cleanup()
    elif choice == '0':
        print_info("Вихід...")
        sys.exit(0)
    else:
        print_error("Невірний вибір!")
        return interactive_menu()

def main():
    """Головна функція"""
    global auto_mode
    
    parser = argparse.ArgumentParser(description='Docker Cleanup Script')
    parser.add_argument('--auto', action='store_true', help='Автоматична помірна очистка')
    parser.add_argument('--safe', action='store_true', help='Безпечна очистка')
    parser.add_argument('--deep', action='store_true', help='Глибока очистка')
    parser.add_argument('--project', action='store_true', help='Очистка проекту')
    parser.add_argument('--info', action='store_true', help='Тільки інформація')
    
    args = parser.parse_args()
    auto_mode = args.auto or args.safe or args.deep or args.project or args.info
    
    print_header("🐳 DOCKER CLEANUP SCRIPT")
    print_info("Очистка Docker для проекту AutoRia")
    
    # Перевірка Docker
    try:
        subprocess.run("docker --version", shell=True, check=True, capture_output=True)
    except:
        print_error("Docker не встановлено або не запущено!")
        sys.exit(1)
    
    if args.info:
        get_docker_info()
    elif args.safe:
        safe_cleanup()
    elif args.deep:
        deep_cleanup()
    elif args.project:
        project_specific_cleanup()
    elif args.auto:
        moderate_cleanup()
    else:
        interactive_menu()
    
    # Показати підсумок
    print_header("📊 ПІДСУМОК ПІСЛЯ ОЧИСТКИ")
    subprocess.run("docker system df", shell=True)
    
    print_success("Очистка завершена!")

if __name__ == "__main__":
    main()

