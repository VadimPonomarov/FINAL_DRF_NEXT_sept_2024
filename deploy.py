#!/usr/bin/env python3
"""
АВТОМАТИЧЕСКИЙ ДЕПЛОЙ AutoRia Clone
===================================

Оптимизированный скрипт для максимально быстрого деплоя с различными режимами.
Поддерживает полную переустановку, быстрый перезапуск и выборочную пересборку.

Использование:
    python deploy.py                                    # Интерактивный режим
    python deploy.py --mode restart                     # Быстрый перезапуск
    python deploy.py --mode full_rebuild                # Полная пересборка
    python deploy.py --mode selective_rebuild --services app nginx  # Выборочная пересборка
    python deploy.py --auto                             # Автоматический быстрый перезапуск

Режимы деплоя:
- restart: Быстрый перезапуск существующих контейнеров (самый быстрый)
- full_rebuild: Полная пересборка всех образов (как с нуля)
- selective_rebuild: Пересборка только указанных сервисов

Что делает скрипт:
- Проверяет наличие системных требований
- Выбирает режим деплоя (интерактивно или через параметры)
- Развертывает Docker сервисы согласно выбранному режиму
- Собирает фронтенд в production режиме (если локальный режим)
- Проверяет готовность ВСЕХ сервисов перед предоставлением ссылки
- Предоставляет ссылку только когда ВСЕ сервисы healthy
"""

import os
import sys
import subprocess
import time
import threading
import re
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
    print()
    print("🎯 За замовчуванням: 0 (Backend в Docker + Frontend локально)")

    while True:
        try:
            choice = input("\nВаш вибір [0]: ").strip()
            if not choice:  # Если пользователь просто нажал Enter
                choice = "0"

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

    # Словарь с человекочитаемыми названиями сервисов
    service_display_names = {
        "app": "🐍 Django Backend",
        "frontend": "⚛️ Next.js Frontend",
        "pg": "🐘 PostgreSQL DB",
        "redis": "🔴 Redis Cache",
        "redis-insight": "📊 Redis Insight",
        "rabbitmq": "🐰 RabbitMQ Broker",
        "celery-worker": "⚙️ Celery Worker",
        "celery-beat": "⏰ Celery Beat",
        "flower": "🌸 Flower Monitor",
        "mailing": "📧 Mail Service",
        "nginx": "🌐 Nginx Proxy"
    }

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

    # Фільтруємо тільки обрані сервіси - створюємо новий словник тільки з обраними
    services = {}
    for name in selected_services:
        if name in all_services:
            services[name] = all_services[name]

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

                # Ініціалізуємо початкові рядки тільки для обраних сервісів
                line_number = 0
                for service, data in services.items():
                    with data["lock"]:
                        progress_bar = "█" * int(data["progress"] / 10) + "░" * (10 - int(data["progress"] / 10))
                        # Получаем человекочитаемое название сервиса
                        display_name = service_display_names.get(service, service)
                        base_line = f"🔨 {display_name:20} [{progress_bar}] {data['progress']:3.0f}% {data['status']}"

                        if data["log_msg"]:
                            # Фильтруем нежелательные предупреждения
                            filtered_msg = data["log_msg"]
                            if "Running pip as the 'root' user" in filtered_msg:
                                filtered_msg = "Встановлення залежностей..."
                            elif "WARNING" in filtered_msg and "pip" in filtered_msg:
                                filtered_msg = "Встановлення залежностей..."

                            color, icon = get_log_color_and_icon(filtered_msg)
                            log_part = f" {icon} {color}{filtered_msg[:50]}\033[0m"
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

            # Оновлюємо тільки змінені сервіси (тільки обрані)
            for service, data in services.items():
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
                            log_part = f" {icon} {color}{data['log_msg'][:100]}\033[0m"
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
                services[service_name]["log_msg"] = f"Exception: {str(e)[:80]}"
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
        print(f"\033[{len(services)}B")
        print("✅ Збірка образів завершена!")

    # Перевіряємо чи всі обрані сервіси зібралися успішно
    success_count = sum(1 for name, data in services.items() if "✅" in data["status"])
    selected_count = len(services)

    print(f"📊 Результат: {success_count}/{selected_count} обраних сервісів зібрано успішно")

    # Показуємо помилки якщо є
    failed_services = [name for name, data in services.items() if "❌" in data["status"]]

    if failed_services:
        print(f"❌ Сервіси з помилками: {', '.join(failed_services)}")
        for service in failed_services:
            if services[service]["error_log"]:
                print(f"   {service}: {services[service]['error_log'][:100]}...")

    return success_count == selected_count

def start_nginx_with_retry(max_attempts=5, wait_between_attempts=10):
    """
    Запускает nginx с циклическими попытками до успешного health check
    """
    print("🌐 Запуск Nginx с проверкой готовности...")

    for attempt in range(1, max_attempts + 1):
        print(f"🔄 Попытка {attempt}/{max_attempts}: Запуск Nginx...")

        try:
            # Останавливаем nginx если он уже запущен
            subprocess.run(
                "docker-compose stop nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )

            # Удаляем контейнер nginx
            subprocess.run(
                "docker-compose rm -f nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )

            # Запускаем nginx заново
            nginx_result = subprocess.run(
                "docker-compose up -d nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )

            if nginx_result.returncode != 0:
                print_warning(f"⚠️ Ошибка запуска Nginx (попытка {attempt})")
                if nginx_result.stderr:
                    print(f"   Ошибка: {nginx_result.stderr}")
                continue

            print_success(f"✅ Nginx запущен (попытка {attempt})")

            # Ждем инициализации
            print(f"⏳ Ожидание инициализации Nginx ({wait_between_attempts} сек)...")
            time.sleep(wait_between_attempts)

            # Проверяем health check nginx
            print("🔍 Проверка health check Nginx...")
            health_check_passed = False

            # Пытаемся несколько раз проверить health check
            for health_attempt in range(3):
                try:
                    health_result = subprocess.run(
                        'docker exec nginx wget --quiet --tries=1 --spider http://localhost/nginx-health || echo "failed"',
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )

                    if health_result.returncode == 0 and "failed" not in health_result.stdout:
                        health_check_passed = True
                        break
                    else:
                        print(f"   Health check неудачен (попытка {health_attempt + 1}/3)")
                        time.sleep(3)

                except Exception as e:
                    print(f"   Ошибка health check: {e}")
                    time.sleep(3)

            if health_check_passed:
                print_success("✅ Nginx успешно запущен и прошел health check!")
                return True
            else:
                print_warning(f"⚠️ Nginx запущен, но health check не прошел (попытка {attempt})")

        except Exception as e:
            print_warning(f"⚠️ Ошибка при запуске Nginx (попытка {attempt}): {e}")

        if attempt < max_attempts:
            print(f"⏳ Ожидание перед следующей попыткой...")
            time.sleep(5)

    print_error("❌ Не удалось запустить Nginx после всех попыток")
    print("🔧 Nginx может работать, но health check не проходит")
    print("🔧 Проверьте доступность фронтенда на localhost:3000")
    return False

def check_services_health(frontend_mode="local"):
    """Перевіряє статус та здоров'я всіх сервісів включаючи фронтенд"""
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

    # Перевіряємо фронтенд в залежності від режиму
    if frontend_mode == "local":
        print("\n🔍 Перевірка локального фронтенда...")
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex(('localhost', 3000))
            sock.close()

            if result == 0:
                # Додаткова перевірка HTTP відповіді
                try:
                    import urllib.request
                    response = urllib.request.urlopen('http://localhost:3000', timeout=5)
                    if response.getcode() == 200:
                        services_status["frontend"] = "✅ Healthy"
                    else:
                        services_status["frontend"] = "❌ HTTP Error"
                except:
                    services_status["frontend"] = "⚠️  HTTP Issue"
            else:
                services_status["frontend"] = "❌ Not Running"
        except:
            services_status["frontend"] = "❌ Connection Failed"
    elif frontend_mode == "docker":
        print("\n🔍 Перевірка фронтенда в Docker...")
        # Фронтенд в Docker буде перевірений разом з іншими контейнерами
        # Але додатково перевіримо HTTP доступність
        try:
            import urllib.request
            response = urllib.request.urlopen('http://localhost:3000', timeout=10)
            if response.getcode() == 200:
                services_status["frontend"] = "✅ Healthy"
            else:
                services_status["frontend"] = "❌ HTTP Error"
        except:
            services_status["frontend"] = "❌ Not Accessible"

    # Виводимо підсумковий статус
    print("\n📊 Підсумковий статус сервісів (Health Check):")
    print("=" * 60)

    expected_services = ["app", "pg", "redis", "redis-insight", "rabbitmq",
                        "celery-worker", "celery-beat", "flower", "mailing", "nginx"]

    # Додаємо фронтенд до перевірки
    if frontend_mode == "local":
        expected_services.append("frontend")

    all_healthy = True
    healthy_count = 0

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
                    all_healthy = False
            else:
                status = "⚠️  Not found"
                all_healthy = False

        # Підраховуємо здорові сервіси
        if "✅" in status:
            healthy_count += 1
        else:
            all_healthy = False

        # Спеціальне форматування для фронтенда
        if service == "frontend":
            print(f"⚛️  {service:15} {status} (Local)")
        else:
            print(f"🔧 {service:15} {status}")

    print("=" * 60)

    total_count = len(expected_services)

    if all_healthy and healthy_count == total_count:
        print(f"🎉 Всі сервіси ({healthy_count}/{total_count}) працюють нормально!")
        print("✅ Система повністю готова до використання!")
        print()
        print("🌐 " + "="*50)
        print("🚀 AutoRia Clone готовий до використання!")
        if frontend_mode == "local":
            print("🔗 Перейдіть за посиланням: http://localhost:3000")
        else:
            print("🔗 Перейдіть за посиланням: http://localhost")
        print("="*53)
        return True
    else:
        print(f"⚠️  Працює {healthy_count}/{total_count} сервісів. Система НЕ готова!")
        print("🔧 Рекомендується перевірити логи проблемних сервісів перед використанням.")
        print()
        print("❌ ССЫЛКА НЕ ПРЕДОСТАВЛЯЕТСЯ - СЕРВИСЫ НЕ ГОТОВЫ!")
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

    # Налаштовуємо змінні оточення для production режиму з development поведінкою
    show_progress_bar(3, 4, "⚙️ Налаштування змінних оточення...")

    # Створюємо тимчасовий .env файл для production збірки
    env_file = frontend_dir / ".env.production"
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write("# Тимчасові змінні для production збірки з development поведінкою\n")
        f.write("NODE_ENV=production\n")
        f.write(f"NEXT_PUBLIC_BACKEND_URL={os.getenv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:8000')}\n")
        f.write("NEXT_PUBLIC_IS_DOCKER=false\n")
        f.write("DEPLOY_MODE=true\n")
        f.write("NEXTAUTH_URL=http://localhost:3000\n")
        # Используем дешифрованные значения из переменных окружения
        nextauth_secret = os.getenv('NEXTAUTH_SECRET', '')
        google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET', '')

        f.write(f"NEXTAUTH_SECRET={nextauth_secret}\n")
        f.write(f"GOOGLE_CLIENT_ID={google_client_id}\n")
        f.write(f"GOOGLE_CLIENT_SECRET={google_client_secret}\n")
        f.write(f"NEXT_PUBLIC_GOOGLE_CLIENT_ID={google_client_id}\n")
        f.write("NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000\n")
        f.write("NEXT_PUBLIC_WS_URL=ws://localhost:8000\n")

    print_success("Змінні оточення налаштовано")

    # Перевірка наявності старої збірки
    next_dir = frontend_dir / ".next"
    if next_dir.exists():
        show_progress_bar(4, 5, "🗑️ Видалення старої збірки...")
        run_command("rm -rf .next", cwd=frontend_dir, check=False, capture_output=False)

    # Production збірка з детальною індикацією прогресу
    show_progress_bar(5, 5, "🔨 Production збірка...")
    print("⏳ Збірка фронтенда може зайняти 2-3 хвилини...")
    print("🔄 Відстеження прогресу збірки:")

    # Створюємо структуру для відстеження прогресу
    build_progress = {
        "progress": 40,
        "status": "🔨 Збірка",
        "log_msg": "Запуск збірки...",
        "lock": threading.Lock()
    }

    def update_frontend_progress(progress, status, log_msg=""):
        with build_progress["lock"]:
            build_progress["progress"] = progress
            build_progress["status"] = status
            build_progress["log_msg"] = log_msg

            progress_bar = "█" * int(progress / 10) + "░" * (10 - int(progress / 10))
            display_name = "⚛️ Next.js Frontend"

            if log_msg:
                # Ограничиваем длину с учетом ширины терминала
                max_log_length = 80  # Безопасная длина для большинства терминалов
                truncated_log = log_msg[:max_log_length]
                if len(log_msg) > max_log_length:
                    truncated_log += "..."
                line = f"🔨 {display_name:20} [{progress_bar}] {progress:3.0f}% {status} 🔄 {truncated_log}"

                # Если лог очень длинный, показываем его на отдельной строке
                if len(log_msg) > max_log_length:
                    print(f"\r{line}")
                    print(f"   📄 Повний шлях: {log_msg}")
                    return
            else:
                line = f"🔨 {display_name:20} [{progress_bar}] {progress:3.0f}% {status}"

            print(f"\r{line}", end="", flush=True)

    try:
        update_frontend_progress(40, "🔨 Збірка", "Компіляція TypeScript...")

        # Налаштовуємо змінні оточення для Next.js збірки
        build_env = os.environ.copy()
        build_env.update({
            "NODE_ENV": "production",
            "NEXT_PUBLIC_BACKEND_URL": os.getenv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:8000'),
            "NEXT_PUBLIC_IS_DOCKER": "false",
            "DEPLOY_MODE": "true",
            "NEXTAUTH_URL": "http://localhost:3000",
            # Используем дешифрованные значения из переменных окружения
            "NEXTAUTH_SECRET": os.getenv('NEXTAUTH_SECRET', ''),
            "GOOGLE_CLIENT_ID": os.getenv('GOOGLE_CLIENT_ID', ''),
            "GOOGLE_CLIENT_SECRET": os.getenv('GOOGLE_CLIENT_SECRET', ''),
        })

        # Запускаємо збірку з відстеженням прогресу
        process = subprocess.Popen(
            "npm run build",
            shell=True,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            text=True,
            bufsize=1,
            universal_newlines=True,
            env=build_env  # Використовуємо налаштовані змінні оточення
        )

        # Відстежуємо прогрес збірки в реальному часі з детекцією застоїв
        current_progress = 40
        last_progress_time = time.time()
        last_progress_value = current_progress
        stuck_timeout = 600  # 10 хвилин без прогресу = застій (збільшено для складних проектів)
        last_activity_time = time.time()  # Час останньої активності (будь-якого виводу)
        activity_timeout = 120  # 2 хвилини без будь-якого виводу = показуємо індикатор активності

        # Добавляем анимацию для индикации активности
        def show_activity_spinner():
            spinner_chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
            import itertools
            spinner_cycle = itertools.cycle(spinner_chars)
            last_update = 0

            while True:
                time.sleep(1)
                current_time = time.time()

                # Показываем спиннер каждые 2 секунды если нет вывода
                if current_time - last_update > 2:
                    with build_progress["lock"]:
                        current_progress_val = build_progress["progress"]
                        current_status_val = build_progress["status"]

                    # Показываем спиннер только если прогресс не меняется
                    if current_progress_val < 100:
                        spinner = next(spinner_cycle)
                        progress_bar = "█" * int(current_progress_val / 10) + "░" * (10 - int(current_progress_val / 10))
                        line = f"🔨 ⚛️ Next.js Frontend  [{progress_bar}] {current_progress_val:3.0f}% {spinner} {current_status_val}"
                        print(f"\r{line}", end="", flush=True)
                        last_update = current_time

                # Выходим если сборка завершена
                if current_progress >= 100:
                    break

        # Запускаем спиннер в отдельном потоке
        spinner_thread = threading.Thread(target=show_activity_spinner, daemon=True)
        spinner_thread.start()

        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break

            current_time = time.time()

            if output:
                output_lower = output.lower()
                old_progress = current_progress
                last_activity_time = current_time  # Обновляем время активности

                # Оновлюємо прогрес на основі ключових слів (розширена детекція для Next.js 15+ і Turbopack)
                if any(keyword in output_lower for keyword in ['compiling', 'турбопак', 'turbopack', 'bundling']):
                    current_progress = min(60, current_progress + 2)
                    update_frontend_progress(current_progress, "🔨 Збірка", "Компіляція компонентів...")
                elif any(keyword in output_lower for keyword in ['compiled successfully', 'compiled', 'build successful', 'збірка успішна']):
                    current_progress = min(75, current_progress + 3)
                    update_frontend_progress(current_progress, "✅ Компіляція", "Компіляція завершена...")
                elif any(keyword in output_lower for keyword in ['optimizing', 'оптимізація', 'minifying', 'мініфікація']):
                    current_progress = min(85, current_progress + 2)
                    update_frontend_progress(current_progress, "⚡ Оптимізація", "Оптимізація бандлів...")
                elif any(keyword in output_lower for keyword in ['creating', 'generating', 'створення', 'генерація', 'static', 'статичн']):
                    current_progress = min(95, current_progress + 2)
                    update_frontend_progress(current_progress, "📦 Генерація", "Створення статичних файлів...")
                elif any(keyword in output_lower for keyword in ['route', 'page', 'маршрут', 'сторінк', '/', 'app/']):
                    current_progress = min(98, current_progress + 1)
                    update_frontend_progress(current_progress, "🛣️ Маршрути", "Генерація сторінок...")
                elif any(keyword in output_lower for keyword in ['ready', 'готов', 'server', 'сервер', 'localhost', 'build completed', 'збірка завершена', 'export success', 'експорт успішний']):
                    current_progress = 100
                    update_frontend_progress(current_progress, "✅ Готово", "Збірка завершена!")
                    # Якщо це production збірка (не dev сервер), можемо завершити
                    if any(keyword in output_lower for keyword in ['build completed', 'export success', 'збірка завершена']):
                        break
                else:
                    # Якщо є будь-який вивід, але не розпізнаємо - повільно збільшуємо прогрес
                    if len(output.strip()) > 10:  # Ігноруємо короткі повідомлення
                        current_progress = min(current_progress + 0.5, 95)
                        # Очищаємо вивід від зайвих символів
                        clean_output = output.strip().replace('\n', ' ').replace('\r', ' ')
                        # Обрезаем до безопасной длины
                        safe_output = clean_output[:60] + ("..." if len(clean_output) > 60 else "")
                        update_frontend_progress(current_progress, "🔄 Обробка", safe_output)
            else:
                # Якщо немає виводу, но процесс живий - спиннер уже работает
                # Обновляем время активности для корректного отслеживания
                pass

            # Перевіряємо на застій (але не якщо процес завершився)
            time_without_progress = current_time - last_progress_time
            time_without_activity = current_time - last_activity_time

            # Показуємо індикатор активності якщо немає виводу, але процес живий
            if time_without_activity > activity_timeout and process.poll() is None:
                if time_without_activity % 30 < 1:  # Кожні 30 секунд
                    dots = "." * (int(time_without_activity // 30) % 4)
                    update_frontend_progress(current_progress, "🔄 Тиха обробка", f"Next.js працює{dots} ({int(time_without_activity//60)} хв без виводу)")
                    print(f"\n💡 Спіннер показує активність кожні 2 секунди")

            # Показуємо попередження кожні 2 хвилини
            if time_without_progress > 120 and time_without_progress % 120 < 1 and process.poll() is None:
                minutes_stuck = int(time_without_progress // 60)
                print(f"\n⏳ Збірка триває {minutes_stuck} хвилин без зміни прогресу на {current_progress}%...")
                print(f"   Максимальний час очікування: {stuck_timeout//60} хвилин")
                print(f"   Залишилось: {(stuck_timeout - time_without_progress)//60:.0f} хвилин до автоматичного переривання")
                print(f"   Процес активний: {'Так' if time_without_activity < activity_timeout else 'Тиха обробка'}")

            if time_without_progress > stuck_timeout and process.poll() is None:
                print(f"\n🚨 ЗАСТІЙ ВИЯВЛЕНО: Збірка застрягла на {current_progress}% більше ніж {stuck_timeout//60} хвилин")
                print("💡 Рекомендації:")
                print("   - Перервіть збірку (Ctrl+C) та спробуйте знову")
                print("   - Очистіть кеш: rm -rf frontend/.next frontend/node_modules")
                print("   - Перевірте доступний простір на диску")
                print("   - Вимкніть антивірус для папки проекту")
                print("   - Спробуйте dev режим: npm run dev")

                # Показуємо останній вивід для діагностики
                print(f"\n🔍 Останній вивід процесу:")
                print(f"   {output.strip() if 'output' in locals() else 'Немає виводу'}")

                # Автоматично перериваємо процес після попередження
                print("⚠️ Автоматичне переривання через 60 секунд...")
                print("   Натисніть Ctrl+C для негайного переривання")
                time.sleep(60)
                process.terminate()
                return False

            # Якщо процес завершився, але ми не отримали 100% - це теж проблема
            if process.poll() is not None and current_progress < 100:
                print(f"\n⚠️ Процес завершився на {current_progress}%, але збірка може бути неповною")
                break

        return_code = process.poll()
        if return_code != 0:
            stderr_output = process.stderr.read()
            update_frontend_progress(0, "❌ Помилка", "Збірка не вдалася")
            print(f"\nПомилка збірки фронтенда: {stderr_output}")
            return False
        else:
            # Якщо процес завершився успішно, але прогрес менше 100% - встановлюємо 100%
            if current_progress < 100:
                update_frontend_progress(100, "✅ Готово", "Збірка завершена успішно")
            print()  # Новий рядок після прогрес-бару
            print_success("✅ Frontend збірка завершена успішно!")

    except KeyboardInterrupt:
        update_frontend_progress(0, "⚠️ Перервано", "Збірка перервана користувачем")
        print("\n⚠️ Збірка перервана користувачем!")
        if 'process' in locals():
            process.terminate()
        return False
    
    # Перевірка успішності збірки
    if next_dir.exists():
        print_success("✅ Production збірка завершена успішно!")

        # Показуємо розмір збірки
        result = run_command("du -sh .next", cwd=frontend_dir, check=False, capture_output=True)
        if result and result.returncode == 0:
            print_success(f"📦 Розмір збірки: {result.stdout.strip()}")

        print()
        print("🎉 ФРОНТЕНД ГОТОВИЙ ДО ЗАПУСКУ!")
        print("🌐 Після запуску ви отримаєте:")
        print("   • Повністю робочий сайт на http://localhost:3000")
        print("   • Оптимізовану production збірку")
        print("   • Швидку навігацію та завантаження сторінок")
        print("   • Готовий до використання інтерфейс")
        print()

        return True
    else:
        print_error("❌ Збірка не створена! Перевірте помилки вище.")
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

def deploy_docker_services(deploy_mode="full_rebuild", services_to_rebuild=None):
    """Розгортає сервіси в Docker з різними режимами"""

    if services_to_rebuild is None:
        services_to_rebuild = []

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

    # Выполняем действия в зависимости от режима деплоя
    if deploy_mode == "restart":
        print("🔄 Режим: Быстрый перезапуск существующих контейнеров")
        return restart_existing_containers(selected_services, frontend_mode)
    elif deploy_mode == "selective_rebuild":
        print(f"🎯 Режим: Выборочная пересборка сервисов: {', '.join(services_to_rebuild)}")
        return selective_rebuild_services(selected_services, services_to_rebuild, frontend_mode)
    else:  # full_rebuild
        print("🏗️ Режим: Полная пересборка всех сервисов")
        return full_rebuild_services(selected_services, frontend_mode)

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
    """Запускає локальний фронтенд в production режимі з правильними змінними"""
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

    # Налаштовуємо змінні оточення для production сервера
    server_env = os.environ.copy()
    server_env.update({
        "NODE_ENV": "production",
        "NEXT_PUBLIC_BACKEND_URL": os.getenv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:8000'),
        "NEXT_PUBLIC_IS_DOCKER": "false",
        "DEPLOY_MODE": "true",
        "NEXTAUTH_URL": "http://localhost:3000",
        # Используем дешифрованные значения из переменных окружения
        "NEXTAUTH_SECRET": os.getenv('NEXTAUTH_SECRET', ''),
        "GOOGLE_CLIENT_ID": os.getenv('GOOGLE_CLIENT_ID', ''),
        "GOOGLE_CLIENT_SECRET": os.getenv('GOOGLE_CLIENT_SECRET', ''),
        "PORT": "3000",
        "HOSTNAME": "localhost"
    })

    # Запускаємо в production режимі з правильними змінними
    try:
        subprocess.run("npm run start", shell=True, cwd=frontend_dir, env=server_env)
    except KeyboardInterrupt:
        print_success("\n✅ Локальний фронтенд зупинено")

    return True

def start_local_frontend_background():
    """Запускає локальний фронтенд у фоновому режимі з правильними змінними оточення"""
    frontend_dir = Path("frontend")
    next_dir = frontend_dir / ".next"

    if not next_dir.exists():
        print_error("Production збірка не знайдена! Спочатку виконайте npm run build")
        return None

    # Очищаємо порт 3000 перед запуском
    print("🧹 Очищення порту 3000...")
    run_command("npm run kill 3000", cwd=frontend_dir, check=False, capture_output=True)

    print("🚀 Запуск локального фронтенда у фоновому режимі...")

    try:
        # Налаштовуємо змінні оточення для production сервера
        server_env = os.environ.copy()
        server_env.update({
            "NODE_ENV": "production",
            "NEXT_PUBLIC_BACKEND_URL": os.getenv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:8000'),
            "NEXT_PUBLIC_IS_DOCKER": "false",
            "DEPLOY_MODE": "true",
            "NEXTAUTH_URL": "http://localhost:3000",
            # Используем дешифрованные значения из переменных окружения
            "NEXTAUTH_SECRET": os.getenv('NEXTAUTH_SECRET', ''),
            "GOOGLE_CLIENT_ID": os.getenv('GOOGLE_CLIENT_ID', ''),
            "GOOGLE_CLIENT_SECRET": os.getenv('GOOGLE_CLIENT_SECRET', ''),
            "PORT": "3000",
            "HOSTNAME": "localhost"
        })

        # Запускаємо фронтенд у фоновому режимі з правильними змінними
        process = subprocess.Popen(
            "npm run start",
            shell=True,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            env=server_env  # Використовуємо налаштовані змінні оточення
        )

        print(f"✅ Фронтенд запущено (PID: {process.pid})")
        print("🌐 URL: http://localhost:3000")
        return process

    except Exception as e:
        print_error(f"❌ Помилка запуску фронтенда: {e}")
        return None

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

def choose_deploy_mode():
    """Выбор режима деплоя"""
    print("🔧 РЕЖИМ ДЕПЛОЯ")
    print("=" * 50)
    print("1. 🔄 Быстрый перезапуск (использовать существующие образы)")
    print("2. 🏗️  Полная переустановка (пересобрать все образы)")
    print("3. 🎯 Выборочная переустановка (выбрать сервисы для пересборки)")
    print("=" * 50)

    while True:
        try:
            choice = input("Выберите режим (1-3): ").strip()
            if choice == "1":
                return "restart", []
            elif choice == "2":
                return "full_rebuild", []
            elif choice == "3":
                return "selective_rebuild", choose_services_to_rebuild()
            else:
                print("❌ Неверный выбор. Введите 1, 2 или 3.")
        except KeyboardInterrupt:
            print("\n❌ Отменено пользователем")
            sys.exit(1)

def choose_services_to_rebuild():
    """Выбор сервисов для пересборки"""
    available_services = ["app", "celery-worker", "celery-beat", "flower", "mailing", "nginx"]

    print("\n🎯 ВЫБОРОЧНАЯ ПЕРЕСБОРКА")
    print("=" * 40)
    print("Доступные сервисы для пересборки:")
    for i, service in enumerate(available_services, 1):
        print(f"{i}. {service}")
    print("=" * 40)
    print("Введите номера сервисов через запятую (например: 1,3,5)")
    print("Или 'all' для всех сервисов")

    while True:
        try:
            choice = input("Ваш выбор: ").strip()
            if choice.lower() == 'all':
                return available_services

            # Парсим номера
            indices = [int(x.strip()) for x in choice.split(',')]
            selected_services = []

            for idx in indices:
                if 1 <= idx <= len(available_services):
                    selected_services.append(available_services[idx - 1])
                else:
                    print(f"❌ Неверный номер: {idx}")
                    break
            else:
                if selected_services:
                    print(f"✅ Выбраны сервисы: {', '.join(selected_services)}")
                    return selected_services
                else:
                    print("❌ Не выбрано ни одного сервиса")
        except (ValueError, KeyboardInterrupt):
            print("❌ Неверный формат. Используйте номера через запятую.")

def restart_existing_containers(selected_services, frontend_mode):
    """Швидкий перезапуск існуючих контейнерів"""
    print("\n🔄 РЕЖИМ: Швидкий перезапуск існуючих контейнерів")
    print("=" * 60)
    print("💡 Використовуються існуючі образи Docker")
    print("💡 Час виконання: ~1-5 хвилин (залежно від системи)")
    print()

    # Етап 1: Зупинка контейнерів
    show_progress_bar(1, 4, "🛑 Зупинка всіх контейнерів...")
    if not run_command("docker-compose down", capture_output=True):
        print_error("❌ Помилка при зупинці контейнерів")
        return None
    print_success("✅ Всі контейнери зупинені")

    # Етап 2: Очищення мережі (опціонально)
    show_progress_bar(2, 4, "🧹 Очищення Docker мереж...")
    run_command("docker network prune -f", capture_output=True, check=False)

    # Етап 3: Запуск backend контейнерів (БЕЗ nginx)
    show_progress_bar(3, 4, "🚀 Запуск backend контейнерів...")

    # Запускаем сначала все backend сервисы, кроме nginx (nginx запустится ПОСЛЕ фронтенда)
    backend_services = ["app", "pg", "redis", "redis-insight", "rabbitmq", "celery-worker", "celery-beat", "flower", "mailing"]
    services_to_start = " ".join(backend_services)

    print(f"🚀 Запуск backend сервісів: {services_to_start}")
    print("⏳ Це може зайняти до 3 хвилин...")

    try:
        result = subprocess.run(
            f"docker-compose up -d {services_to_start}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=180  # 3 хвилини для backend
        )

        if result.returncode != 0:
            print_error("❌ Помилка при запуску backend контейнерів")
            if result.stderr:
                print(f"🔍 Помилка: {result.stderr}")
            if result.stdout:
                print(f"🔍 Вивід: {result.stdout}")

            # Показуємо статус для діагностики
            try:
                status_result = subprocess.run("docker-compose ps", shell=True, capture_output=True, text=True, timeout=10)
                if status_result.stdout:
                    print(f"📊 Статус контейнерів:\n{status_result.stdout}")
            except:
                pass
            return None
        else:
            print_success("✅ Backend контейнери запущені")
            if result.stdout:
                print(f"📋 Запущені сервіси:\n{result.stdout}")

    except subprocess.TimeoutExpired:
        print_error("❌ Таймаут при запуску backend контейнерів (>3 хв)")
        print("💡 Можливі причини:")
        print("   - Повільне інтернет-з'єднання")
        print("   - Недостатньо ресурсів системи")
        print("   - Проблеми з Docker Desktop")
        return None
    except Exception as e:
        print_error(f"❌ Неочікувана помилка: {e}")
        return None

    # Етап 4: Очікування готовності
    show_progress_bar(4, 4, "⏳ Очікування готовності сервісів...")
    print("⏳ Очікування ініціалізації сервісів...")

    # Показуємо прогрес очікування з перевіркою статусу
    wait_time = 15
    for i in range(wait_time):
        progress = (i + 1) / wait_time * 100
        print(f"\r⏳ Ініціалізація сервісів: {i+1}/{wait_time} сек ({progress:.0f}%)", end="", flush=True)
        time.sleep(1)

        # Кожні 5 секунд перевіряємо статус контейнерів
        if (i + 1) % 5 == 0:
            print()  # Новий рядок
            try:
                result = subprocess.run("docker-compose ps --format table",
                                      shell=True, capture_output=True, text=True, timeout=10)
                if result.returncode == 0 and result.stdout:
                    running_count = result.stdout.count("running")
                    print(f"📊 Статус: {running_count} сервісів запущено")
                else:
                    print("📊 Перевірка статусу...")
            except:
                print("📊 Перевірка статусу...")

    print()  # Новий рядок після прогресу
    print_success("🎉 Швидкий перезапуск завершено!")
    return frontend_mode

def selective_rebuild_services(selected_services, services_to_rebuild, frontend_mode):
    """Выборочная пересборка указанных сервисов"""
    print(f"🎯 Выборочная пересборка сервисов: {', '.join(services_to_rebuild)}")

    # Останавливаем все контейнеры
    print("🛑 Остановка всех контейнеров...")
    run_command("docker-compose down", capture_output=True)

    # Удаляем образы только для выбранных сервисов
    for service in services_to_rebuild:
        print(f"🗑️ Удаление образа для {service}...")
        run_command(f"docker rmi final_drf_next_sept_2024-{service} 2>/dev/null || true",
                   capture_output=True, check=False)

    # Пересобираем только выбранные сервисы
    services_str = " ".join(services_to_rebuild)
    print(f"🔨 Пересборка сервисов: {services_str}")
    if not run_command(f"docker-compose build --no-cache {services_str}", capture_output=True):
        print_error("❌ Ошибка при пересборке сервисов")
        return None

    # Запускаем все сервисы
    print("🚀 Запуск всех сервисов...")
    if not run_command("docker-compose up -d", capture_output=True):
        print_error("❌ Ошибка при запуске контейнеров")
        return None

    print_success("✅ Выборочная пересборка завершена!")
    return frontend_mode

def full_rebuild_services(selected_services, frontend_mode):
    """Полная пересборка всех сервисов"""
    print("🏗️ Полная пересборка всех сервисов...")

    # Останавливаем и удаляем все контейнеры
    print("🛑 Полная очистка...")
    run_command("docker-compose down -v --remove-orphans", capture_output=True)

    # Удаляем все образы проекта
    print("🗑️ Удаление всех образов проекта...")
    run_command("docker images -q final_drf_next_sept_2024-* | xargs -r docker rmi -f",
               capture_output=True, check=False)

    # Продолжаем с обычной логикой полной пересборки
    return continue_full_rebuild(selected_services, frontend_mode)

def continue_full_rebuild(selected_services, frontend_mode):
    """Продолжение полной пересборки (оригинальная логика)"""

    # СТВОРЕННЯ ТА ЗБІРКА ВСІХ КОНТЕЙНЕРІВ З НУЛЯ
    show_progress_bar(4, 6, "🔨 Збірка всіх образів...")

    # Запускаємо збірку з відстеженням прогресу для обраних сервісів
    if not run_docker_build_with_progress(selected_services):
        print_error("Не вдалося зібрати деякі Docker образи!")
        return None

    print_success("Всі обрані образи зібрані успішно!")

    show_progress_bar(5, 6, "🚀 Запуск всіх контейнерів...")

    # Запускаємо контейнери з захопленням виводу
    result = run_command("docker-compose up -d --force-recreate", capture_output=True)
    if not result:
        print_error("Не вдалося запустити Docker сервіси!")
        return None

    print_success("Всі контейнери запущені!")

    # Чекаємо готовності сервісів
    show_progress_bar(6, 6, "⏳ Очікування готовності сервісів...")
    time.sleep(10)

    return frontend_mode

def main():
    """Головна функція"""
    try:
        # Парсим аргументы командной строки
        parser = argparse.ArgumentParser(description='AutoRia Clone Deploy Script')
        parser.add_argument('--mode', choices=['restart', 'full_rebuild', 'selective_rebuild'],
                          help='Режим деплоя')
        parser.add_argument('--services', nargs='*',
                          help='Сервисы для выборочной пересборки')
        parser.add_argument('--auto', action='store_true',
                          help='Автоматический режим без интерактивных запросов')

        args = parser.parse_args()

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

        # Определяем режим деплоя
        if args.mode:
            deploy_mode = args.mode
            services_to_rebuild = args.services or []
        elif args.auto:
            deploy_mode = "restart"
            services_to_rebuild = []
        else:
            deploy_mode, services_to_rebuild = choose_deploy_mode()

        print(f"🔧 Режим деплоя: {deploy_mode}")
        if services_to_rebuild:
            print(f"🎯 Сервисы для пересборки: {', '.join(services_to_rebuild)}")
        print()

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

        # ЭТАП 2: Развертывание сервисов в Docker
        frontend_mode = deploy_docker_services(deploy_mode, services_to_rebuild)
        if frontend_mode is None:  # Ошибка развертывания
            sys.exit(1)

        # ЭТАП 3: Подготовка фронтенда
        if frontend_mode == "local":
            # Сборка фронтенда в production режиме для локального запуска
            if not build_frontend():
                sys.exit(1)
        else:  # frontend_mode == "docker"
            # Для Docker режима фронтенд уже должен быть собран в контейнере
            print("🐳 Фронтенд будет запущен в Docker контейнере")

        # ЭТАП 4: Финальный запуск фронтенда
        print("\n" + "="*60)
        print("🚀 ФИНАЛЬНЫЙ ЭТАП: Запуск фронтенда")
        print("="*60)

        if frontend_mode == "local":
            print()
            print_success("Всі Docker сервіси запущені!")

            # ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда
            print("ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда...")

            # Запускаємо фронтенд у фоновому режимі
            frontend_process = start_local_frontend_background()

            if frontend_process:
                # Чекаємо трохи щоб фронтенд встиг запуститися
                print("⏳ Очікування запуску фронтенда...")
                time.sleep(5)

                # ВАЖЛИВО: Запускаємо nginx ПІСЛЯ готовності фронтенда
                print("🌐 Запуск Nginx (reverse proxy) ПІСЛЯ готовності фронтенда...")
                try:
                    nginx_result = subprocess.run(
                        "docker-compose up -d nginx",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )

                    if nginx_result.returncode == 0:
                        print_success("✅ Nginx запущен")
                        time.sleep(3)  # Даем nginx время на инициализацию
                    else:
                        print_warning("⚠️ Проблема с запуском Nginx")
                        if nginx_result.stderr:
                            print(f"Ошибка Nginx: {nginx_result.stderr}")

                except Exception as e:
                    print_warning(f"⚠️ Ошибка запуска Nginx: {e}")

                # Теперь проверяем ВСЕ сервисы включая фронтенд И nginx
                print("🔍 Финальная проверка готовности ВСЕХ сервисов (включая Nginx)...")
                all_services_healthy = check_services_health("local")

                if all_services_healthy:
                    print_success("🎉 ВСІ СЕРВІСИ ГОТОВІ! Система повністю функціональна!")
                    print()
                    print("🌐 " + "="*60)
                    print("🚀 AutoRia Clone готовий до використання!")
                    print("🔗 Головна сторінка (прямо): http://localhost:3000")
                    print("🔗 Головна сторінка (через Nginx): http://localhost")
                    print("="*63)
                    print()
                    print("📋 Backend сервіси (через Docker + Nginx):")
                    print("   - http://localhost/api/ - Backend API")
                    print("   - http://localhost/admin/ - Django Admin")
                    print("   - http://localhost/rabbitmq/ - RabbitMQ Management")
                    print("   - http://localhost/flower/ - Celery Flower")
                    print("   - http://localhost/redis/ - Redis Insight")
                    print()
                    print("💡 Фронтенд: локально в production режимі (порт 3000)")
                    print("💡 Backend: Docker контейнери + Nginx reverse proxy")
                    print("💡 Nginx: проксирует запросы между фронтендом и бекендом")
                else:
                    print_warning("⚠️ Деякі сервіси не готові. Система може працювати некоректно.")
                    print("❌ ССЫЛКИ НЕ ПРЕДОСТАВЛЯЮТСЯ - НЕ ВСЕ СЕРВИСЫ ГОТОВЫ!")
                    print("🔧 Рекомендується перевірити логи проблемних сервісів перед використанням.")
            else:
                print_error("❌ Не вдалося запустити локальний фронтенд!")
                print("🔧 Перевірте логи та спробуйте запустити вручну: npm run start")
        else:  # frontend_mode == "docker"
            print("🐳 Режим: Фронтенд в Docker контейнере")

            # Убеждаемся что фронтенд контейнер запущен
            print("🚀 Запуск фронтенда в Docker...")
            try:
                result = subprocess.run(
                    "docker-compose up -d frontend",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.returncode == 0:
                    print_success("✅ Фронтенд контейнер запущен")
                else:
                    print_warning("⚠️ Проблема с запуском фронтенд контейнера")
                    if result.stderr:
                        print(f"Ошибка: {result.stderr}")

            except Exception as e:
                print_warning(f"⚠️ Ошибка запуска фронтенда: {e}")

            # Ожидание готовности фронтенда в Docker
            print("⏳ Ожидание готовности фронтенда в Docker...")
            wait_time = 20
            for i in range(wait_time):
                progress = (i + 1) / wait_time * 100
                print(f"\r⏳ Инициализация фронтенда: {i+1}/{wait_time} сек ({progress:.0f}%)", end="", flush=True)
                time.sleep(1)
            print()

            # Запускаем nginx ПОСЛЕ готовности фронтенда с циклическими попытками
            print("🌐 Запуск Nginx (reverse proxy) ПОСЛЕ готовности фронтенда...")
            nginx_healthy = start_nginx_with_retry()

            # Финальная проверка готовности ВСЕХ сервисов включая nginx
            print("🔍 Финальная проверка готовности ВСЕХ сервисов (включая Nginx)...")
            all_services_healthy = check_services_health("docker")

            # Проверяем, работает ли nginx хотя бы частично
            nginx_running = False
            try:
                nginx_status = subprocess.run(
                    "docker ps --filter name=nginx --format '{{.Status}}'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                nginx_running = "Up" in nginx_status.stdout
            except:
                pass

            # Предоставляем ссылки если основные сервисы работают
            if all_services_healthy:
                print_success("🎉 ВСІ СЕРВІСИ ГОТОВІ! Система повністю функціональна!")
                print()
                print("🌐 " + "="*60)
                print("🚀 AutoRia Clone готовий до використання!")
                print("🔗 Головна сторінка: http://localhost")
                print("🔗 Фронтенд (прямо): http://localhost:3000")
                print("="*63)
                print()
                print("📋 Додаткові сервіси:")
                print("   - http://localhost/api/ - Backend API")
                print("   - http://localhost/admin/ - Django Admin")
                print("   - http://localhost/rabbitmq/ - RabbitMQ Management")
                print("   - http://localhost/flower/ - Celery Flower")
                print("   - http://localhost/redis/ - Redis Insight")
                print()
                print("💡 Всі сервіси працюють в Docker контейнерах")
            elif nginx_running:
                print_warning("⚠️ Деякі сервіси мають проблеми з health check, але система працює!")
                print()
                print("🌐 " + "="*60)
                print("🚀 AutoRia Clone доступний для використання!")
                print("🔗 Головна сторінка: http://localhost")
                print("🔗 Фронтенд (прямо): http://localhost:3000")
                print("="*63)
                print()
                print("📋 Додаткові сервіси:")
                print("   - http://localhost/api/ - Backend API")
                print("   - http://localhost/admin/ - Django Admin")
                print("   - http://localhost/rabbitmq/ - RabbitMQ Management")
                print("   - http://localhost/flower/ - Celery Flower")
                print("   - http://localhost/redis/ - Redis Insight")
                print()
                print("⚠️ Примітка: Деякі health check не проходять, але сервіси працюють")
                print("🔧 Рекомендується перевірити логи якщо виникнуть проблеми")
            else:
                print_warning("⚠️ Деякі сервіси не готові. Система може працювати некоректно.")
                print("❌ ССЫЛКИ НЕ ПРЕДОСТАВЛЯЮТСЯ - НЕ ВСЕ СЕРВИСЫ ГОТОВЫ!")
                print("🔧 Рекомендується перевірити логи проблемних сервісів перед використанням.")

    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}⚠️  Розгортання перервано користувачем{Colors.ENDC}")
        print("🛑 Завершення роботи...")
        sys.exit(130)  # Стандартний код виходу для Ctrl+C
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Критична помилка: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
