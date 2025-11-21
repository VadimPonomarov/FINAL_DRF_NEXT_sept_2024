#!/usr/bin/env python3
"""Simple environment check for AutoRia Clone.

Run this script right after `git clone` to verify that all critical
system requirements are satisfied before running `deploy.py` or
`docker-compose`.

Usage (from project root):

    python scripts/check_environment.py

If `python` is not recognized on Windows, try:

    py scripts/check_environment.py
"""

import subprocess
import sys
from typing import Sequence


def run_check(name: str, command: Sequence[str]) -> bool:
    """Run a single check and print a short, user-friendly status line."""
    print(f"[CHECK] {name}:")
    try:
        result = subprocess.run(
            command,
            shell=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        print("  ❌ Команда не знайдена. Переконайтеся, що інструмент встановлено і додано в PATH.")
        return False
    except Exception as exc:  # noqa: BLE001
        print(f"  ❌ Помилка запуску: {exc}")
        return False

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()

    if result.returncode == 0:
        short = stdout.splitlines()[0] if stdout else "OK"
        print(f"  ✅ {short}")
        return True

    print("  ❌ Перевірка не пройдена (returncode != 0)")
    if stdout:
        print("  ├─ stdout:")
        for line in stdout.splitlines():
            print("  │  " + line)
    if stderr:
        print("  ├─ stderr:")
        for line in stderr.splitlines():
            print("  │  " + line)
    return False


def main() -> int:
    print("\n=========================================")
    print("  AutoRia Clone – Environment Check")
    print("=========================================\n")

    all_ok = True

    # Базовий Python: використовуємо поточний інтерпретатор (sys.executable)
    # Сам факт запуску цього скрипта вже означає, що Python є.
    print("[CHECK] Python (current interpreter):")
    try:
        print(f"  ✅ {sys.version.splitlines()[0]} ({sys.executable})")
    except Exception as exc:  # noqa: BLE001
        print(f"  ❌ Неможливо визначити версію Python: {exc}")
        all_ok = False

    # Node.js + npm
    all_ok &= run_check("Node.js", ["node", "--version"])
    all_ok &= run_check("npm", ["npm", "--version"])

    # Docker CLI
    all_ok &= run_check("Docker CLI", ["docker", "--version"])

    # Docker Engine (daemon) – критично для docker-compose та deploy.py
    all_ok &= run_check("Docker Engine (docker info)", ["docker", "info"])

    print()
    if all_ok:
        print("✅ Усі перевірки пройдено. Можна запускати `python deploy.py --mode local` або інші сценарії з DEPLOYMENT.md.")
        return 0

    print("❌ Деякі перевірки не пройдено. Виправте проблеми вище і повторіть перевірку перед деплоєм.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
