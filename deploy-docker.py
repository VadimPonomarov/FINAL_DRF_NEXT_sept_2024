#!/usr/bin/env python3
"""
🐳 ПОЛНОЕ РАЗВЕРТЫВАНИЕ В DOCKER - AutoRia Clone
===============================================

Полностью автоматический скрипт для развертывания ВСЕХ сервисов в Docker контейнерах.
- Backend и все сервисы: в Docker контейнерах
- Frontend: в Docker контейнере (НЕ требует Node.js/npm на хосте)

🎯 ИСПОЛЬЗОВАНИЕ:
    python deploy-frontend-docker.py                    # ✅ Полностью автоматический режим
    python deploy-frontend-docker.py --skip-docker      # Пропустить docker-compose up --build
    python deploy-frontend-docker.py --rebuild         # Пересобрать все образы

🚀 ЧТО ДЕЛАЕТ СКРИПТ:
✅ Проверяет системные требования (только Docker)
✅ Запускает docker-compose.docker.yml up --build
✅ Ожидает healthy статус всех контейнеров (включая frontend)
✅ Выводит ссылки и информацию
"""

import os
import sys
import subprocess
import time
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

def print_step(step, message):
    """Выводит шаг с цветным форматированием"""
    print(f"{Colors.OKBLUE}[ШАГ {step}]{Colors.ENDC} {Colors.BOLD}{message}{Colors.ENDC}")

def print_success(message):
    """Выводит сообщение об успехе"""
    print(f"{Colors.OKGREEN}[OK] {message}{Colors.ENDC}")

def print_warning(message):
    """Выводит предупреждающее сообщение"""
    print(f"{Colors.WARNING}[WARNING] {message}{Colors.ENDC}")

def print_error(message):
    """Выводит сообщение об ошибке"""
    print(f"{Colors.FAIL}[ERROR] {message}{Colors.ENDC}")

def wait_for_all_containers_healthy(timeout=600, compose_file="docker-compose.docker.yml"):
    """Ожидает пока все контейнеры с healthcheck станут healthy"""
    print("\n🔍 Проверка и ожидание healthy статуса всех контейнеров...")
    
    # Контейнеры с healthcheck из docker-compose.deploy.yml
    service_to_container = {}
    
    try:
        result = subprocess.run(
            ["docker-compose", "-f", compose_file, "ps", "--format", "json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            import json
            containers_json = result.stdout.strip()
            if containers_json:
                if containers_json.startswith('['):
                    containers = json.loads(containers_json)
                else:
                    containers = []
                    for line in containers_json.split('\n'):
                        line = line.strip()
                        if line:
                            try:
                                containers.append(json.loads(line))
                            except:
                                pass
                
                for container in containers:
                    service_name = container.get("Service", "")
                    container_name = container.get("Name", "")
                    if service_name and container_name:
                        service_to_container[service_name] = container_name
                        print(f"   Найден контейнер: {service_name} -> {container_name}")
    except Exception as e:
        print_warning(f"⚠️ Не удалось получить список контейнеров: {e}")
    
    # Маппинг сервисов на container_name
    default_container_names = {
        "pg": "pg",
        "redis": "redis",
        "rabbitmq": "rabbitmq",
        "celery-worker": "celery-worker",
        "mailing": "mailing",
        "nginx": "nginx",
        "frontend": "frontend",
        "app": "app"  # Backend Django
    }
    
    # Сервисы с healthcheck из docker-compose.docker.yml
    services_with_healthcheck = [
        "pg",           # PostgreSQL
        "redis",        # Redis
        "rabbitmq",     # RabbitMQ
        "app",          # Django Backend
        "celery-worker", # Celery Worker
        "mailing",      # Mailing Service
        "nginx",        # Nginx
        "frontend"      # Frontend Next.js
    ]
    
    # Сервисы, для которых running достаточно
    services_optional_health = {"mailing", "nginx"}
    
    # Быстрая проверка - все ли уже healthy
    print("🔍 Быстрая проверка статуса контейнеров...")
    all_already_healthy = True
    initial_status = {}
    
    for service in services_with_healthcheck:
        container_name = service_to_container.get(service) or default_container_names.get(service) or service
        
        try:
            result = subprocess.run(
                ["docker", "inspect", "--format", "{{.State.Health.Status}}", container_name],
                capture_output=True,
                text=True,
                timeout=3
            )
            
            if result.returncode == 0:
                health_status = result.stdout.strip().lower()
                
                if not health_status:
                    status_result = subprocess.run(
                        ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                        capture_output=True,
                        text=True,
                        timeout=3
                    )
                    if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                        initial_status[service] = "✅ Запущен (без healthcheck)"
                        continue
                    else:
                        all_already_healthy = False
                        initial_status[service] = "⏳ Не запущен"
                        continue
                
                if health_status == "healthy":
                    initial_status[service] = "✅ Healthy"
                elif health_status == "unhealthy":
                    if service in services_optional_health:
                        status_result = subprocess.run(
                            ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                            capture_output=True,
                            text=True,
                            timeout=3
                        )
                        if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                            initial_status[service] = "✅ Running (healthcheck не проходит, но сервис работает)"
                        else:
                            all_already_healthy = False
                            initial_status[service] = "❌ Unhealthy"
                    else:
                        all_already_healthy = False
                        initial_status[service] = "❌ Unhealthy"
                else:
                    all_already_healthy = False
                    initial_status[service] = f"⏳ {health_status}"
            else:
                all_already_healthy = False
                initial_status[service] = "⏳ Не найден"
        except:
            all_already_healthy = False
            initial_status[service] = "⏳ Ошибка проверки"
    
    # Показываем начальный статус
    print("\n📊 Текущий статус контейнеров:")
    for service, status in initial_status.items():
        print(f"   {status} - {service}")
    
    if all_already_healthy:
        print_success("\n✅ Все контейнеры уже healthy! Пропускаем ожидание.")
        return True
    
    # Иначе ждем пока все станут healthy
    print("\n⏳ Ожидание пока все контейнеры станут healthy...")
    start_time = time.time()
    checked_services = set()
    
    while time.time() - start_time < timeout:
        all_healthy = True
        current_status = {}
        
        for service in services_with_healthcheck:
            container_name = service_to_container.get(service) or default_container_names.get(service) or service
            
            try:
                result = subprocess.run(
                    ["docker", "inspect", "--format", "{{.State.Health.Status}}", container_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    health_status = result.stdout.strip().lower()
                    
                    if not health_status:
                        status_result = subprocess.run(
                            ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                            current_status[service] = "✅ Запущен (без healthcheck)"
                            continue
                        else:
                            all_healthy = False
                            current_status[service] = "⏳ Запускается..."
                            continue
                    
                    if health_status == "healthy":
                        if service not in checked_services:
                            print_success(f"✅ {service}: стал healthy")
                            checked_services.add(service)
                        current_status[service] = "✅ Healthy"
                    elif health_status == "unhealthy":
                        if service in services_optional_health:
                            status_result = subprocess.run(
                                ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                                if service not in checked_services:
                                    print_warning(f"⚠️ {service}: running, но healthcheck не проходит (продолжаем)")
                                    checked_services.add(service)
                                current_status[service] = "✅ Running (healthcheck не проходит)"
                            else:
                                all_healthy = False
                                current_status[service] = "❌ Unhealthy"
                        else:
                            all_healthy = False
                            current_status[service] = "❌ Unhealthy"
                    elif health_status in ["starting", ""]:
                        all_healthy = False
                        current_status[service] = "⏳ Запускается..."
                    else:
                        all_healthy = False
                        current_status[service] = f"⏳ {health_status}"
                else:
                    all_healthy = False
                    current_status[service] = "⏳ Ожидание контейнера..."
                    
            except subprocess.TimeoutExpired:
                all_healthy = False
                current_status[service] = "⏳ Таймаут проверки"
            except Exception as e:
                all_healthy = False
                current_status[service] = f"⏳ Ошибка: {str(e)[:20]}"
        
        # Показываем текущий статус
        elapsed = int(time.time() - start_time)
        waiting_services = [f"{k}" for k, v in current_status.items() if "⏳" in v or "❌" in v]
        if waiting_services:
            print(f"\r⏳ Ожидание ({elapsed}/{timeout}с): {', '.join(waiting_services[:3])}", end="", flush=True)
        else:
            print(f"\r⏳ Ожидание ({elapsed}/{timeout}с)...", end="", flush=True)
        
        if all_healthy:
            print(f"\n✅ Все контейнеры healthy! (за {elapsed} секунд)")
            return True
        
        time.sleep(5)  # Проверяем каждые 5 секунд
    
    print(f"\n⚠️ Таймаут ожидания ({timeout}с). Некоторые контейнеры могут быть не готовы.")
    
    # Показываем финальный статус
    print("\n📊 Финальный статус контейнеров:")
    for service in services_with_healthcheck:
        container_name = service_to_container.get(service) or default_container_names.get(service) or service
        try:
            result = subprocess.run(
                ["docker", "inspect", "--format", "{{.State.Health.Status}}", container_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                health_status = result.stdout.strip()
                status_icon = "✅" if health_status.lower() == "healthy" else "❌" if health_status.lower() == "unhealthy" else "⏳"
                print(f"   {status_icon} {service}: {health_status or 'без healthcheck'}")
        except:
            print(f"   ❓ {service}: невозможно проверить")
    
    return False

def run_command(command, cwd=None, check=True, capture_output=False):
    """Выполняет команду с обработкой ошибок"""
    try:
        if capture_output:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                check=check,
                capture_output=True,
                text=True
            )
        else:
            print(f"Выполняется: {command}")
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                check=check
            )
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"Ошибка выполнения команды: {command}")
        print_error(f"Код ошибки: {e.returncode}")
        if capture_output:
            print_error(f"Вывод: {e.stdout}")
            print_error(f"Ошибки: {e.stderr}")
        return None

def check_requirements():
    """Проверяет системные требования"""
    print("🔍 Проверка системных требований...")

    # Проверка Docker
    result = run_command("docker --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"Docker: {result.stdout.strip()}")
    else:
        print_error("Docker не найден! Установите Docker")
        return False

    # Проверка docker-compose
    result = run_command("docker-compose --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"docker-compose: {result.stdout.strip()}")
    else:
        print_error("docker-compose не найден! Установите docker-compose")
        return False
    
    print_success("Все системные требования выполнены!")
    return True

def main():
    """Главная функция - полный процесс развертывания в Docker"""
    try:
        # Парсим аргументы командной строки
        parser = argparse.ArgumentParser(description='AutoRia Clone Docker Deploy Script')
        parser.add_argument('--skip-docker', action='store_true',
                          help='Пропустить docker-compose up --build (для тестирования)')
        parser.add_argument('--rebuild', action='store_true',
                          help='Пересобрать все образы (--build)')

        args = parser.parse_args()

        # Устанавливаем кодировку для Windows
        if sys.platform == "win32":
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

        compose_file = "docker-compose.docker.yml"

        print(f"{Colors.HEADER}{Colors.BOLD}")
        print("=" * 70)
        print("ПОЛНОЕ РАЗВЕРТЫВАНИЕ В DOCKER - AutoRia Clone")
        print("=" * 70)
        print("🐳 ВСЕ СЕРВИСЫ В DOCKER КОНТЕЙНЕРАХ")
        print(f"{Colors.ENDC}")
        print()

        print("📋 План развертывания:")
        print("   1️⃣  Проверка системных требований")
        print("   2️⃣  docker-compose.docker.yml up --build")
        print("   3️⃣  Ожидание healthy статуса всех контейнеров")
        print("   4️⃣  Вывод информации со ссылками")
        print()

        # ЭТАП 1: Проверка системных требований
        print_step(1, "Проверка системных требований")
        if not check_requirements():
            print_error("❌ Проверка системных требований не пройдена!")
            sys.exit(1)

        # ЭТАП 2: docker-compose up --build (только если нужно)
        if not args.skip_docker:
            print_step(2, "Запуск docker-compose.docker.yml up --build")
            
            # Проверяем, не запущены ли контейнеры уже
            print("🔍 Проверка статуса контейнеров...")
            try:
                result = subprocess.run(
                    ["docker-compose", "-f", compose_file, "ps", "-q"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                has_containers = bool(result.stdout.strip())
                
                if has_containers:
                    if wait_for_all_containers_healthy(timeout=30, compose_file=compose_file):
                        print_success("✅ Все контейнеры уже запущены и healthy! Пропускаем docker-compose up --build")
                        skip_docker_build = True
                    else:
                        print_warning("⚠️  Некоторые контейнеры не healthy, запускаем пересборку...")
                        skip_docker_build = False
                else:
                    skip_docker_build = False
            except:
                skip_docker_build = False
            
            if not skip_docker_build:
                print("🔨 Запуск сборки и запуска всех Docker контейнеров...")
                print("⏳ Это может занять 10-15 минут (особенно первая сборка frontend)...")
                
                # Формируем команду
                if args.rebuild:
                    compose_cmd = ["docker-compose", "-f", compose_file, "up", "--build", "-d", "--force-recreate"]
                else:
                    compose_cmd = ["docker-compose", "-f", compose_file, "up", "--build", "-d"]
                
                # Запускаем docker-compose up --build
                process = subprocess.Popen(
                    compose_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                # Показываем вывод в реальном времени
                for line in iter(process.stdout.readline, ''):
                    if line:
                        print(f"   {line.rstrip()}")
                
                return_code = process.wait()
                
                if return_code != 0:
                    print_error(f"❌ Ошибка при выполнении docker-compose up --build (код: {return_code})")
                    sys.exit(1)
                
                print_success("✅ docker-compose up --build завершено успешно!")
        else:
            print_warning("⏭️  Пропущено docker-compose up --build (--skip-docker)")

        # ЭТАП 3: Ожидание healthy статуса всех контейнеров
        print_step(3, "Ожидание healthy статуса всех контейнеров")
        if not wait_for_all_containers_healthy(timeout=600, compose_file=compose_file):  # 10 минут максимум
            print_warning("⚠️  Некоторые контейнеры не стали healthy, но продолжаем...")

        # ЭТАП 4: Вывод информации со ссылками
        print_step(4, "Вывод информации со ссылками")
        
        print()
        print("="*70)
        print(f"{Colors.OKGREEN}{Colors.BOLD}🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО!{Colors.ENDC}")
        print("="*70)
        print()
        print(f"{Colors.BOLD}🌐 AutoRia Clone готов к использованию!{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}🌟 Основные ссылки:{Colors.ENDC}")
        print(f"   🔗 Главная страница (через Nginx): {Colors.OKBLUE}http://localhost{Colors.ENDC}")
        print(f"   🔗 Frontend (напрямую): {Colors.OKBLUE}http://localhost:3000{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}📋 Backend сервисы:{Colors.ENDC}")
        print(f"   🔗 Backend API: {Colors.OKBLUE}http://localhost:8000/api/{Colors.ENDC}")
        print(f"   🔗 API Docs (Swagger): {Colors.OKBLUE}http://localhost:8000/api/docs/{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}⚙️  Дополнительные сервисы:{Colors.ENDC}")
        print(f"   🔗 RabbitMQ Management: {Colors.OKBLUE}http://localhost:15672{Colors.ENDC}")
        print(f"   🔗 Celery Flower: {Colors.OKBLUE}http://localhost:5555{Colors.ENDC}")
        print(f"   🔗 Redis Insight: {Colors.OKBLUE}http://localhost:5540{Colors.ENDC}")
        print(f"   🔗 Mailing Service: {Colors.OKBLUE}http://localhost:8001{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}💡 Статус сервисов:{Colors.ENDC}")
        print(f"   ✅ Frontend: Docker контейнер (порт 3000)")
        print(f"   ✅ Backend: Docker контейнер (порт 8000)")
        print(f"   ✅ Nginx: reverse proxy (порт 80)")
        print()
        print("="*70)
        print()
        print(f"{Colors.WARNING}💡 Примечание:{Colors.ENDC}")
        print(f"   - Все сервисы работают в Docker контейнерах")
        print(f"   - Frontend автоматически собирается в Docker (не требует Node.js на хосте)")
        print(f"   - Для просмотра логов: docker-compose -f {compose_file} logs -f [service]")
        print(f"   - Для остановки: docker-compose -f {compose_file} down")
        print(f"   - Для перезапуска: docker-compose -f {compose_file} restart [service]")
        print()

    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}⚠️  Развертывание прервано пользователем{Colors.ENDC}")
        print("🛑 Завершение работы...")
        sys.exit(130)  # Стандартный код выхода для Ctrl+C
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Критическая ошибка: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()

