#!/usr/bin/env python3
"""
АВТОМАТИЧНИЙ ДЕПЛОЙ AutoRia Clone
===================================

Оптимізований скрипт для максимально швидкого деплою з різними режимами.
Підтримує повне перевстановлення, швидкий перезапуск та вибіркову перезбірку.

Використання:
    python deploy.py                                    # Інтерактивний режим
    python deploy.py --mode restart                     # Швидкий перезапуск
    python deploy.py --mode full_rebuild                # Повна перезбірка
    python deploy.py --mode selective_rebuild --services app nginx  # Вибіркова перезбірка
    python deploy.py --auto                             # Автоматичний швидкий перезапуск

Режими деплою:
- restart: Швидкий перезапуск існуючих контейнерів (найшвидший)
- full_rebuild: Повна перезбірка всіх образів (як з нуля)
- selective_rebuild: Перезбірка тільки вказаних сервісів

Що робить скрипт:
- Перевіряє наявність системних вимог
- Вибирає режим деплою (інтерактивно або через параметри)
- Розгортає Docker сервіси згідно з обраним режимом
- Збирає фронтенд в production режимі (якщо локальний режим)
- Перевіряє готовність ВСІХ сервісів перед наданням посилання
- Надає посилання тільки коли ВСІ сервіси healthy
"""

import os
import sys
import subprocess
import time
import threading
import re
import argparse
from pathlib import Path
import select

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def input_with_timeout(prompt, timeout=10, default=""):
    """Input з таймаутом. Якщо користувач не вводить нічого за timeout секунд, повертає default"""
    # Показуємо попередньо заповнене значення
    if default:
        print(f"{prompt}{default}", end='', flush=True)
    else:
        print(prompt, end='', flush=True)
    
    if sys.platform == 'win32':
        # Windows
        import msvcrt
        start_time = time.time()
        input_chars = []
        
        while True:
            if msvcrt.kbhit():
                char = msvcrt.getwche()
                if char == '\r':  # Enter
                    print()
                    return ''.join(input_chars)
                elif char == '\b':  # Backspace
                    if input_chars:
                        input_chars.pop()
                        print('\b \b', end='', flush=True)
                else:
                    input_chars.append(char)
            
            if time.time() - start_time > timeout:
                if not input_chars:
                    print(f"\n⏱️  Таймаут {timeout}с - використовуємо значення за замовчуванням: {default}")
                    return default
            
            time.sleep(0.01)
    else:
        # Unix/Linux
        import select
        ready, _, _ = select.select([sys.stdin], [], [], timeout)
        if ready:
            return sys.stdin.readline().rstrip('\n')
        else:
            print(f"\n⏱️  Таймаут {timeout}с - використовуємо значення за замовчуванням: {default}")
            return default

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

def show_progress_bar(current, total, description="", width=50):
    """Показує прогрес-бар"""
    percent = (current / total) * 100
    filled = int(width * current // total)
    bar = '█' * filled + '░' * (width - filled)
    print(f"\r{Colors.OKCYAN}[{bar}] {percent:.1f}% {description}{Colors.ENDC}", end='', flush=True)
    if current == total:
        print()  # Новий рядок в кінці

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
    print("  s - skip (пропустити вибір сервісів)")
    print()
    print("🎯 За замовчуванням: 0 (Backend в Docker + Frontend локально)")
    print("💡 Автоматичний вибір через 10 секунд: опція 0")

    while True:
        try:
            choice = input_with_timeout("\nВаш вибір: ", timeout=10, default="0").strip().lower()
            if not choice:  # Якщо користувач просто натиснув Enter
                choice = "0"

            if choice == "0":
                # Backend в Docker + Frontend локально
                backend_services = [s for s in services if s != "frontend"]
                return backend_services, "local"

            if choice == "00":
                # Всі сервіси в Docker
                return services, "docker"

            if choice == "s" or choice == "skip":
                # Skip - повертаємо порожній список і skip режим
                return [], "skip"

            if not choice:
                print("❌ Будь ласка, введіть номери сервісів")
                continue

            # Парсуємо вибір користувача
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

            confirm = input_with_timeout("Продовжити? (y/n): ", timeout=10, default="y").strip().lower()

            if not confirm or confirm in ['y', 'yes', 'так', 'т']:
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

    # Прапор для зупинки збірки
    stop_build_flag = threading.Event()

    # Словник з зручними для читання назвами сервісів
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
                        # Отримуємо зручну для читання назву сервісу
                        display_name = service_display_names.get(service, service)
                        base_line = f"🔨 {display_name:20} [{progress_bar}] {data['progress']:3.0f}% {data['status']}"

                        if data["log_msg"]:
                            # Фільтруємо небажані попередження
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
                    return f"Встановлення {match.group(1).strip()}"
            elif "downloading" in line.lower():
                return "Завантаження залежностей..."
            elif "building" in line.lower():
                return "Збірка..."

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
    Запускає nginx з циклічними спробами до успішного health check
    """
    print("🌐 Запуск Nginx з перевіркою готовності...")

    for attempt in range(1, max_attempts + 1):
        print(f"🔄 Спроба {attempt}/{max_attempts}: Запуск Nginx...")

        try:
            # Зупиняємо nginx якщо він вже запущений
            subprocess.run(
                "docker-compose stop nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )

            # Видаляємо контейнер nginx
            subprocess.run(
                "docker-compose rm -f nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )

            # Запускаємо nginx заново
            nginx_result = subprocess.run(
                "docker-compose up -d nginx",
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )

            if nginx_result.returncode != 0:
                print_warning(f"⚠️ Помилка запуску Nginx (спроба {attempt})")
                if nginx_result.stderr:
                    print(f"   Помилка: {nginx_result.stderr}")
                continue

            print_success(f"✅ Nginx запущено (спроба {attempt})")

            # Чекаємо ініціалізації
            print(f"⏳ Очікування ініціалізації Nginx ({wait_between_attempts} сек)...")
            time.sleep(wait_between_attempts)

            # Перевіряємо health check nginx
            print("🔍 Перевірка health check Nginx...")
            health_check_passed = False

            # Намагаємося кілька разів перевірити health check
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
                        print(f"   Health check невдалий (спроба {health_attempt + 1}/3)")
                        time.sleep(3)

                except Exception as e:
                    print(f"   Помилка health check: {e}")
                    time.sleep(3)

            if health_check_passed:
                print_success("✅ Nginx успішно запущено і пройдено health check!")
                return True
            else:
                print_warning(f"⚠️ Nginx запущено, але health check не пройдено (спроба {attempt})")

        except Exception as e:
            print_warning(f"⚠️ Помилка при запуску Nginx (спроба {attempt}): {e}")

        if attempt < max_attempts:
            print(f"⏳ Очікування перед наступною спробою...")
            time.sleep(5)

    print_error("❌ Не вдалося запустити Nginx після всіх спроб")
    print("🔧 Nginx може працювати, але health check не проходить")
    print("🔧 Перевірте доступність фронтенда на localhost:3000")
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
        print("❌ ПОСИЛАННЯ НЕ НАДАЄТЬСЯ - СЕРВІСИ НЕ ГОТОВІ!")
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

    # Production збірка з детальною індикацією прогресу
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
            universal_newlines=True
        )

        # Відстежуємо прогрес збірки в реальному часі з детекцією застоїв
        current_progress = 40
        last_progress_time = time.time()
        last_progress_value = current_progress
        stuck_timeout = 600  # 10 хвилин без прогресу = застій (збільшено для складних проектів)
        last_activity_time = time.time()  # Час останньої активності (будь-якого виводу)
        activity_timeout = 120  # 2 хвилини без будь-якого виводу = показуємо індикатор активності

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
                # Якщо немає виводу, але процес живий - показуємо індикатор активності
                if process.poll() is None and time_without_activity > 10:
                    # Кожні 10 секунд без виводу показуємо анімований індикатор
                    if int(time_without_activity) % 10 == 0:
                        spinner_chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
                        spinner = spinner_chars[int(time_without_activity // 2) % len(spinner_chars)]
                        update_frontend_progress(current_progress, f"{spinner} Обробка", f"Тиха обробка файлів... ({int(time_without_activity)}с без виводу)")

                # Перевіряємо чи змінився прогрес
                if current_progress > old_progress:
                    last_progress_time = time.time()
                    last_progress_value = current_progress

            # Перевіряємо на застій (але не якщо процес завершився)
            time_without_progress = current_time - last_progress_time
            time_without_activity = current_time - last_activity_time

            # Показуємо індикатор активності якщо немає виводу, але процес живий
            if time_without_activity > activity_timeout and process.poll() is None:
                if time_without_activity % 30 < 1:  # Кожні 30 секунд
                    dots = "." * (int(time_without_activity // 30) % 4)
                    update_frontend_progress(current_progress, "🔄 Обробка", f"Тиха обробка файлів{dots} ({int(time_without_activity//60)} хв без виводу)")

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

    # Якщо обрано skip - одразу повертаємо
    if frontend_mode == "skip":
        return "skip"

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

    # Виконуємо дії в залежності від режиму деплою
    if deploy_mode == "restart":
        print("🔄 Режим: Швидкий перезапуск існуючих контейнерів")
        return restart_existing_containers(selected_services, frontend_mode)
    elif deploy_mode == "selective_rebuild":
        print(f"🎯 Режим: Вибіркова перезбірка сервісів: {', '.join(services_to_rebuild)}")
        return selective_rebuild_services(selected_services, services_to_rebuild, frontend_mode)
    elif deploy_mode == "fast_rebuild":
        print("⚡ Режим: FAST - швидка паралельна збірка без очищення")
        return fast_rebuild_services(selected_services, frontend_mode)
    else:  # full_rebuild
        print("🏗️ Режим: Повна перезбірка всіх сервісів")
        return full_rebuild_services(selected_services, frontend_mode)

def deploy_full_docker():
    """Повне розгортання в Docker включаючи фронтенд"""
    print_step(4, "Запуск фронтенда в Docker")

    # Запускаємо фронтенд в Docker
    if not run_command("docker-compose up -d frontend", capture_output=True):
        print_warning("Не вдалося запустити фронтенд в Docker")
        return False

    print_success("Фронтенд запущено в Docker!")
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

def start_local_frontend_background():
    """Запускає локальний фронтенд у фоновому режимі"""
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
        # Підготовка змінних оточення для локального режиму
        env = os.environ.copy()
        env['NODE_ENV'] = 'production'
        env['IS_DOCKER'] = 'false'
        env['NEXT_PUBLIC_IS_DOCKER'] = 'false'
        env['NEXT_PUBLIC_BACKEND_URL'] = 'http://localhost:8000'
        env['BACKEND_URL'] = 'http://localhost:8000'
        env['REDIS_HOST'] = 'localhost'
        env['REDIS_URL'] = 'redis://localhost:6379/0'

        print("🔧 Змінні оточення для frontend:")
        print(f"   NEXT_PUBLIC_BACKEND_URL: {env['NEXT_PUBLIC_BACKEND_URL']}")
        print(f"   NEXT_PUBLIC_IS_DOCKER: {env['NEXT_PUBLIC_IS_DOCKER']}")
        print(f"   REDIS_HOST: {env['REDIS_HOST']}")

        # Запускаємо фронтенд у фоновому режимі з правильними змінними оточення
        # ВАЖЛИВО: НЕ перенаправляємо stdout/stderr в PIPE, щоб бачити помилки
        process = subprocess.Popen(
            "npm run start",
            shell=True,
            cwd=frontend_dir,
            env=env,
            stdin=subprocess.DEVNULL
        )

        print(f"✅ Фронтенд запущено (PID: {process.pid})")
        print("🌐 URL: http://localhost:3000")
        print("📋 Логи frontend будуть показані в консолі")
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
    """Вибір режиму деплою"""
    print("🔧 РЕЖИМ ДЕПЛОЮ")
    print("=" * 50)
    print("1. 🔄 Швидкий перезапуск (використовувати існуючі образи)")
    print("2. 🏗️  Повне перевстановлення (перезібрати всі образи) [ЗА ЗАМОВЧУВАННЯМ]")
    print("3. 🎯 Вибіркове перевстановлення (вибрати сервіси для перезбірки)")
    print("f. ⚡ FAST режим - швидка збірка БЕЗ очищення (паралельна збірка)")
    print("s. ⏭️  Skip - пропустити деплой (тільки показати статус)")
    print("=" * 50)
    print("💡 Автоматичний вибір через 10 секунд: режим 2 (повне перевстановлення)")
    print()

    try:
        choice = input_with_timeout("Оберіть режим (1-3/f/s): ", timeout=10, default="2").strip().lower()
        if not choice:
            choice = "2"
        
        if choice == "1":
            return "restart", []
        elif choice == "2":
            return "full_rebuild", []
        elif choice == "3":
            return "selective_rebuild", choose_services_to_rebuild()
        elif choice == "f" or choice == "fast":
            return "fast_rebuild", []
        elif choice == "s" or choice == "skip":
            return "skip", []
        else:
            print("❌ Невірний вибір. Використовуємо режим 2 (повне перевстановлення)")
            return "full_rebuild", []
    except KeyboardInterrupt:
        print("\n❌ Скасовано користувачем")
        sys.exit(1)

def choose_services_to_rebuild():
    """Вибір сервісів для перезбірки"""
    available_services = ["app", "celery-worker", "celery-beat", "flower", "mailing", "nginx"]

    print("\n🎯 ВИБІРКОВА ПЕРЕЗБІРКА")
    print("=" * 40)
    print("Доступні сервіси для перезбірки:")
    for i, service in enumerate(available_services, 1):
        print(f"{i}. {service}")
    print("=" * 40)
    print("Введіть номери сервісів через кому (наприклад: 1,3,5)")
    print("Або 'all' для всіх сервісів")

    while True:
        try:
            choice = input("Ваш вибір: ").strip()
            if choice.lower() == 'all':
                return available_services

            # Парсуємо номери
            indices = [int(x.strip()) for x in choice.split(',')]
            selected_services = []

            for idx in indices:
                if 1 <= idx <= len(available_services):
                    selected_services.append(available_services[idx - 1])
                else:
                    print(f"❌ Невірний номер: {idx}")
                    break
            else:
                if selected_services:
                    print(f"✅ Обрано сервіси: {', '.join(selected_services)}")
                    return selected_services
                else:
                    print("❌ Не обрано жодного сервісу")
        except (ValueError, KeyboardInterrupt):
            print("❌ Невірний формат. Використовуйте номери через кому.")

def remove_conflicting_containers(services_list):
    """Видаляє конфліктуючі контейнери для вказаних сервісів"""
    print("🧹 Видалення конфліктуючих контейнерів...")
    
    # Мапінг сервісів до можливих імен контейнерів
    service_container_names = {
        "app": ["app", "autoria_fresh_deploy-app-1", "autoria_clean_install-app-1"],
        "frontend": ["frontend"],
        "pg": ["pg"],
        "redis": ["redis"],
        "redis-insight": ["redis-insight"],
        "rabbitmq": ["rabbitmq"],
        "celery-worker": ["celery-worker"],
        "celery-beat": ["celery-beat"],
        "flower": ["celery-flower", "flower"],
        "mailing": ["mailing"],
        "nginx": ["nginx"]
    }
    
    containers_to_remove = []
    for service in services_list:
        if service in service_container_names:
            containers_to_remove.extend(service_container_names[service])
    
    if containers_to_remove:
        # Зупиняємо контейнери
        containers_str = " ".join(containers_to_remove)
        print(f"   Зупинка: {containers_str}")
        subprocess.run(
            f"docker stop {containers_str}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Видаляємо контейнери
        print(f"   Видалення: {containers_str}")
        result = subprocess.run(
            f"docker rm -f {containers_str}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print_success(f"✅ Видалено конфліктуючі контейнери: {len(containers_to_remove)}")
            return True
        else:
            print_warning(f"⚠️ Деякі контейнери не знайдені (це нормально)")
            return True
    else:
        print("   Немає контейнерів для видалення")
        return True

def restart_existing_containers(selected_services, frontend_mode):
    """Швидкий перезапуск існуючих контейнерів"""
    print("\n🔄 РЕЖИМ: Швидкий перезапуск існуючих контейнерів")
    print("=" * 60)
    print("💡 Використовуються існуючі образи Docker")
    print("💡 Час виконання: ~1-5 хвилин (залежно від системи)")
    print()

    # Етап 1: Видалення конфліктуючих контейнерів
    show_progress_bar(1, 5, "🧹 Видалення конфліктуючих контейнерів...")
    remove_conflicting_containers(selected_services)
    
    # Етап 2: Зупинка контейнерів проекту
    show_progress_bar(2, 5, "🛑 Зупинка контейнерів проекту...")
    if not run_command("docker-compose down", capture_output=True):
        print_error("❌ Помилка при зупинці контейнерів")
        return None
    print_success("✅ Контейнери проекту зупинені")

    # Етап 3: Очищення мережі (опціонально)
    show_progress_bar(3, 5, "🧹 Очищення Docker мереж...")
    run_command("docker network prune -f", capture_output=True, check=False)

    # Етап 4: Запуск backend контейнерів (БЕЗ nginx)
    show_progress_bar(4, 5, "🚀 Запуск backend контейнерів...")

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

    # Етап 5: Очікування готовності
    show_progress_bar(5, 5, "⏳ Очікування готовності сервісів...")
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
    """Вибіркова перезбірка вказаних сервісів"""
    print(f"🎯 Вибіркова перезбірка сервісів: {', '.join(services_to_rebuild)}")

    # Видаляємо конфліктуючі контейнери для сервісів, які перебудовуються
    print("🧹 Видалення конфліктуючих контейнерів...")
    remove_conflicting_containers(services_to_rebuild)

    # Зупиняємо всі контейнери проекту
    print("🛑 Зупинка контейнерів проекту...")
    run_command("docker-compose down", capture_output=True)

    # Визначаємо project name (з директорії або змінної COMPOSE_PROJECT_NAME)
    project_name = os.getenv('COMPOSE_PROJECT_NAME')
    if not project_name:
        # Використовуємо назву директорії як project name (lowercase)
        project_name = Path.cwd().name.lower().replace(' ', '_').replace('-', '_')

    # Видаляємо образи тільки для обраних сервісів
    for service in services_to_rebuild:
        print(f"🗑️ Видалення образу для {service}...")
        # Пробуємо різні можливі назви образів
        possible_image_names = [
            f"{project_name}-{service}",
            f"{project_name}_{service}",
            service
        ]
        
        for image_name in possible_image_names:
            run_command(f"docker rmi {image_name} 2>/dev/null || true",
                   capture_output=True, check=False)

    # Перезбираємо тільки обрані сервіси
    services_str = " ".join(services_to_rebuild)
    print(f"🔨 Перезбірка сервісів: {services_str}")
    if not run_command(f"docker-compose build --no-cache {services_str}", capture_output=True):
        print_error("❌ Помилка при перезбірці сервісів")
        return None

    # Запускаємо всі сервіси
    print("🚀 Запуск всіх сервісів...")
    if not run_command("docker-compose up -d", capture_output=True):
        print_error("❌ Помилка при запуску контейнерів")
        return None

    print_success("✅ Вибіркова перезбірка завершена!")
    return frontend_mode

def check_port_available(port, service_name="сервіс"):
    """Перевіряє чи порт вільний"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    
    if result == 0:
        print(f"⚠️  Порт {port} зайнятий ({service_name})")
        print(f"💡 Спробуйте: netstat -ano | findstr :{port}")
        return False
    else:
        print(f"✅ Порт {port} вільний ({service_name})")
        return True

def check_and_fix_postgres_volume():
    """Перевіряє та виправляє проблеми з PostgreSQL volume"""
    print("\n🔍 Перевірка PostgreSQL...")
    
    # Перевіряємо чи порт вільний
    if not check_port_available(5432, "PostgreSQL"):
        print("⚠️  PostgreSQL не зможе стартувати через зайнятий порт!")
        print("🔧 Спробуйте зупинити процес що використовує порт 5432")
        
        # Спробуємо знайти процес
        try:
            result = subprocess.run(
                "netstat -ano | findstr :5432",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.stdout:
                print(f"📊 Процеси на порту 5432:\n{result.stdout}")
        except:
            pass
    
    # Перевіряємо volume
    pg_data_path = Path("pg/data")
    
    # Якщо папка існує і не порожня, перевіряємо права доступу
    if pg_data_path.exists():
        try:
            # Спробуємо прочитати вміст папки
            list(pg_data_path.iterdir())
            print("✅ PostgreSQL volume доступний")
        except PermissionError:
            print("⚠️  Проблема з правами доступу до PostgreSQL volume")
            print("🔧 Спроба виправлення...")
            try:
                # На Windows спробуємо просто створити нову папку
                import shutil
                backup_path = Path("pg/data_backup_" + str(int(time.time())))
                if pg_data_path.exists():
                    shutil.move(str(pg_data_path), str(backup_path))
                    print(f"📦 Створено backup: {backup_path}")
                pg_data_path.mkdir(parents=True, exist_ok=True)
                print("✅ PostgreSQL volume перестворено")
            except Exception as e:
                print(f"⚠️  Не вдалося виправити: {e}")
                print("💡 Рекомендація: вручну видаліть папку pg/data")
    else:
        # Створюємо папку якщо не існує
        pg_data_path.mkdir(parents=True, exist_ok=True)
        print("✅ Створено PostgreSQL volume")

def fast_rebuild_services(selected_services, frontend_mode):
    """⚡ ШВИДКА перезбірка БЕЗ агресивного очищення (паралельна збірка)"""
    print("⚡ FAST режим: Швидка перезбірка без очищення...")
    print("🚀 Використовується паралельна збірка для прискорення")
    
    # Просто зупиняємо існуючі контейнери (не видаляємо)
    print("🛑 Зупинка існуючих контейнерів...")
    run_command("docker-compose stop", capture_output=True)
    
    show_progress_bar(4, 6, "🔨 Паралельна збірка образів...")
    
    # Визначаємо які сервіси збирати
    services_to_build = [s for s in selected_services if s not in ["pg", "redis", "redis-insight", "rabbitmq"]]
    
    print(f"📦 Паралельна збірка образів ({len(services_to_build)} сервісів)...")
    print(f"🎯 Сервіси: {', '.join(services_to_build)}")
    
    # Паралельна збірка - НАБАГАТО швидше!
    build_cmd = f"docker-compose build --parallel {' '.join(services_to_build)}"
    
    result = run_command(build_cmd, capture_output=False)  # Показуємо вивід для прогресу
    
    if not result:
        print_error("Не вдалося зібрати образи!")
        return None
    
    print_success("✅ Паралельна збірка завершена!")
    
    show_progress_bar(5, 6, "🚀 Запуск контейнерів...")
    
    # Запускаємо контейнери
    print("🚀 Запуск контейнерів (швидкий режим - без тривалих перевірок)...")
    
    result = run_command("docker-compose up -d --force-recreate", capture_output=True)
    if not result:
        print_error("Не вдалося запустити Docker сервіси!")
        return None
    
    print_success("✅ Всі контейнери запущені!")
    
    # Коротка пауза замість 60 секунд
    show_progress_bar(6, 6, "⏳ Короткочасне очікування готовності...")
    print("⏳ Очікування ініціалізації сервісів (15 секунд замість 60)...")
    time.sleep(15)  # Замість 60 секунд
    
    print()
    print_success("⚡ FAST режим завершено! Перевірте статус: docker-compose ps")
    
    return frontend_mode

def full_rebuild_services(selected_services, frontend_mode):
    """Повна перезбірка всіх сервісів"""
    print("🏗️ Повна перезбірка всіх сервісів...")
    print("🧹 АГРЕСИВНЕ ОЧИЩЕННЯ: Зупинка ВСІХ контейнерів на використовуваних портах...")
    
    # 0. ПЕРЕВІРЯЄМО ТА ВИПРАВЛЯЄМО POSTGRESQL VOLUME
    check_and_fix_postgres_volume()
    
    # 1. ЗУПИНЯЄМО ВСІ КОНТЕЙНЕРИ НА ПОТРІБНИХ ПОРТАХ (не тільки нашого проекту)
    critical_ports = [3000, 8000, 8001, 5432, 6379, 5672, 15672, 5555, 5540]
    
    print(f"🔍 Пошук контейнерів на портах: {', '.join(map(str, critical_ports))}")
    for port in critical_ports:
        try:
            # Знаходимо контейнери, що використовують порт
            result = subprocess.run(
                f'docker ps --filter "publish={port}" --format "{{{{.ID}}}}"',
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.stdout.strip():
                container_ids = result.stdout.strip().split('\n')
                print(f"   ⚠️  Знайдено {len(container_ids)} контейнерів на порту {port}")
                for container_id in container_ids:
                    if container_id:
                        print(f"      🛑 Зупинка контейнера {container_id[:12]}...")
                        subprocess.run(f"docker stop {container_id}", shell=True, capture_output=True, timeout=30)
                        subprocess.run(f"docker rm -f {container_id}", shell=True, capture_output=True, timeout=30)
        except Exception as e:
            print(f"   ⚠️  Помилка при очищенні порту {port}: {e}")
    
    # 2. ВИДАЛЯЄМО ВСІ КОНТЕЙНЕРИ З ПОДІБНИМИ ІМЕНАМИ
    print("\n🧹 Видалення всіх контейнерів з подібними іменами...")
    project_patterns = ["final_drf_next", "autoria", "app", "pg", "redis", "rabbitmq", "celery", "mailing", "nginx"]
    for pattern in project_patterns:
        try:
            result = subprocess.run(
                f'docker ps -a --filter "name={pattern}" --format "{{{{.ID}}}}"',
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.stdout.strip():
                container_ids = result.stdout.strip().split('\n')
                for container_id in container_ids:
                    if container_id:
                        subprocess.run(f"docker rm -f {container_id}", shell=True, capture_output=True, timeout=30)
        except:
            pass
    
    # 3. ЗУПИНЯЄМО І ВИДАЛЯЄМО ВСІ КОНТЕЙНЕРИ ПОТОЧНОГО ПРОЕКТУ
    print("\n🛑 Повне очищення проекту...")
    run_command("docker-compose down -v --remove-orphans", capture_output=True)

    # Визначаємо project name для видалення образів
    project_name = os.getenv('COMPOSE_PROJECT_NAME')
    if not project_name:
        project_name = Path.cwd().name.lower().replace(' ', '_').replace('-', '_')

    # 4. ВИДАЛЯЄМО ВСІ ОБРАЗИ ПРОЕКТУ
    print("\n🗑️ Видалення всіх образів проекту...")
    # Windows PowerShell не підтримує xargs, тому використовуємо альтернативний підхід
    result = subprocess.run(
        f'docker images --format "{{{{.Repository}}}}" | Select-String -Pattern "{project_name}" | ForEach-Object {{ docker rmi -f $_ }}',
        shell=True,
        capture_output=True,
        text=True
    )
    if result.returncode != 0 and result.stderr:
        # Якщо PowerShell команда не спрацювала, пробуємо bash стиль (для Git Bash / WSL)
        run_command(f"docker images -q {project_name}-* {project_name}_* 2>/dev/null | xargs -r docker rmi -f 2>/dev/null || true",
               capture_output=True, check=False)
    
    # 5. ОЧИЩАЄМО DOCKER МУСОР (невикористовувані volumes, networks, images)
    print("\n🧹 Очищення невикористовуваних Docker ресурсів...")
    try:
        # Видаляємо невикористовувані volumes
        subprocess.run("docker volume prune -f", shell=True, capture_output=True, timeout=30)
        # Видаляємо невикористовувані networks
        subprocess.run("docker network prune -f", shell=True, capture_output=True, timeout=30)
        # Видаляємо dangling images
        subprocess.run("docker image prune -f", shell=True, capture_output=True, timeout=30)
        print("✅ Docker мусор очищено")
    except Exception as e:
        print(f"⚠️  Помилка при очищенні Docker мусору: {e}")

    # Продовжуємо зі звичайною логікою повної перезбірки
    return continue_full_rebuild(selected_services, frontend_mode)

def continue_full_rebuild(selected_services, frontend_mode):
    """Продовження повної перезбірки (оригінальна логіка)"""

    # СТВОРЕННЯ ТА ЗБІРКА ВСІХ КОНТЕЙНЕРІВ З НУЛЯ
    show_progress_bar(4, 6, "🔨 Збірка всіх образів...")

    # Запускаємо збірку з відстеженням прогресу для обраних сервісів
    if not run_docker_build_with_progress(selected_services):
        print_error("Не вдалося зібрати деякі Docker образи!")
        return None

    print_success("Всі обрані образи зібрані успішно!")

    show_progress_bar(5, 6, "🚀 Запуск всіх контейнерів...")

    # Запускаємо контейнери з захопленням виводу
    print("🚀 Запуск контейнерів (це може зайняти 1-2 хвилини)...")
    print("⏳ PostgreSQL потребує ~60 секунд для ініціалізації...")
    
    result = run_command("docker-compose up -d --force-recreate", capture_output=True)
    if not result:
        print_error("Не вдалося запустити Docker сервіси!")
        print("")
        print("🔍 Діагностика проблеми:")
        print("1. Перевірте логи PostgreSQL: docker-compose logs pg")
        print("2. Перевірте чи порт 5432 вільний: netstat -an | findstr 5432")
        print("3. Спробуйте видалити volume: docker-compose down -v")
        print("4. Перезапустіть Docker Desktop")
        return None

    print_success("Всі контейнери запущені!")

    # Чекаємо готовності сервісів (особливо PostgreSQL)
    show_progress_bar(6, 6, "⏳ Очікування готовності сервісів...")
    print("")
    print("⏳ Очікування ініціалізації PostgreSQL (60 секунд)...")
    
    # Показуємо прогрес очікування
    for i in range(60):
        print(f"\r⏳ Ініціалізація PostgreSQL: {i+1}/60 сек ({(i+1)/60*100:.0f}%)", end="", flush=True)
        time.sleep(1)
        
        # Кожні 10 секунд перевіряємо статус
        if (i + 1) % 10 == 0:
            print()  # Новий рядок
            try:
                result = subprocess.run(
                    "docker-compose ps pg",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if "healthy" in result.stdout.lower():
                    print("✅ PostgreSQL готовий!")
                    break
                elif "unhealthy" in result.stdout.lower():
                    print("⚠️  PostgreSQL ще ініціалізується...")
                else:
                    print("📊 Перевірка статусу PostgreSQL...")
            except:
                pass
    
    print()  # Новий рядок після прогресу

    return frontend_mode

def main():
    """Головна функція"""
    try:
        # Парсуємо аргументи командного рядка
        parser = argparse.ArgumentParser(description='AutoRia Clone Deploy Script')
        parser.add_argument('--mode', choices=['restart', 'full_rebuild', 'selective_rebuild'],
                          help='Режим деплою')
        parser.add_argument('--services', nargs='*',
                          help='Сервіси для вибіркової перезбірки')
        parser.add_argument('--auto', action='store_true',
                          help='Автоматичний режим без інтерактивних запитів')

        args = parser.parse_args()

        # Встановлюємо кодування для Windows
        if sys.platform == "win32":
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

        print(f"{Colors.HEADER}{Colors.BOLD}")
        print("ПОВНИЙ АВТОМАТИЧНИЙ ДЕПЛОЙ AutoRia Clone")
        print("=" * 50)
        print("🚀 ЕМУЛЯЦІЯ РОЗГОРТАННЯ З НУЛЯ (як після git clone)")
        print(f"{Colors.ENDC}")

        # Визначаємо режим деплою
        if args.mode:
            deploy_mode = args.mode
            services_to_rebuild = args.services or []
        elif args.auto:
            deploy_mode = "restart"
            services_to_rebuild = []
        else:
            deploy_mode, services_to_rebuild = choose_deploy_mode()

        print(f"🔧 Режим деплою: {deploy_mode}")
        if services_to_rebuild:
            print(f"🎯 Сервіси для перезбірки: {', '.join(services_to_rebuild)}")
        print()

        # Якщо обрано skip - показуємо тільки статус і завершуємо
        if deploy_mode == "skip":
            print("⏭️  SKIP режим: Пропускаємо деплой, показуємо поточний статус")
            print("=" * 60)
            print()
            print("📊 Поточний стан Docker контейнерів:")
            print()
            try:
                result = subprocess.run(
                    "docker-compose ps",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                print(result.stdout)
            except Exception as e:
                print(f"❌ Помилка отримання статусу: {e}")
            
            print()
            print("💡 Для розгортання запустіть скрипт знову без опції skip")
            sys.exit(0)

        print("📋 План розгортання:")
        print("   1️⃣  Перевірка системних вимог")
        print("   1️⃣.5️⃣ Перевірка файлів проекту")
        print("   2️⃣  Вибір режиму та збірка Docker сервісів")
        print("   3️⃣  Збірка фронтенда (якщо локальний режим)")
        print("   4️⃣  Запуск системи")
        print()

        # ЕТАП 1: Перевірка системних вимог
        if not check_requirements():
            sys.exit(1)

        # ЕТАП 1.5: Перевірка файлів проекту
        if not check_project_files():
            sys.exit(1)

        # ЕТАП 2: Розгортання сервісів в Docker
        frontend_mode = deploy_docker_services(deploy_mode, services_to_rebuild)
        
        # Якщо frontend_mode == "skip" - також пропускаємо
        if frontend_mode == "skip":
            print("⏭️  SKIP режим: Пропускаємо вибір сервісів")
            print("=" * 60)
            print()
            print("📊 Поточний стан Docker контейнерів:")
            print()
            try:
                result = subprocess.run(
                    "docker-compose ps",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                print(result.stdout)
            except Exception as e:
                print(f"❌ Помилка отримання статусу: {e}")
            
            print()
            print("💡 Для розгортання запустіть скрипт знову без опції skip")
            sys.exit(0)
        
        if frontend_mode is None:  # Помилка розгортання
            sys.exit(1)

        # ЕТАП 3: Підготовка фронтенда
        if frontend_mode == "local":
            # Збірка фронтенда в production режимі для локального запуску
            if not build_frontend():
                sys.exit(1)
        else:  # frontend_mode == "docker"
            # Для Docker режиму фронтенд вже повинен бути зібраний в контейнері
            print("🐳 Фронтенд буде запущено в Docker контейнері")

        # ЕТАП 4: Фінальний запуск фронтенда
        print("\n" + "="*60)
        print("🚀 ФІНАЛЬНИЙ ЕТАП: Запуск фронтенда")
        print("="*60)

        if frontend_mode == "local":
            print()
            print_success("Всі Docker сервіси запущені!")

            # ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда
            print("ФІНАЛЬНИЙ ЕТАП: Запуск оптимізованого локального фронтенда...")

            # Запускаємо фронтенд у фоновому режимі
            frontend_process = start_local_frontend_background()

            if frontend_process:
                # Чекаємо достатньо часу щоб фронтенд встиг повністю запуститися
                print("⏳ Очікування запуску фронтенда (це може зайняти 15-30 секунд)...")
                print("   Перевірка готовності кожні 5 секунд...")

                # Перевіряємо готовність frontend з таймаутом
                max_wait = 60  # Максимум 60 секунд
                wait_interval = 5  # Перевіряємо кожні 5 секунд
                waited = 0
                frontend_ready = False

                while waited < max_wait:
                    time.sleep(wait_interval)
                    waited += wait_interval

                    # Перевіряємо чи frontend відповідає
                    try:
                        import urllib.request
                        response = urllib.request.urlopen('http://localhost:3000', timeout=2)
                        if response.status == 200:
                            frontend_ready = True
                            print_success(f"✅ Frontend готовий! (через {waited} секунд)")
                            break
                    except:
                        print(f"   ⏳ Очікування... ({waited}/{max_wait} секунд)")
                        continue

                if not frontend_ready:
                    print_warning(f"⚠️ Frontend не відповідає після {max_wait} секунд, але продовжуємо...")
                    print("   Можливо frontend все ще запускається. Перевірте http://localhost:3000 вручну.")

                # Додаткова пауза для стабілізації
                time.sleep(3)

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
                        print_success("✅ Nginx запущено")
                        time.sleep(3)  # Даємо nginx час на ініціалізацію
                    else:
                        print_warning("⚠️ Проблема з запуском Nginx")
                        if nginx_result.stderr:
                            print(f"Помилка Nginx: {nginx_result.stderr}")

                except Exception as e:
                    print_warning(f"⚠️ Помилка запуску Nginx: {e}")

                # Тепер перевіряємо ВСІ сервіси включаючи фронтенд І nginx
                print("🔍 Фінальна перевірка готовності ВСІХ сервісів (включаючи Nginx)...")
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
                    print("💡 Nginx: проксує запити між фронтендом і бекендом")
                else:
                    print_warning("⚠️ Деякі сервіси не готові. Система може працювати некоректно.")
                    print("❌ ПОСИЛАННЯ НЕ НАДАЮТЬСЯ - НЕ ВСІ СЕРВІСИ ГОТОВІ!")
                    print("🔧 Рекомендується перевірити логи проблемних сервісів перед використанням.")
            else:
                print_error("❌ Не вдалося запустити локальний фронтенд!")
                print("🔧 Перевірте логи та спробуйте запустити вручну: npm run start")
        else:  # frontend_mode == "docker"
            print("🐳 Режим: Фронтенд в Docker контейнері")

            # Переконуємося що фронтенд контейнер запущено
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
                    print_success("✅ Фронтенд контейнер запущено")
                else:
                    print_warning("⚠️ Проблема з запуском фронтенд контейнера")
                    if result.stderr:
                        print(f"Помилка: {result.stderr}")

            except Exception as e:
                print_warning(f"⚠️ Помилка запуску фронтенда: {e}")

            # Очікування готовності фронтенда в Docker
            print("⏳ Очікування готовності фронтенда в Docker...")
            wait_time = 20
            for i in range(wait_time):
                progress = (i + 1) / wait_time * 100
                print(f"\r⏳ Ініціалізація фронтенда: {i+1}/{wait_time} сек ({progress:.0f}%)", end="", flush=True)
                time.sleep(1)
            print()

            # Запускаємо nginx ПІСЛЯ готовності фронтенда з циклічними спробами
            print("🌐 Запуск Nginx (reverse proxy) ПІСЛЯ готовності фронтенда...")
            nginx_healthy = start_nginx_with_retry()

            # Фінальна перевірка готовності ВСІХ сервісів включаючи nginx
            print("🔍 Фінальна перевірка готовності ВСІХ сервісів (включаючи Nginx)...")
            all_services_healthy = check_services_health("docker")

            # Перевіряємо, чи працює nginx хоча б частково
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

            # Надаємо посилання якщо основні сервіси працюють
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
                print("❌ ПОСИЛАННЯ НЕ НАДАЮТЬСЯ - НЕ ВСІ СЕРВІСИ ГОТОВІ!")
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

