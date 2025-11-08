#!/usr/bin/env python3
"""
Script to synchronize translation files:
1. Merge all keys from en.ts, ru.ts, uk.ts
2. Remove duplicates
3. Sort by key (alphabetically)
4. Add missing translations for login/registration forms
5. Write back synchronized files
"""

import re
import json
import os
from pathlib import Path
from typing import Dict, Any, Set
from collections import OrderedDict

# Paths to translation files
BASE_DIR = Path(__file__).parent.parent
LOCALES_DIR = BASE_DIR / "src" / "locales"
EN_FILE = LOCALES_DIR / "en.ts"
RU_FILE = LOCALES_DIR / "ru.ts"
UK_FILE = LOCALES_DIR / "uk.ts"

# Missing translations for login/registration forms
AUTH_TRANSLATIONS = {
    "auth": {
        "login": {
            "en": "Login",
            "ru": "Вход",
            "uk": "Вхід"
        },
        "register": {
            "en": "Register",
            "ru": "Регистрация",
            "uk": "Реєстрація"
        },
        "email": {
            "en": "Email",
            "ru": "Email",
            "uk": "Email"
        },
        "emailPlaceholder": {
            "en": "Enter your email",
            "ru": "Введите email",
            "uk": "Введіть email"
        },
        "password": {
            "en": "Password",
            "ru": "Пароль",
            "uk": "Пароль"
        },
        "passwordPlaceholder": {
            "en": "Enter your password",
            "ru": "Введите пароль",
            "uk": "Введіть пароль"
        },
        "confirmPassword": {
            "en": "Confirm Password",
            "ru": "Подтвердите пароль",
            "uk": "Підтвердіть пароль"
        },
        "confirmPasswordPlaceholder": {
            "en": "Confirm your password",
            "ru": "Подтвердите пароль",
            "uk": "Підтвердіть пароль"
        },
        "username": {
            "en": "Username",
            "ru": "Имя пользователя",
            "uk": "Ім'я користувача"
        },
        "usernamePlaceholder": {
            "en": "Enter your username",
            "ru": "Введите имя пользователя",
            "uk": "Введіть ім'я користувача"
        },
        "reset": {
            "en": "Reset",
            "ru": "Сбросить",
            "uk": "Скинути"
        },
        "submit": {
            "en": "Submit",
            "ru": "Отправить",
            "uk": "Відправити"
        },
        "loginSuccess": {
            "en": "Authentication successful!",
            "ru": "Аутентификация успешна!",
            "uk": "Аутентифікація успішна!"
        },
        "loginFailed": {
            "en": "Authentication failed",
            "ru": "Ошибка аутентификации",
            "uk": "Помилка аутентифікації"
        },
        "passwordsDoNotMatch": {
            "en": "Passwords do not match",
            "ru": "Пароли не совпадают",
            "uk": "Паролі не співпадають"
        },
        "validationError": {
            "en": "Validation Error",
            "ru": "Ошибка валидации",
            "uk": "Помилка валідації"
        },
        "validationErrorDescription": {
            "en": "Please fill in all required fields correctly",
            "ru": "Пожалуйста, заполните все обязательные поля правильно",
            "uk": "Будь ласка, заповніть всі обов'язкові поля правильно"
        },
        "selectAuthType": {
            "en": "Select auth type",
            "ru": "Выберите тип аутентификации",
            "uk": "Виберіть тип аутентифікації"
        },
        "sessionDuration": {
            "en": "Session Duration (minutes)",
            "ru": "Длительность сессии (минуты)",
            "uk": "Тривалість сесії (хвилини)"
        },
        "minutes": {
            "en": "minutes",
            "ru": "минут",
            "uk": "хвилин"
        }
    }
}


def parse_ts_file(file_path: Path) -> Dict[str, Any]:
    """Parse TypeScript translation file and return dictionary."""
    content = file_path.read_text(encoding='utf-8')
    
    # Remove export default and const declarations
    content = re.sub(r'^export\s+default\s+', '', content, flags=re.MULTILINE)
    content = re.sub(r'^const\s+\w+\s*=\s*', '', content, flags=re.MULTILINE)
    content = re.sub(r';\s*$', '', content.strip())
    
    # Try to parse as JSON (after converting TS to JSON)
    # Replace single quotes with double quotes (simple approach)
    # This is a simplified parser - for production use a proper TS parser
    
    # Use eval with safe context (for script purposes)
    try:
        # Replace TypeScript-specific syntax
        json_str = content
        # Handle single quotes
        json_str = re.sub(r"'([^']*)'", r'"\1"', json_str)
        # Handle trailing commas
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Parse as JSON
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Fallback: use ast.literal_eval or manual parsing
        print(f"Warning: Could not parse {file_path.name} as JSON, using fallback")
        return {}


def get_all_keys(obj: Dict, prefix: str = '') -> Set[str]:
    """Recursively get all keys from nested dictionary."""
    keys = set()
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys.update(get_all_keys(value, full_key))
        else:
            keys.add(full_key)
    return keys


def get_nested_value(obj: Dict, key_path: str):
    """Get value from nested dictionary using dot notation."""
    keys = key_path.split('.')
    current = obj
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return current


def set_nested_value(obj: Dict, key_path: str, value: Any):
    """Set value in nested dictionary using dot notation."""
    keys = key_path.split('.')
    current = obj
    for key in keys[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def sort_dict_recursive(obj: Dict) -> OrderedDict:
    """Recursively sort dictionary by keys."""
    if isinstance(obj, dict):
        return OrderedDict(sorted(
            (k, sort_dict_recursive(v) if isinstance(v, dict) else v)
            for k, v in obj.items()
        ))
    return obj


def dict_to_ts(obj: Dict, indent: int = 0) -> str:
    """Convert dictionary to TypeScript object string."""
    spaces = '  ' * indent
    lines = ['{']
    
    items = sorted(obj.items())
    for i, (key, value) in enumerate(items):
        is_last = i == len(items) - 1
        comma = '' if is_last else ','
        
        if isinstance(value, dict):
            value_str = dict_to_ts(value, indent + 1)
            lines.append(f'{spaces}  {key}: {value_str}{comma}')
        elif isinstance(value, str):
            # Escape single quotes
            escaped = value.replace("'", "\\'")
            lines.append(f'{spaces}  {key}: \'{escaped}\'{comma}')
        elif isinstance(value, (int, float, bool)):
            lines.append(f'{spaces}  {key}: {value}{comma}')
        elif value is None:
            lines.append(f'{spaces}  {key}: null{comma}')
        else:
            lines.append(f'{spaces}  {key}: {json.dumps(value)}{comma}')
    
    lines.append(f'{spaces}}}')
    return '\n'.join(lines)


def sync_translations():
    """Main synchronization function."""
    print("🔄 Starting translation synchronization...\n")
    
    # Read all translation files
    print("📖 Reading translation files...")
    try:
        en_data = parse_ts_file(EN_FILE)
        ru_data = parse_ts_file(RU_FILE)
        uk_data = parse_ts_file(UK_FILE)
    except Exception as e:
        print(f"❌ Error reading files: {e}")
        return
    
    # Get all keys
    en_keys = get_all_keys(en_data)
    ru_keys = get_all_keys(ru_data)
    uk_keys = get_all_keys(uk_data)
    all_keys = en_keys | ru_keys | uk_keys
    
    print(f"📊 Found {len(all_keys)} unique keys")
    print(f"   - EN: {len(en_keys)} keys")
    print(f"   - RU: {len(ru_keys)} keys")
    print(f"   - UK: {len(uk_keys)} keys\n")
    
    # Determine base file (longest)
    base_data = en_data if len(en_keys) >= len(ru_keys) and len(en_keys) >= len(uk_keys) else \
                (ru_data if len(ru_keys) >= len(uk_keys) else uk_data)
    base_name = "EN" if base_data is en_data else ("RU" if base_data is ru_data else "UK")
    print(f"📌 Using {base_name} as base ({len(get_all_keys(base_data))} keys)\n")
    
    # Create synchronized dictionaries
    synced_en = {}
    synced_ru = {}
    synced_uk = {}
    
    # Add auth translations
    for key, translations in AUTH_TRANSLATIONS.items():
        if isinstance(translations, dict) and "en" in translations:
            set_nested_value(synced_en, key, translations["en"])
            set_nested_value(synced_ru, key, translations["ru"])
            set_nested_value(synced_uk, key, translations["uk"])
        else:
            # Handle nested structure
            for sub_key, sub_translations in translations.items():
                full_key = f"{key}.{sub_key}"
                if isinstance(sub_translations, dict) and "en" in sub_translations:
                    set_nested_value(synced_en, full_key, sub_translations["en"])
                    set_nested_value(synced_ru, full_key, sub_translations["ru"])
                    set_nested_value(synced_uk, full_key, sub_translations["uk"])
    
    # Sync all keys
    print("🔄 Synchronizing translations...\n")
    sorted_keys = sorted(all_keys)
    
    for key in sorted_keys:
        en_val = get_nested_value(en_data, key)
        ru_val = get_nested_value(ru_data, key)
        uk_val = get_nested_value(uk_data, key)
        
        # Use base value if missing
        if en_val is None:
            en_val = get_nested_value(base_data, key) or ''
        if ru_val is None:
            ru_val = get_nested_value(base_data, key) or ''
        if uk_val is None:
            uk_val = get_nested_value(base_data, key) or ''
        
        # Set values
        set_nested_value(synced_en, key, en_val)
        set_nested_value(synced_ru, key, ru_val)
        set_nested_value(synced_uk, key, uk_val)
    
    # Sort dictionaries
    sorted_en = sort_dict_recursive(synced_en)
    sorted_ru = sort_dict_recursive(synced_ru)
    sorted_uk = sort_dict_recursive(synced_uk)
    
    # Write files
    print("💾 Writing synchronized files...\n")
    
    en_content = f"const translations = {dict_to_ts(sorted_en)};\n\nexport default translations;"
    ru_content = f"const translations = {dict_to_ts(sorted_ru)};\n\nexport default translations;"
    uk_content = f"const translations = {dict_to_ts(sorted_uk)};\n\nexport default translations;"
    
    EN_FILE.write_text(en_content, encoding='utf-8')
    RU_FILE.write_text(ru_content, encoding='utf-8')
    UK_FILE.write_text(uk_content, encoding='utf-8')
    
    print("✅ Translation synchronization completed!\n")
    print(f"📊 Final statistics:")
    print(f"   - Total keys: {len(all_keys)}")
    print(f"   - EN keys: {len(get_all_keys(sorted_en))}")
    print(f"   - RU keys: {len(get_all_keys(sorted_ru))}")
    print(f"   - UK keys: {len(get_all_keys(sorted_uk))}")


if __name__ == "__main__":
    try:
        sync_translations()
    except Exception as e:
        print(f"❌ Error during synchronization: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

