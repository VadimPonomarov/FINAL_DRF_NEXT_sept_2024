#!/usr/bin/env python3
"""
⚡ АВТОМАТИЧНИЙ ДЕПЛОЙ AutoRia Clone - Frontend ЛОКАЛЬНО
========================================================

Повністю автоматичний скрипт для розгортання проекту:
- Backend та всі сервіси: в Docker контейнерах
- Frontend: локально (требує Node.js/npm на хосте)

🎯 ВИКОРИСТАННЯ:
    python deploy-frontend-local.py                # ✅ Повністю автоматичний режим
    python deploy-frontend-local.py --skip-docker  # Пропустити docker-compose up --build

🚀 ЧТО ДЕЛАЄ СКРИПТ:
✅ Перевіряє системні вимоги (Node.js, npm, Docker)
✅ Запускає docker-compose.local.yml up --build (якщо потрібно)
✅ Очікує healthy статусу всіх контейнерів
✅ Встановлює залежності frontend локально (npm install)
✅ Збирає frontend локально (npm run build)
✅ Запускає frontend сервер локально (npm run start)
✅ Виводить посилання та інформацію
"""

import os
import sys
import subprocess
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

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
    """Виводить крок з кольоровим форматуванням"""
    print(f"{Colors.OKBLUE}[КРОК {step}]{Colors.ENDC} {Colors.BOLD}{message}{Colors.ENDC}")

def print_success(message):
    """Виводить повідомлення про успіх"""
    print(f"{Colors.OKGREEN}[OK] {message}{Colors.ENDC}")

def print_warning(message):
    """Виводить попереджувальне повідомлення"""
    print(f"{Colors.WARNING}[WARNING] {message}{Colors.ENDC}")

def print_error(message):
    """Виводить повідомлення про помилку"""
    print(f"{Colors.FAIL}[ERROR] {message}{Colors.ENDC}")

def wait_for_all_containers_healthy(timeout=600):
    """Очікує поки всі контейнери з healthcheck стануть healthy"""
    print("\n🔍 Перевірка та очікування healthy статусу всіх контейнерів...")
    
    # Контейнери з healthcheck з docker-compose.yml
    # Спочатку отримуємо реальні імена контейнерів через docker-compose ps
    compose_file = "docker-compose.yml"
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
                # Обробляємо випадок коли результат - одна строка JSON або масив
                if containers_json.startswith('['):
                    containers = json.loads(containers_json)
                else:
                    # Може бути кілька рядків JSON, один на рядок
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
                        print(f"   Знайдено контейнер: {service_name} -> {container_name}")
    except Exception as e:
        print_warning(f"⚠️ Не вдалося отримати список контейнерів: {e}")
    
    # Маппінг сервісів на container_name (якщо не знайдено через docker-compose ps)
    default_container_names = {
        "pg": "pg",
        "redis": "redis",
        "rabbitmq": "rabbitmq",
        "celery-worker": "celery-worker",
        "mailing": "mailing",
        "nginx": "nginx"
    }
    
    # Сервіси з healthcheck з docker-compose.yml
    services_with_healthcheck = [
        "pg",           # PostgreSQL
        "redis",        # Redis
        "rabbitmq",     # RabbitMQ
        "app",         # Django Backend
        "celery-worker", # Celery Worker
        "mailing",     # Mailing Service
        "nginx"        # Nginx
    ]
    
    # Сервіси, для яких running достатньо (навіть якщо healthcheck не проходить)
    services_optional_health = {"mailing", "nginx"}
    
    # Спочатку швидка перевірка - чи всі вже healthy
    print("🔍 Швидка перевірка статусу контейнерів...")
    all_already_healthy = True
    initial_status = {}
    
    for service in services_with_healthcheck:
        # Визначаємо ім'я контейнера
        container_name = service_to_container.get(service) or default_container_names.get(service) or service
        
        try:
            # Перевіряємо health статус через docker inspect
            result = subprocess.run(
                ["docker", "inspect", "--format", "{{.State.Health.Status}}", container_name],
                capture_output=True,
                text=True,
                timeout=3
            )
            
            if result.returncode == 0:
                health_status = result.stdout.strip().lower()
                
                # Контейнери без healthcheck - перевіряємо що вони running
                if not health_status:
                    status_result = subprocess.run(
                        ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                        capture_output=True,
                        text=True,
                        timeout=3
                    )
                    if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                        initial_status[service] = "✅ Запущено (без healthcheck)"
                        continue
                    else:
                        all_already_healthy = False
                        initial_status[service] = "⏳ Не запущено"
                        continue
                
                if health_status == "healthy":
                    initial_status[service] = "✅ Healthy"
                elif health_status == "unhealthy":
                    # Для опціональних сервісів перевіряємо чи вони running
                    if service in services_optional_health:
                        status_result = subprocess.run(
                            ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                            capture_output=True,
                            text=True,
                            timeout=3
                        )
                        if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                            initial_status[service] = "✅ Running (healthcheck не проходить, але сервіс працює)"
                            # Не встановлюємо all_already_healthy = False для опціональних
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
                # Контейнер ще не створено або не запущено
                all_already_healthy = False
                initial_status[service] = "⏳ Не знайдено"
        except:
            all_already_healthy = False
            initial_status[service] = "⏳ Помилка перевірки"
    
    # Показуємо початковий статус
    print("\n📊 Поточний статус контейнерів:")
    for service, status in initial_status.items():
        print(f"   {status} - {service}")
    
    # Якщо всі вже healthy - одразу повертаємося
    if all_already_healthy:
        print_success("\n✅ Всі контейнери вже healthy! Пропускаємо очікування.")
        return True
    
    # Інакше чекаємо поки всі стануть healthy
    print("\n⏳ Очікування поки всі контейнери стануть healthy...")
    start_time = time.time()
    checked_services = set()
    
    while time.time() - start_time < timeout:
        all_healthy = True
        current_status = {}
        
        for service in services_with_healthcheck:
            # Визначаємо ім'я контейнера
            container_name = service_to_container.get(service) or default_container_names.get(service) or service
            
            try:
                # Перевіряємо health статус через docker inspect
                result = subprocess.run(
                    ["docker", "inspect", "--format", "{{.State.Health.Status}}", container_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    health_status = result.stdout.strip().lower()
                    
                    # Контейнери без healthcheck можуть повернути порожній рядок
                    # Перевіряємо що контейнер взагалі існує і running
                    if not health_status:
                        # Перевіряємо статус контейнера
                        status_result = subprocess.run(
                            ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                            current_status[service] = "✅ Запущено (без healthcheck)"
                            if service not in checked_services:
                                checked_services.add(service)
                            continue
                        else:
                            all_healthy = False
                            current_status[service] = "⏳ Запускається..."
                            continue
                    
                    if health_status == "healthy":
                        if service not in checked_services:
                            print_success(f"✅ {service}: став healthy")
                            checked_services.add(service)
                        current_status[service] = "✅ Healthy"
                    elif health_status == "unhealthy":
                        # Для опціональних сервісів перевіряємо чи вони running
                        if service in services_optional_health:
                            status_result = subprocess.run(
                                ["docker", "inspect", "--format", "{{.State.Status}}", container_name],
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            if status_result.returncode == 0 and "running" in status_result.stdout.lower():
                                if service not in checked_services:
                                    print_warning(f"⚠️ {service}: running, але healthcheck не проходить (продовжуємо)")
                                    checked_services.add(service)
                                current_status[service] = "✅ Running (healthcheck не проходить)"
                                # Не встановлюємо all_healthy = False для опціональних
                            else:
                                all_healthy = False
                                current_status[service] = "❌ Unhealthy"
                        else:
                            all_healthy = False
                            current_status[service] = "❌ Unhealthy"
                    elif health_status in ["starting", ""]:
                        all_healthy = False
                        current_status[service] = "⏳ Запускається..."
                    else:
                        all_healthy = False
                        current_status[service] = f"⏳ {health_status}"
                else:
                    # Контейнер ще не створено або не запущено
                    all_healthy = False
                    current_status[service] = "⏳ Очікування контейнера..."
                    
            except subprocess.TimeoutExpired:
                all_healthy = False
                current_status[service] = "⏳ Таймаут перевірки"
            except Exception as e:
                all_healthy = False
                current_status[service] = f"⏳ Помилка: {str(e)[:20]}"
        
        # Показуємо поточний статус
        elapsed = int(time.time() - start_time)
        waiting_services = [f"{k}" for k, v in current_status.items() if "⏳" in v or "❌" in v]
        if waiting_services:
            print(f"\r⏳ Очікування ({elapsed}/{timeout}с): {', '.join(waiting_services[:3])}", end="", flush=True)
        else:
            print(f"\r⏳ Очікування ({elapsed}/{timeout}с)...", end="", flush=True)
        
        if all_healthy:
            print(f"\n✅ Всі контейнери healthy! (за {elapsed} секунд)")
            return True
        
        time.sleep(5)  # Перевіряємо кожні 5 секунд
    
    print(f"\n⚠️ Таймаут очікування ({timeout}с). Деякі контейнери можуть бути не готові.")
    
    # Показуємо фінальний статус
    print("\n📊 Фінальний статус контейнерів:")
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
            print(f"   ❓ {service}: неможливо перевірити")
    
    return False

def run_command(command, cwd=None, check=True, capture_output=False):
    """Виконує команду з обробкою помилок"""
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
            # Показуємо вивід в реальному часі
            print(f"Виконується: {command}")
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                check=check
            )
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"Помилка виконання команди: {command}")
        print_error(f"Код помилки: {e.returncode}")
        if capture_output:
            print_error(f"Вивід: {e.stdout}")
            print_error(f"Помилки: {e.stderr}")
        return None

def check_requirements():
    """Перевіряє системні вимоги"""
    print("🔍 Перевірка системних вимог...")

    # Перевірка Node.js
    result = run_command("node --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"Node.js: {result.stdout.strip()}")
    else:
        print_error("Node.js не знайдено! Встановіть Node.js 18+")
        return False

    # Перевірка npm
    result = run_command("npm --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"npm: {result.stdout.strip()}")
    else:
        print_error("npm не знайдено!")
        return False

    # Перевірка Docker
    result = run_command("docker --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"Docker: {result.stdout.strip()}")
    else:
        print_error("Docker не знайдено!")
        return False
    
    print_success("Всі системні вимоги виконані!")
    return True

def main():
    """Головна функція - повний процес розгортання після клонивання з Git"""
    try:
        # Парсуємо аргументи командного рядка
        parser = argparse.ArgumentParser(description='AutoRia Clone Deploy Script')
        parser.add_argument('--skip-docker', action='store_true',
                          help='Пропустити docker-compose up --build (для тестування)')

        args = parser.parse_args()

        # Встановлюємо кодування для Windows
        if sys.platform == "win32":
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

        print(f"{Colors.HEADER}{Colors.BOLD}")
        print("=" * 70)
        print("ПОВНИЙ ПРОЦЕС РОЗГОРТАННЯ AutoRia Clone")
        print("=" * 70)
        print("🚀 ЕМУЛЯЦІЯ РОЗГОРТАННЯ ПІСЛЯ GIT CLONE")
        print(f"{Colors.ENDC}")
        print()

        print("📋 План розгортання:")
        print("   1️⃣  Перевірка системних вимог")
        print("   2️⃣  docker-compose.local.yml up --build (з очікуванням завершення)")
        print("   3️⃣  Очікування healthy статусу всіх контейнерів")
        print("   4️⃣  cd frontend && npm install (локально)")
        print("   5️⃣  npm run build (локально)")
        print("   6️⃣  npm run start (локально, в фоновому режимі)")
        print("   7️⃣  Виведення інформації з посиланнями")
        print()

        # ЕТАП 1: Перевірка системних вимог
        print_step(1, "Перевірка системних вимог")
        if not check_requirements():
            print_error("❌ Перевірка системних вимог не пройдена!")
            sys.exit(1)

        # ЕТАП 2: docker-compose up --build (тільки якщо потрібно)
        if not args.skip_docker:
            print_step(2, "Перевірка та запуск docker-compose.local.yml up --build")
            
            # Перевіряємо, чи не запущені контейнери вже
            compose_file = "docker-compose.yml"
            print("🔍 Перевірка статусу контейнерів...")
            try:
                result = subprocess.run(
                    ["docker-compose", "-f", compose_file, "ps", "-q"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                has_containers = bool(result.stdout.strip())
                
                if has_containers:
                    # Перевіряємо, чи всі контейнери healthy
                    print("🔍 Перевірка healthy статусу існуючих контейнерів...")
                    if wait_for_all_containers_healthy(timeout=30):
                        print_success("✅ Всі контейнери вже запущені і healthy! Пропускаємо docker-compose.local.yml up --build")
                        skip_docker_build = True
                    else:
                        print_warning("⚠️  Деякі контейнери не healthy, запускаємо перезбірку...")
                        skip_docker_build = False
                else:
                    skip_docker_build = False
            except:
                skip_docker_build = False
            
            if not skip_docker_build:
                print("🔨 Запуск збірки та запуску всіх Docker контейнерів...")
                print("⏳ Це може зайняти 5-10 хвилин...")
                
                # Запускаємо docker-compose.local.yml up --build
                compose_file = "docker-compose.yml"
                process = subprocess.Popen(
                    ["docker-compose", "-f", compose_file, "up", "--build", "-d"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                # Показуємо вивід в реальному часі
                for line in iter(process.stdout.readline, ''):
                    if line:
                        print(f"   {line.rstrip()}")
                
                return_code = process.wait()
                
                if return_code != 0:
                    print_error(f"❌ Помилка при виконанні docker-compose up --build (код: {return_code})")
                    sys.exit(1)
                
                print_success("✅ docker-compose.local.yml up --build завершено успішно!")
        else:
            print_warning("⏭️  Пропущено docker-compose.local.yml up --build (--skip-docker)")

        # ЕТАП 3: Очікування healthy статусу всіх контейнерів
        print_step(3, "Очікування healthy статусу всіх контейнерів")
        if not wait_for_all_containers_healthy(timeout=600):  # 10 хвилин максимум
            print_warning("⚠️  Деякі контейнери не стали healthy, але продовжуємо...")

        # ЕТАП 4: Перехід в каталог frontend та npm install
        print_step(4, "Встановлення залежностей frontend (npm install)")
        frontend_dir = Path("frontend")
        
        if not frontend_dir.exists():
            print_error("❌ Каталог frontend не знайдено!")
            sys.exit(1)
        
        print(f"📂 Перехід в каталог: {frontend_dir}")
        print("📦 Встановлення залежностей (npm install)...")
        
        result = run_command(
            "npm install --legacy-peer-deps",
            cwd=frontend_dir,
            capture_output=False
        )
        
        if not result or (hasattr(result, 'returncode') and result.returncode != 0):
            print_error("❌ Помилка при виконанні npm install!")
            sys.exit(1)
        
        print_success("✅ npm install завершено успішно!")

        # ЕТАП 5: npm run build
        print_step(5, "Збірка frontend (npm run build)")
        print("🔨 Запуск збірки frontend...")
        print("⏳ Це може зайняти 2-3 хвилини...")
        
        # Завантажуємо змінні з env-config/ перед збіркою
        root_dir = Path.cwd()
        env_files = [
            root_dir / "env-config" / ".env.base",
            root_dir / "env-config" / ".env.secrets",
            root_dir / "env-config" / ".env.local",
        ]
        
        print("📝 Завантаження змінних оточення з env-config/...")
        for env_file in env_files:
            if env_file.exists():
                load_dotenv(env_file, override=True)
                print(f"   ✅ Завантажено {env_file.name}")
            else:
                print(f"   ⚠️  Файл не знайдено: {env_file.name}")
        
        # Копіюємо env для збірки та перевіряємо критичні змінні
        env = os.environ.copy()
        env['NODE_ENV'] = 'production'
        
        # Встановлюємо значення за замовчуванням для критичних змінних якщо вони не встановлені
        if 'NEXT_PUBLIC_BACKEND_URL' not in env or not env['NEXT_PUBLIC_BACKEND_URL']:
            env['NEXT_PUBLIC_BACKEND_URL'] = 'http://localhost/api'
            print_warning("⚠️  NEXT_PUBLIC_BACKEND_URL не знайдено, встановлюємо за замовчуванням: http://localhost/api")
        
        if 'BACKEND_URL' not in env or not env['BACKEND_URL']:
            env['BACKEND_URL'] = 'http://localhost:8000'
            print_warning("⚠️  BACKEND_URL не знайдено, встановлюємо за замовчуванням: http://localhost:8000")
        
        if 'IS_DOCKER' not in env:
            env['IS_DOCKER'] = 'false'
        
        if 'NEXT_PUBLIC_IS_DOCKER' not in env:
            env['NEXT_PUBLIC_IS_DOCKER'] = 'false'
        
        # Виводимо критичні змінні для перевірки
        print("\n🔧 Змінні оточення для збірки:")
        print(f"   NODE_ENV: {env.get('NODE_ENV', 'NOT_SET')}")
        print(f"   NEXT_PUBLIC_BACKEND_URL: {env.get('NEXT_PUBLIC_BACKEND_URL', 'NOT_SET')}")
        print(f"   BACKEND_URL: {env.get('BACKEND_URL', 'NOT_SET')}")
        print(f"   IS_DOCKER: {env.get('IS_DOCKER', 'NOT_SET')}")
        print(f"   NEXT_PUBLIC_IS_DOCKER: {env.get('NEXT_PUBLIC_IS_DOCKER', 'NOT_SET')}")
        print()
        
        process = subprocess.Popen(
            "npm run build",
            shell=True,
            cwd=frontend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Показуємо вивід в реальному часі
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"   {line.rstrip()}")
        
        return_code = process.wait()
        
        if return_code != 0:
            print_error("❌ Помилка при виконанні npm run build!")
            sys.exit(1)
        
        print_success("✅ npm run build завершено успішно!")

        # ЕТАП 6: npm run start (в фоновому режимі)
        print_step(6, "Запуск frontend сервера (npm run start)")
        print("🚀 Запуск frontend в production режимі...")
        
        # Перевіряємо, чи не зайнятий порт 3000
        print("🔍 Перевірка порту 3000...")
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        port_in_use = (sock.connect_ex(('localhost', 3000)) == 0)
        sock.close()
        
        if port_in_use:
            print_warning("⚠️  Порт 3000 вже зайнятий! Намагаємося зупинити процес...")
            try:
                # На Windows використовуємо netstat та taskkill
                if sys.platform == 'win32':
                    # Знаходимо PID процесу на порту 3000
                    result = subprocess.run(
                        'netstat -ano | findstr :3000 | findstr LISTENING',
                        shell=True,
                        capture_output=True,
                        text=True
                    )
                    if result.stdout:
                        # Витягуємо PID
                        parts = result.stdout.strip().split()
                        if parts:
                            pid = parts[-1]
                            subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                            print(f"   Зупинено процес з PID {pid}")
                            time.sleep(2)
                else:
                    # На Linux/Mac використовуємо lsof та kill
                    subprocess.run('lsof -ti:3000 | xargs kill -9', shell=True, capture_output=True)
                    time.sleep(2)
            except:
                pass
        
        # Завантажуємо змінні з env-config/ для запуску
        print("📝 Завантаження змінних оточення для запуску frontend...")
        root_dir = Path.cwd()
        env_files = [
            root_dir / "env-config" / ".env.base",
            root_dir / "env-config" / ".env.secrets",
            root_dir / "env-config" / ".env.local",
        ]
        
        for env_file in env_files:
            if env_file.exists():
                load_dotenv(env_file, override=True)
        
        env = os.environ.copy()
        env['NODE_ENV'] = 'production'
        env['IS_DOCKER'] = 'false'
        env['NEXT_PUBLIC_IS_DOCKER'] = 'false'
        
        # Встановлюємо значення за замовчуванням для критичних змінних якщо вони не встановлені
        if 'NEXT_PUBLIC_BACKEND_URL' not in env or not env['NEXT_PUBLIC_BACKEND_URL']:
            env['NEXT_PUBLIC_BACKEND_URL'] = 'http://localhost/api'
            print_warning("⚠️  NEXT_PUBLIC_BACKEND_URL не знайдено, встановлюємо за замовчуванням: http://localhost/api")
        
        if 'BACKEND_URL' not in env or not env['BACKEND_URL']:
            env['BACKEND_URL'] = 'http://localhost:8000'
            print_warning("⚠️  BACKEND_URL не знайдено, встановлюємо за замовчуванням: http://localhost:8000")
        
        # Виводимо критичні змінні для перевірки
        print("🔧 Змінні оточення для запуску:")
        print(f"   NODE_ENV: {env.get('NODE_ENV', 'NOT_SET')}")
        print(f"   NEXT_PUBLIC_BACKEND_URL: {env.get('NEXT_PUBLIC_BACKEND_URL', 'NOT_SET')}")
        print(f"   BACKEND_URL: {env.get('BACKEND_URL', 'NOT_SET')}")
        print(f"   IS_DOCKER: {env.get('IS_DOCKER', 'NOT_SET')}")
        print(f"   NEXT_PUBLIC_IS_DOCKER: {env.get('NEXT_PUBLIC_IS_DOCKER', 'NOT_SET')}")
        print()
        
        print("🔨 Запуск npm run start...")
        # Запускаємо в фоновому режимі, але з можливістю бачити вивід
        # На Windows використовуємо CREATE_NEW_PROCESS_GROUP
        creationflags = 0
        if sys.platform == 'win32':
            creationflags = subprocess.CREATE_NEW_PROCESS_GROUP
        
        frontend_process = subprocess.Popen(
            "npm run start",
            shell=True,
            cwd=frontend_dir,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=creationflags
        )
        
        print_success(f"✅ Процес frontend запущено (PID: {frontend_process.pid})")
        
        # Перевіряємо, що процес дійсно запустився
        time.sleep(2)
        if frontend_process.poll() is not None:
            # Процес вже завершився - це погано
            print_error(f"❌ Процес frontend завершився відразу! (код: {frontend_process.returncode})")
            try:
                output = frontend_process.stdout.read().decode('utf-8', errors='ignore')
                if output:
                    print(f"Вивід процесу:\n{output[:500]}")
            except:
                pass
            sys.exit(1)
        
        # Чекаємо готовності frontend з більш детальною перевіркою
        print("⏳ Очікування готовності frontend (до 90 секунд)...")
        max_wait = 90
        wait_interval = 3
        waited = 0
        frontend_ready = False
        
        while waited < max_wait:
            time.sleep(wait_interval)
            waited += wait_interval
            
            # Перевіряємо, що процес ще працює
            if frontend_process.poll() is not None:
                print_error(f"❌ Процес frontend завершився! (код: {frontend_process.returncode})")
                try:
                    output = frontend_process.stdout.read().decode('utf-8', errors='ignore')
                    if output:
                        print(f"Останній вивід:\n{output[-500:]}")
                except:
                    pass
                sys.exit(1)
            
            # Перевіряємо доступність через HTTP
            try:
                import urllib.request
                response = urllib.request.urlopen('http://localhost:3000', timeout=3)
                if response.getcode() == 200:
                    frontend_ready = True
                    print_success(f"✅ Frontend готовий та відповідає! (через {waited} секунд)")
                    break
            except urllib.error.URLError:
                pass  # Сервер ще не готовий
            except Exception as e:
                pass  # Інші помилки
            
            # Перевіряємо порт через socket (швидше ніж HTTP)
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                port_open = (sock.connect_ex(('localhost', 3000)) == 0)
                sock.close()
                if port_open:
                    print(f"   ✅ Порт 3000 відкритий, перевіряємо HTTP... ({waited}/{max_wait}с)")
                else:
                    print(f"   ⏳ Очікування відкриття порту 3000... ({waited}/{max_wait}с)")
            except:
                print(f"   ⏳ Очікування... ({waited}/{max_wait}с)")
        
        if not frontend_ready:
            # Перевіряємо ще раз перед виведенням попередження
            try:
                import urllib.request
                response = urllib.request.urlopen('http://localhost:3000', timeout=3)
                if response.getcode() == 200:
                    frontend_ready = True
                    print_success("✅ Frontend готовий!")
            except:
                pass
            
            if not frontend_ready:
                print_warning(f"⚠️ Frontend не відповідає після {max_wait} секунд")
                print(f"   Процес все ще працює (PID: {frontend_process.pid})")
                print("   Перевірте логи або спробуйте відкрити http://localhost:3000 вручну")

        # ЕТАП 7: Виведення інформації з посиланнями
        print_step(7, "Виведення інформації з посиланнями")
        
        print()
        print("="*70)
        print(f"{Colors.OKGREEN}{Colors.BOLD}🎉 РОЗГОРТАННЯ ЗАВЕРШЕНО УСПІШНО!{Colors.ENDC}")
        print("="*70)
        print()
        print(f"{Colors.BOLD}🌐 AutoRia Clone готовий до використання!{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}🌟 Основні посилання:{Colors.ENDC}")
        print(f"   🔗 Головна сторінка (через Nginx): {Colors.OKBLUE}http://localhost{Colors.ENDC}")
        print(f"   🔗 Frontend (напряму): {Colors.OKBLUE}http://localhost:3000{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}📋 Backend сервіси:{Colors.ENDC}")
        print(f"   🔗 Backend API: {Colors.OKBLUE}http://localhost:8000/api/{Colors.ENDC}")
        print(f"   🔗 API Docs (Swagger): {Colors.OKBLUE}http://localhost:8000/api/docs/{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}⚙️  Додаткові сервіси:{Colors.ENDC}")
        print(f"   🔗 RabbitMQ Management: {Colors.OKBLUE}http://localhost:15672{Colors.ENDC}")
        print(f"   🔗 Celery Flower: {Colors.OKBLUE}http://localhost:5555{Colors.ENDC}")
        print(f"   🔗 Redis Insight: {Colors.OKBLUE}http://localhost:5540{Colors.ENDC}")
        print(f"   🔗 Mailing Service: {Colors.OKBLUE}http://localhost:8001{Colors.ENDC}")
        print()
        print(f"{Colors.OKCYAN}💡 Статус сервісів:{Colors.ENDC}")
        print(f"   ✅ Frontend: локально в production режимі (порт 3000)")
        print(f"   ✅ Backend: Docker контейнери (порт 8000)")
        print(f"   ✅ Nginx: reverse proxy (порт 80)")
        print()
        print("="*70)
        print()
        print(f"{Colors.WARNING}💡 Примітка:{Colors.ENDC}")
        print(f"   - Frontend працює в production режимі")
        print(f"   - Для зупинки frontend натисніть Ctrl+C або знайдіть процес (PID: {frontend_process.pid})")
        print(f"   - Для перегляду логів Docker: docker-compose -f docker-compose.local.yml logs -f")
        print()

    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}⚠️  Розгортання перервано користувачем{Colors.ENDC}")
        print("🛑 Завершення роботи...")
        sys.exit(130)  # Стандартний код виходу для Ctrl+C
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Критична помилка: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()

