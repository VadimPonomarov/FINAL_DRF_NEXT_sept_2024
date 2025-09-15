#!/usr/bin/env python3
"""
АВТОМАТИЧЕСКИЙ ДЕПЛОЙ AutoRia Clone
===================================

Оптимизированный скрипт для максимально быстрого деплоя с production фронтендом.
Автоматически выполняет все необходимые шаги для достижения максимальной скорости.

Использование:
    python deploy.py --local-frontend

Что делает скрипт:
- Проверяет наличие Node.js и npm
- Устанавливает зависимости фронтенда
- Собирает фронтенд в production режиме
- Запускает оптимизированный деплой
- Проверяет готовность всех сервисов
"""

import os
import sys
import subprocess
import time
import threading
import re
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

def print_warning(message):
    """Виводить попередження"""
    print(f"{Colors.WARNING}[WARNING] {message}{Colors.ENDC}")

def show_progress_bar(current, total, description="", width=50):
    """Показывает прогресс-бар"""
    percent = (current / total) * 100
    filled = int(width * current // total)
    bar = '█' * filled + '░' * (width - filled)
    print(f"\r{Colors.OKCYAN}[{bar}] {percent:.1f}% {description}{Colors.ENDC}", end='', flush=True)
    if current == total:
        print()  # Новая строка в конце

def show_step_progress(step, total_steps, step_name):
    """Показує прогрес виконання етапів"""
    print(f"\n{Colors.OKBLUE}{'='*60}{Colors.ENDC}")
    show_progress_bar(step, total_steps, f"Етап {step}/{total_steps}: {step_name}")
    print(f"{Colors.OKBLUE}{'='*60}{Colors.ENDC}")

def show_service_selection_menu():
    """Показує меню вибору сервісів для збірки та режиму frontend"""
    services = [
        "app", "frontend", "pg", "redis", "redis-insight",
        "rabbitmq", "celery-worker", "celery-beat", "flower", "mailing", "nginx"
    ]

    print("\n" + "="*60)
    print("🔧 МЕНЮ ВИБОРУ РЕЖИМУ РОЗГОРТАННЯ")
    print("="*60)
    print("Оберіть режим розгортання:")
    print()
    print("🏠 ЛОКАЛЬНИЙ FRONTEND:")
    print("0. 🚀 Backend в Docker + Frontend локально (РЕКОМЕНДОВАНО)")
    print()
    print("🐳 ПОВНИЙ DOCKER:")
    print("00. 🌐 Всі сервіси в Docker (включно з Frontend)")
    print()
    print("🎯 ВИБІРКОВИЙ РЕЖИМ:")
    print("-" * 40)

    for i, service in enumerate(services, 1):
        icon = "🌐" if service == "frontend" else "📦"
        note = " (буде в Docker)" if service == "frontend" else ""
        print(f"{i:2}. {icon} {service}{note}")

    print("-" * 40)
    print("💡 Підказки:")
    print("  2  - тільки frontend в Docker")
    print("  1,3,4 - вибрані сервіси (наприклад: app+pg+redis)")
    print("  0/00 - швидкий вибір всіх режимів")

    while True:
        try:
            choice = input("\nВаш вибір: ").strip()

            if choice == "0":
                # Backend в Docker + Frontend локально
                backend_services = [s for s in services if s != "frontend"]
                return backend_services, "local"

            if choice == "00":
                # Всі сервіси в Docker
                return services, "docker"

            if not choice:
                print("❌ Будь ласка, введіть номери сервісів")
                continue

            # Парсимо вибір користувача
            selected_indices = []
            for part in choice.split(","):
                part = part.strip()
                if part.isdigit():
                    idx = int(part)
                    if 1 <= idx <= len(services):
                        selected_indices.append(idx - 1)
                    else:
                        print(f"❌ Номер {idx} поза діапазоном (1-{len(services)})")
                        raise ValueError()
                else:
                    print(f"❌ '{part}' не є числом")
                    raise ValueError()

            if not selected_indices:
                print("❌ Не обрано жодного сервісу")
                continue

            selected_services = [services[i] for i in selected_indices]

            # Визначаємо режим frontend
            if "frontend" in selected_services:
                frontend_mode = "docker"
                print(f"\n✅ Обрано сервіси: {', '.join(selected_services)}")
                print("🌐 Frontend буде запущено в Docker контейнері")
            else:
                frontend_mode = "local"
                print(f"\n✅ Обрано сервіси: {', '.join(selected_services)}")
                print("🏠 Frontend буде запущено локально")

            confirm = input("Продовжити? (y/n): ").strip().lower()

            if confirm in ['y', 'yes', 'так', 'т']:
                return selected_services, frontend_mode
            else:
                print("Оберіть знову:")
                continue

        except (ValueError, KeyboardInterrupt):
            print("Спробуйте ще раз:")
            continue

def auto_fix_build_errors(service_name, error_log):
    """Автоматично виправляє поширені помилки збірки"""
    fixes_applied = []

    if not error_log:
        return fixes_applied

    error_lower = error_log.lower()

    # Виправлення 1: Проблеми з правами доступу
    if "permission denied" in error_lower or "access denied" in error_lower:
        try:
            # Спробуємо виправити права доступу
            if os.name != 'nt':  # Unix/Linux
                subprocess.run(["sudo", "chmod", "-R", "755", "."], check=True)
                fixes_applied.append("Виправлено права доступу")
        except:
            pass

    # Виправлення 2: Проблеми з кешем Docker
    if "cache" in error_lower or "layer" in error_lower:
        try:
            subprocess.run(["docker", "system", "prune", "-f"], check=True)
            fixes_applied.append("Очищено кеш Docker")
        except:
            pass

    # Виправлення 3: Проблеми з мережею
    if "network" in error_lower or "connection" in error_lower or "timeout" in error_lower:
        try:
            subprocess.run(["docker", "network", "prune", "-f"], check=True)
            fixes_applied.append("Очищено мережі Docker")
        except:
            pass

    # Виправлення 4: Проблеми з залежностями Python
    if service_name in ["app", "celery-worker", "celery-beat", "flower", "mailing"]:
        if "requirements" in error_lower or "pip" in error_lower:
            try:
                # Оновлюємо pip в контейнері
                fixes_applied.append("Спроба оновлення pip")
            except:
                pass

    # Виправлення 5: Проблеми з Node.js
    if service_name == "frontend":
        if "npm" in error_lower or "node" in error_lower:
            try:
                # Очищаємо npm кеш
                if os.path.exists("frontend/node_modules"):
                    import shutil
                    shutil.rmtree("frontend/node_modules")
                    fixes_applied.append("Видалено node_modules")

                if os.path.exists("frontend/package-lock.json"):
                    os.remove("frontend/package-lock.json")
                    fixes_applied.append("Видалено package-lock.json")
            except:
                pass

    # Виправлення 6: Проблеми з портами
    if "port" in error_lower or "bind" in error_lower:
        try:
            # Зупиняємо всі контейнери що можуть використовувати порти
            subprocess.run(["docker-compose", "down"], check=True)
            fixes_applied.append("Зупинено конфліктуючі контейнери")
        except:
            pass

    return fixes_applied

def run_docker_build_with_progress(selected_services=None):
    """Запускає docker-compose build з відстеженням прогресу для кожного сервісу (послідовно, без паралелі)"""

    # Флаг для зупинки збірки
    stop_build_flag = threading.Event()

    all_services = {
        "app": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "frontend": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "pg": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "redis": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "redis-insight": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "rabbitmq": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "celery-worker": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "celery-beat": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "flower": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "mailing": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""},
        "nginx": {"progress": 0, "status": "⏳ Очікування", "log_msg": "", "lock": threading.Lock(), "error_log": ""}
    }

    # Якщо не вказано конкретні сервіси, використовуємо всі
    if selected_services is None:
        selected_services = list(all_services.keys())

    # Фільтруємо тільки обрані сервіси
    services = {name: data for name, data in all_services.items() if name in selected_services}

    # Для не обраних сервісів встановлюємо статус "Пропущено"
    for name, data in all_services.items():
        if name not in selected_services:
            data["status"] = "⏭️ Пропущено"
            data["progress"] = 0

    display_lock = threading.Lock()

    def get_log_color_and_icon(log_msg):
        """Повертає колір та іконку для лог повідомлення"""
        if not log_msg:
            return "", ""

        log_lower = log_msg.lower()
        if any(word in log_lower for word in ["error", "failed", "fatal", "exception"]):
            return "\033[91m", "🔴"  # Червоний для помилок
        elif any(word in log_lower for word in ["warning", "warn", "deprecated"]):
            return "\033[93m", "🟡"  # Жовтий для попереджень
        elif any(word in log_lower for word in ["info", "installing", "downloading"]):
            return "\033[94m", "🔵"  # Синій для інформації
        else:
            return "\033[90m", "⚪"  # Сірий для звичайних повідомлень

    # Глобальна змінна для відстеження останнього стану кожного сервісу
    last_service_state = {}
    progress_header_shown = False
    services_positions = {}  # Позиції рядків для кожного сервісу

    def update_all_services():
        """Оновлює відображення всіх сервісів (потокобезпечно) - тільки змінені"""
        nonlocal progress_header_shown, last_service_state, services_positions

        with display_lock:
            # Показуємо заголовок тільки один раз
            if not progress_header_shown:
                print(f"\n📦 Збірка Docker образів ({len(selected_services)} сервісів)...")
                print()

                # Ініціалізуємо початкові рядки для всіх сервісів
                line_number = 0
                for service, data in all_services.items():
                    with data["lock"]:
                        progress_bar = "█" * int(data["progress"] / 10) + "░" * (10 - int(data["progress"] / 10))
                        base_line = f"🔨 {service:15} [{progress_bar}] {data['progress']:3.0f}% {data['status']}"

                        if data["log_msg"]:
                            color, icon = get_log_color_and_icon(data["log_msg"])
                            log_part = f" {icon} {color}{data['log_msg'][:50]}\033[0m"
                            line = base_line + log_part
                        else:
                            line = base_line

                        print(line)
                        services_positions[service] = line_number
                        last_service_state[service] = {
                            "progress": data["progress"],
                            "status": data["status"],
                            "log_msg": data["log_msg"]
                        }
                        line_number += 1

                progress_header_shown = True
                return

            # Оновлюємо тільки змінені сервіси
            for service, data in all_services.items():
                with data["lock"]:
                    current_state = {
                        "progress": data["progress"],
                        "status": data["status"],
                        "log_msg": data["log_msg"]
                    }

                    # Перевіряємо чи змінився стан
                    if service not in last_service_state or last_service_state[service] != current_state:
                        # Переміщуємося до рядка цього сервісу
                        current_line = services_positions[service]
                        lines_to_move = len(services_positions) - current_line

                        # Піднімаємося до потрібного рядка
                        print(f"\033[{lines_to_move}A", end='')

                        # Очищаємо рядок та виводимо новий
                        progress_bar = "█" * int(data["progress"] / 10) + "░" * (10 - int(data["progress"] / 10))
                        base_line = f"🔨 {service:15} [{progress_bar}] {data['progress']:3.0f}% {data['status']}"

                        if data["log_msg"]:
                            color, icon = get_log_color_and_icon(data["log_msg"])
                            log_part = f" {icon} {color}{data['log_msg'][:50]}\033[0m"
                            line = base_line + log_part
                        else:
                            line = base_line

                        print(f"\r{line}\033[K", end='')

                        # Повертаємося в кінець
                        print(f"\033[{lines_to_move}B", end='')

                        # Оновлюємо збережений стан
                        last_service_state[service] = current_state.copy()

    def extract_important_log(line):
        """Витягує важливі частини з лог рядка"""
        line = line.strip()

        # Видаляємо ANSI коди
        import re
        line = re.sub(r'\033\[[0-9;]*m', '', line)

        # Шукаємо важливі повідомлення
        if any(word in line.lower() for word in ["error", "failed", "fatal", "exception"]):
            # Витягуємо текст після "ERROR:" або подібного
            for pattern in [r"ERROR:?\s*(.+)", r"FAILED:?\s*(.+)", r"FATAL:?\s*(.+)"]:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            return line

        elif any(word in line.lower() for word in ["warning", "warn", "deprecated"]):
            # Витягуємо текст після "WARNING:" або подібного
            for pattern in [r"WARNING:?\s*(.+)", r"WARN:?\s*(.+)", r"DEPRECATED:?\s*(.+)"]:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            return line

        elif any(word in line.lower() for word in ["installing", "downloading", "building"]):
            # Витягуємо корисну інформацію про процес
            if "installing" in line.lower():
                match = re.search(r"installing\s+(.+)", line, re.IGNORECASE)
                if match:
                    return f"Installing {match.group(1).strip()}"
            elif "downloading" in line.lower():
                return "Downloading dependencies..."
            elif "building" in line.lower():
                return "Building..."

        return ""

    def build_single_service(service_name, retry_count=0):
        """Збирає окремий сервіс з автоматичним виправленням помилок"""
        max_retries = 2

        # Перевіряємо чи не було переривання
        if stop_build_flag.is_set():
            return False

        try:
            # Оновлюємо статус на "Збірка"
            with services[service_name]["lock"]:
                retry_text = f" (спроба {retry_count + 1})" if retry_count > 0 else ""
                services[service_name]["status"] = f"🔨 Збірка...{retry_text}"
                services[service_name]["progress"] = 10
                services[service_name]["log_msg"] = "Запуск збірки..."
                services[service_name]["error_log"] = ""
            update_all_services()

            # Запускаємо збірку конкретного сервісу
            process = subprocess.Popen(
                ["docker-compose", "build", "--no-cache", service_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            error_lines = []

            # Відстежуємо прогрес
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break

                line = line.strip()

                # Збираємо помилки для подальшого аналізу
                if any(word in line.lower() for word in ["error", "failed", "fatal"]):
                    error_lines.append(line)

                # Витягуємо важливі лог повідомлення
                important_log = extract_important_log(line)

                with services[service_name]["lock"]:
                    old_progress = services[service_name]["progress"]
                    new_progress = old_progress

                    if "WORKDIR" in line or "COPY" in line:
                        new_progress = 30
                        services[service_name]["log_msg"] = "Копіювання файлів..."
                    elif "RUN" in line:
                        new_progress = 60
                        services[service_name]["log_msg"] = "Виконання команд..."
                    elif "EXPOSE" in line or "CMD" in line:
                        new_progress = 90
                        services[service_name]["log_msg"] = "Фінальна конфігурація..."
                    elif "Successfully built" in line or "Successfully tagged" in line:
                        new_progress = 100
                        services[service_name]["status"] = "✅ Готово"
                        services[service_name]["log_msg"] = "Збірка завершена успішно"

                    # Оновлюємо лог повідомлення якщо знайшли щось важливе
                    if important_log:
                        services[service_name]["log_msg"] = important_log

                    if new_progress > old_progress:
                        services[service_name]["progress"] = new_progress

                update_all_services()
                time.sleep(0.1)

            # Чекаємо завершення процесу
            return_code = process.wait()

            # Якщо збірка не вдалася і є спроби
            if return_code != 0 and retry_count < max_retries:
                error_log = " ".join(error_lines)

                with services[service_name]["lock"]:
                    services[service_name]["status"] = "🔧 Виправлення..."
                    services[service_name]["log_msg"] = "Спроба автоматичного виправлення..."
                    services[service_name]["error_log"] = error_log
                update_all_services()

                # Спробуємо автоматично виправити помилки
                fixes = auto_fix_build_errors(service_name, error_log)

                if fixes:
                    with services[service_name]["lock"]:
                        services[service_name]["log_msg"] = f"Застосовано: {', '.join(fixes)}"
                    update_all_services()
                    time.sleep(2)

                    # Повторна спроба збірки
                    return build_single_service(service_name, retry_count + 1)

            # Фінальне оновлення
            with services[service_name]["lock"]:
                if return_code == 0:
                    services[service_name]["progress"] = 100
                    services[service_name]["status"] = "✅ Готово"
                    services[service_name]["log_msg"] = "Збірка завершена успішно"
                else:
                    services[service_name]["status"] = "❌ Помилка"
                    services[service_name]["log_msg"] = f"Збірка не вдалася (код {return_code})"
                    if error_lines:
                        services[service_name]["error_log"] = " ".join(error_lines[-3:])  # Останні 3 помилки

            update_all_services()
            return return_code == 0

        except Exception as e:
            with services[service_name]["lock"]:
                services[service_name]["status"] = "❌ Помилка"
                services[service_name]["log_msg"] = f"Exception: {str(e)[:30]}"
            update_all_services()
            return False

    # Послідовна збірка обраних сервісів у фіксованому порядку
    try:
        for service_name in selected_services:
            ok = build_single_service(service_name)
            if not ok:
                # Продовжуємо будувати інші сервіси, але запам'ятовуємо помилки для підсумку
                pass
            time.sleep(0.1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}⚠️  Переривання користувачем...{Colors.ENDC}")
        print("🛑 Зупинка процесу збірки...")
        stop_build_flag.set()
        print("❌ Збірка перервана користувачем")
        return False

    # Переміщуємося в кінець блоку
    with display_lock:
        print(f"\033[{len(all_services)}B")
        print("✅ Збірка образів завершена!")

    # Перевіряємо чи всі обрані сервіси зібралися успішно
    success_count = sum(1 for name, data in all_services.items()
                       if name in selected_services and "✅" in data["status"])
    selected_count = len(selected_services)

    print(f"📊 Результат: {success_count}/{selected_count} обраних сервісів зібрано успішно")

    # Показуємо помилки якщо є
    failed_services = [name for name, data in all_services.items()
                      if name in selected_services and "❌" in data["status"]]

    if failed_services:
        print(f"❌ Сервіси з помилками: {', '.join(failed_services)}")
        for service in failed_services:
            if all_services[service]["error_log"]:
                print(f"   {service}: {all_services[service]['error_log'][:100]}...")

    return success_count == selected_count

def check_services_health():
    """Перевіряє статус та здоров'я всіх сервісів"""
    print("\n🔍 Перевірка статусу сервісів...")

    # Отримуємо статус контейнерів
    result = subprocess.run(
        ["docker-compose", "ps", "--format", "json"],
        capture_output=True,
        text=True
    )

    services_status = {}
    if result.returncode == 0:
        try:
            import json
            containers = json.loads(result.stdout) if result.stdout.strip() else []
            if not isinstance(containers, list):
                containers = [containers]

            for container in containers:
                service_name = container.get("Service", "unknown")
                state = container.get("State", "unknown")
                health = container.get("Health", "")

                # Визначаємо статус
                if state == "running":
                    if health == "healthy" or not health:
                        status = "✅ Healthy"
                    elif health == "unhealthy":
                        status = "❌ Unhealthy"
                    else:
                        status = "⏳ Starting"
                else:
                    status = f"❌ {state}"

                services_status[service_name] = status
        except:
            # Fallback до простої перевірки
            pass

    # Виводимо підсумковий статус
    print("\n📊 Підсумковий статус сервісів (Health Check):")
    print("=" * 50)

    expected_services = ["app", "pg", "redis", "redis-insight", "rabbitmq",
                        "celery-worker", "celery-beat", "flower", "mailing", "nginx"]

    for service in expected_services:
        if service in services_status:
            status = services_status[service]
        else:
            # Перевіряємо чи контейнер взагалі існує
            check_result = subprocess.run(
                ["docker", "ps", "-f", f"name={service}", "--format", "{{.Status}}"],
                capture_output=True,
                text=True
            )
            if check_result.returncode == 0 and check_result.stdout.strip():
                if "Up" in check_result.stdout:
                    status = "✅ Running"
                else:
                    status = "❌ Stopped"
            else:
                status = "⚠️  Not found"

        print(f"🔧 {service:15} {status}")

    print("=" * 50)

    # Підраховуємо статистику
    healthy_count = sum(1 for status in services_status.values() if "✅" in status)
    total_count = len(expected_services)

    if healthy_count == total_count:
        print(f"🎉 Всі сервіси ({healthy_count}/{total_count}) працюють нормально!")
        print("✅ Система готова до використання!")
        print()
        print("🌐 " + "="*50)
        print("🚀 AutoRia Clone готовий до використання!")
        print("🔗 Перейдіть за посиланням: http://localhost:3000")
        print("="*53)
        return True
    else:
        print(f"⚠️  Працює {healthy_count}/{total_count} сервісів. Перевірте проблемні сервіси.")
        print("🔧 Рекомендується перевірити логи проблемних сервісів")
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
            # Показываем вывод в реальном времени
            print(f"Выполняется: {command}")
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
    show_step_progress(1, 4, "Перевірка системних вимог")

    # Перевірка Node.js
    show_progress_bar(1, 3, "Перевірка Node.js...")
    result = run_command("node --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"Node.js: {result.stdout.strip()}")
    else:
        print_error("Node.js не знайдено! Встановіть Node.js 18+")
        return False

    # Перевірка npm
    show_progress_bar(2, 3, "Перевірка npm...")
    result = run_command("npm --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"npm: {result.stdout.strip()}")
    else:
        print_error("npm не знайдено!")
        return False

    # Перевірка Docker
    show_progress_bar(3, 3, "Перевірка Docker...")
    result = run_command("docker --version", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success(f"Docker: {result.stdout.strip()}")
    else:
        print_error("Docker не знайдено!")
        return False
    
    print_success("Всі системні вимоги виконані!")
    return True

def check_project_files():
    """Перевіряє наявність необхідних файлів проекту"""
    show_step_progress(2, 4, "Перевірка файлів проекту")

    required_files = [
        "docker-compose.yml",
        "backend/Dockerfile",
        "frontend/Dockerfile",
        "frontend/package.json"
    ]

    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)

    if missing_files:
        print_error("Відсутні необхідні файли:")
        for file in missing_files:
            print_error(f"  - {file}")
        return False

    print_success("Всі необхідні файли знайдені")

    # Перевіряємо .env файли
    env_files = [
        "backend/.env",
        "frontend/.env.local"
    ]

    for env_file in env_files:
        if not Path(env_file).exists():
            print_warning(f"Файл оточення {env_file} не знайдено")
        else:
            print_success(f"Файл оточення {env_file} знайдено")

    return True

def build_frontend():
    """Збирає фронтенд в production режимі"""
    show_step_progress(4, 4, "Збірка фронтенда в PRODUCTION режимі")

    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print_error("Папка frontend не знайдена!")
        return False

    # Встановлення залежностей
    show_progress_bar(1, 4, "📦 Встановлення залежностей...")
    result = run_command("npm install --legacy-peer-deps", cwd=frontend_dir, capture_output=False)
    if not result:
        return False
    print_success("Залежності встановлені")

    # Очищаємо порт 3000 перед збіркою
    show_progress_bar(2, 4, "🧹 Очищення порту 3000...")
    run_command("npm run kill 3000", cwd=frontend_dir, check=False, capture_output=False)

    # Перевірка наявності старої збірки
    next_dir = frontend_dir / ".next"
    if next_dir.exists():
        show_progress_bar(3, 4, "🗑️ Видалення старої збірки...")
        run_command("rm -rf .next", cwd=frontend_dir, check=False, capture_output=False)

    # Production збірка
    show_progress_bar(4, 4, "🔨 Збірка в production режимі...")
    print("⏳ Збірка фронтенда може зайняти 2-3 хвилини...")

    try:
        # Запускаємо збірку з повним захопленням виводу та без інтерактивності
        process = subprocess.Popen(
            "npm run build",
            shell=True,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,  # Блокуємо stdin щоб уникнути інтерактивних запитів
            text=True
        )

        stdout, stderr = process.communicate()

        if process.returncode != 0:
            print_error("Помилка збірки фронтенда!")
            if stderr:
                print(f"Помилка: {stderr}")
            return False
        else:
            print_success("Збірка завершена успішно!")

    except KeyboardInterrupt:
        print_warning("\n⚠️ Збірка перервана користувачем!")
        if 'process' in locals():
            process.terminate()
        return False
    
    # Перевірка успішності збірки
    if next_dir.exists():
        print_success("Production збірка завершена успішно!")

        # Показуємо розмір збірки
        result = run_command("du -sh .next", cwd=frontend_dir, check=False, capture_output=True)
        if result and result.returncode == 0:
            print_success(f"Розмір збірки: {result.stdout.strip()}")

        return True
    else:
        print_error("Збірка не створена! Перевірте помилки вище.")
        return False

def comment_frontend_service(comment=True):
    """Комментирует или раскомментирует frontend сервис в docker-compose.yml"""
    compose_file = Path("docker-compose.yml")
    if not compose_file.exists():
        return False

    with open(compose_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_frontend_section = False
    modified_lines = []

    for line in lines:
        if line.strip().startswith('frontend:'):
            in_frontend_section = True
            if comment:
                modified_lines.append(f"  # {line}")
            else:
                modified_lines.append(line.replace('# ', '', 1) if line.strip().startswith('#') else line)
        elif in_frontend_section and (line.startswith('  ') or line.strip() == ''):
            if line.strip() == '' or line.startswith('  # ====='):
                in_frontend_section = False
                modified_lines.append(line)
            else:
                if comment:
                    modified_lines.append(f"  # {line[2:]}" if not line.strip().startswith('#') else line)
                else:
                    modified_lines.append(line.replace('# ', '', 1) if line.strip().startswith('#') else line)
        else:
            in_frontend_section = False
            modified_lines.append(line)

    with open(compose_file, 'w', encoding='utf-8') as f:
        f.writelines(modified_lines)

    return True

def deploy_docker_services():
    """Розгортає сервіси в Docker з повною пересборкою"""

    # Показуємо меню вибору сервісів та режиму frontend
    selected_services, frontend_mode = show_service_selection_menu()

    # Налаштовуємо docker-compose.yml відповідно до режиму frontend
    if frontend_mode == "local":
        show_step_progress(3, 4, "Розгортання backend сервісів в Docker")
        print("🏠 Режим: Backend в Docker + Frontend локально")
        print("Коментування frontend сервісу в docker-compose.yml...")
        comment_frontend_service(comment=True)
    else:  # frontend_mode == "docker"
        show_step_progress(3, 4, "Розгортання всіх сервісів в Docker")
        print("🐳 Режим: Всі сервіси в Docker")
        print("Розкоментування frontend сервісу в docker-compose.yml...")
        comment_frontend_service(comment=False)

    # Перевіряємо наявність docker-compose.yml
    if not Path("docker-compose.yml").exists():
        print_error("Файл docker-compose.yml не знайдено!")
        return False

    # ПОВНЕ ОЧИЩЕННЯ - емулюємо розгортання з нуля
    show_progress_bar(1, 6, "🧹 Зупинка та видалення контейнерів...")
    run_command("docker-compose down --volumes --remove-orphans", check=False, capture_output=False)

    show_progress_bar(2, 6, "🧹 Видалення старих образів...")
    run_command("docker image prune -f", check=False, capture_output=False)

    show_progress_bar(3, 6, "🧹 Очищення невикористаних томів...")
    run_command("docker volume prune -f", check=False, capture_output=False)

    # СТВОРЕННЯ ТА ЗБІРКА ВСІХ КОНТЕЙНЕРІВ З НУЛЯ
    show_progress_bar(4, 6, "🔨 Збірка всіх образів...")

    # Запускаємо збірку з відстеженням прогресу для обраних сервісів
    if not run_docker_build_with_progress(selected_services):
        print_error("Не вдалося зібрати деякі Docker образи!")

        # Пропонуємо повторну спробу для проблемних сервісів
        retry = input("\n🔄 Спробувати пересібрати проблемні сервіси? (y/n): ").strip().lower()
        if retry in ['y', 'yes', 'так', 'т']:
            # Тут можна додати логіку повторної збірки тільки проблемних сервісів
            pass
        return None

    print_success("Всі обрані образи зібрані успішно!")

    show_progress_bar(5, 6, "🚀 Запуск всіх контейнерів...")

    print("\n🚀 Запуск сервісів...")

    # Запускаємо контейнери з захопленням виводу (без дублювання)
    result = run_command("docker-compose up -d --force-recreate", capture_output=True)
    if not result:
        print_error("Не вдалося запустити Docker сервіси!")
        return False

    print_success("Всі контейнери запущені!")

    # Чекаємо готовності сервісів
    show_progress_bar(6, 6, "⏳ Очікування готовності сервісів...")

    print("\n⏳ Очікування готовності сервісів:")
    wait_time = 20
    for i in range(wait_time):
        progress = (i + 1) / wait_time * 100
        show_progress_bar(i+1, wait_time, f"⏳ Ініціалізація сервісів ({i+1}/{wait_time} сек)")
        time.sleep(1)

    # Ініціалізуємо проект з тестовими даними (включаючи користувачів)
    print("\n🌱 Ініціалізація проекту з тестовими даними...")
    print("📊 Створення тестових користувачів для dropdown...")

    try:
        result = run_command(
            "docker-compose exec -T app python manage.py init_project_data --verbosity=2",
            capture_output=True
        )
        if result and result.returncode == 0:
            print_success("✅ Тестові дані створені успішно!")
            print("👥 Користувачі доступні для dropdown в frontend")
        else:
            print_warning("⚠️ Помилка створення тестових даних")
            if result and result.stderr:
                print(f"Помилка: {result.stderr}")
    except Exception as e:
        print_warning(f"⚠️ Не вдалося створити тестові дані: {e}")
        print("💡 Dropdown може бути порожнім")

    # Перевіряємо статус та здоров'я сервісів
    services_healthy = check_services_health()

    if services_healthy:
        print_success("Docker сервіси повністю розгорнуті з нуля!")
    else:
        print_warning("Docker сервіси розгорнуті, але деякі можуть потребувати додatkової перевірки.")

    return frontend_mode

def deploy_full_docker():
    """Полное развертывание в Docker включая фронтенд"""
    print_step(4, "Запуск фронтенда в Docker")

    # Запускаем фронтенд в Docker
    if not run_command("docker-compose up -d frontend", capture_output=True):
        print_warning("Не удалось запустить фронтенд в Docker")
        return False

    print_success("Фронтенд запущен в Docker!")
    return True

def start_local_frontend():
    """Запускає локальний фронтенд в production режимі"""
    print_step(4, "ТРЕТІЙ ЕТАП: Запуск оптимізованого локального фронтенда")

    frontend_dir = Path("frontend")
    next_dir = frontend_dir / ".next"

    if not next_dir.exists():
        print_error("Production збірка не знайдена! Спочатку виконайте npm run build")
        return False

    # Очищаємо порт 3000 перед запуском
    print("Очищення порту 3000...")
    run_command("npm run kill 3000", cwd=frontend_dir, check=False)

    print("🚀 Запуск в production режимі...")
    print("🌐 URL: http://localhost:3000")
    print("⚠️  Для зупинки натисніть Ctrl+C")
    print()

    # Запускаємо в production режимі
    try:
        subprocess.run("npm run start", shell=True, cwd=frontend_dir)
    except KeyboardInterrupt:
        print_success("\n✅ Локальний фронтенд зупинено")
    
    return True

def check_services():
    """Перевіряє готовність сервісів"""
    print_step(5, "Перевірка готовності сервісів")

    result = run_command("python monitor_services.py --detailed", check=False, capture_output=True)
    if result and result.returncode == 0:
        print_success("Всі сервіси готові!")
        return True
    else:
        print_warning("Деякі сервіси можуть бути не готові. Запустіть monitor_services.py для деталей.")
        return False

def main():
    """Головна функція"""
    try:
        # Устанавливаем кодировку для Windows
        if sys.platform == "win32":
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

        print(f"{Colors.HEADER}{Colors.BOLD}")
        print("ПОВНИЙ АВТОМАТИЧНИЙ ДЕПЛОЙ AutoRia Clone")
        print("=" * 50)
        print("🚀 ЕМУЛЯЦІЯ РОЗГОРТАННЯ З НУЛЯ (як після git clone)")
        print(f"{Colors.ENDC}")

        print("📋 План розгортання:")
        print("   1️⃣  Перевірка системних вимог")
        print("   1️⃣.5️⃣ Перевірка файлів проекту")
        print("   2️⃣  Вибір режиму та збірка Docker сервісів")
        print("   3️⃣  Збірка фронтенда (якщо локальний режим)")
        print("   4️⃣  Запуск системи")
        print()

        # ЭТАП 1: Проверка системных требований
        if not check_requirements():
            sys.exit(1)

        # ЭТАП 1.5: Проверка файлов проекта
        if not check_project_files():
            sys.exit(1)

        # ЭТАП 2: Развертывание сервисов в Docker (ПЕРВЫМ ДЕЛОМ!)
        # Функция deploy_docker_services() теперь сама определяет режим через меню
        frontend_mode = deploy_docker_services()
        if frontend_mode is None:  # Ошибка развертывания
            sys.exit(1)

        # ЭТАП 3: Сборка фронтенда в production режиме (ПОСЛЕ Docker)
        if frontend_mode == "local":
            if not build_frontend():
                sys.exit(1)

        # ЭТАП 4: Финальный запуск
        if frontend_mode == "local":
            print()
            print_success("Всі Docker сервіси запущені!")

            # Перевіряємо здоров'я backend сервісів перед запуском фронтенда
            print("🔍 Перевірка готовності backend сервісів...")
            services_healthy = check_services_health()

            if services_healthy:
                print("ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда...")
                start_local_frontend()
            else:
                print_warning("⚠️ Деякі backend сервіси не готові. Фронтенд може працювати некоректно.")
                print("🔧 Рекомендується перевірити логи проблемних сервісів перед використанням.")
                print()
                print("🌐 " + "="*50)
                print("🚀 AutoRia Clone запущений (з попередженнями)")
                print("🔗 Перейдіть за посиланням: http://localhost:3000")
                print("="*53)
        else:  # frontend_mode == "docker"
            check_services()
            print()
            print_success("ПОВНИЙ ДЕПЛОЙ В DOCKER ЗАВЕРШЕНО!")
            print("Доступні URL:")
            print("   - http://localhost - Головний UI (через nginx)")
            print("   - http://localhost:3000 - Frontend (Docker)")
            print("   - http://localhost/api/ - Backend API")
            print("   - http://localhost/admin/ - Django Admin")
            print("   - http://localhost/rabbitmq/ - RabbitMQ Management")
            print("   - http://localhost/flower/ - Celery Flower")
            print("   - http://localhost/redis/ - Redis Insight")

    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}⚠️  Розгортання перервано користувачем{Colors.ENDC}")
        print("🛑 Завершення роботи...")
        sys.exit(130)  # Стандартний код виходу для Ctrl+C
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Критична помилка: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
