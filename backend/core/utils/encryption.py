"""
Модуль для шифрования и дешифрования API ключей и других чувствительных данных
"""

import base64
import logging
import os

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings

logger = logging.getLogger(__name__)


class EncryptionService:
    """Сервис для шифрования и дешифрования чувствительных данных"""

    def __init__(self):
        self._fernet = None
        self._initialize_encryption()

    def _initialize_encryption(self):
        """Инициализирует систему шифрования"""
        try:
            # Получаем секретный ключ из настроек Django
            secret_key = getattr(settings, "SECRET_KEY", None)

            if not secret_key:
                raise ValueError("Django SECRET_KEY не найден")

            # Создаем ключ для шифрования на основе SECRET_KEY
            password = secret_key.encode()
            salt = b"stable_salt_for_api_keys"  # Фиксированная соль для стабильности

            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )

            key = base64.urlsafe_b64encode(kdf.derive(password))
            self._fernet = Fernet(key)

            logger.info("Система шифрования инициализирована успешно")

        except Exception as e:
            logger.error(f"Ошибка инициализации системы шифрования: {e}")
            raise

    def encrypt(self, data: str) -> str:
        """
        Шифрует строку и возвращает зашифрованные данные в base64

        Args:
            data: Строка для шифрования

        Returns:
            Зашифрованная строка в base64
        """
        try:
            if not data:
                return ""

            encrypted_data = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()

        except Exception as e:
            logger.error(f"Ошибка шифрования данных: {e}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        """
        Дешифрует данные из base64

        Args:
            encrypted_data: Зашифрованная строка в base64

        Returns:
            Расшифрованная строка
        """
        try:
            if not encrypted_data:
                return ""

            # Декодируем из base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())

            # Дешифруем
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            return decrypted_data.decode()

        except Exception as e:
            logger.error(f"Ошибка дешифрования данных: {e}")
            raise

    def encrypt_api_key(self, api_key: str, key_name: str = "API_KEY") -> str:
        """
        Шифрует API ключ с дополнительной информацией

        Args:
            api_key: API ключ для шифрования
            key_name: Название ключа для логирования

        Returns:
            Зашифрованный API ключ
        """
        try:
            encrypted_key = self.encrypt(api_key)
            logger.info(f"API ключ '{key_name}' зашифрован успешно")
            return encrypted_key

        except Exception as e:
            logger.error(f"Ошибка шифрования API ключа '{key_name}': {e}")
            raise

    def decrypt_api_key(self, encrypted_api_key: str, key_name: str = "API_KEY") -> str:
        """
        Дешифрует API ключ

        Args:
            encrypted_api_key: Зашифрованный API ключ
            key_name: Название ключа для логирования

        Returns:
            Расшифрованный API ключ
        """
        try:
            decrypted_key = self.decrypt(encrypted_api_key)
            logger.debug(f"API ключ '{key_name}' дешифрован успешно")
            return decrypted_key

        except Exception as e:
            logger.error(f"Ошибка дешифрования API ключа '{key_name}': {e}")
            raise


# Глобальный экземпляр сервиса шифрования
encryption_service = EncryptionService()


def encrypt_google_api_key() -> str:
    """
    Шифрует Google API ключ

    Returns:
        Зашифрованный Google API ключ
    """
    # Ваш Google API ключ
    google_api_key = "AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs"

    try:
        encrypted_key = encryption_service.encrypt_api_key(
            google_api_key, "GOOGLE_API_KEY"
        )

        print(f"Зашифрованный Google API ключ:")
        print(f"ENCRYPTED_GOOGLE_API_KEY = '{encrypted_key}'")
        print(f"\nДобавьте эту строку в ваши настройки окружения")

        return encrypted_key

    except Exception as e:
        logger.error(f"Ошибка шифрования Google API ключа: {e}")
        raise


def decrypt_google_api_key(encrypted_key: str) -> str:
    """
    Дешифрует Google API ключ

    Args:
        encrypted_key: Зашифрованный ключ

    Returns:
        Расшифрованный Google API ключ
    """
    try:
        return encryption_service.decrypt_api_key(encrypted_key, "GOOGLE_API_KEY")

    except Exception as e:
        logger.error(f"Ошибка дешифрования Google API ключа: {e}")
        raise


def get_google_api_key() -> str:
    """
    Получает расшифрованный Google API ключ из переменных окружения

    Returns:
        Расшифрованный Google API ключ или None если не найден
    """
    try:
        # Получаем зашифрованный ключ из переменных окружения
        encrypted_key = os.environ.get("ENCRYPTED_GOOGLE_API_KEY")

        if not encrypted_key:
            logger.warning("ENCRYPTED_GOOGLE_API_KEY не найден в переменных окружения")
            return None

        # Дешифруем ключ
        decrypted_key = decrypt_google_api_key(encrypted_key)
        return decrypted_key

    except Exception as e:
        logger.error(f"Ошибка получения Google API ключа: {e}")
        return None


def encrypt_bing_api_key() -> str:
    """
    Шифрует Bing API ключ

    Returns:
        Зашифрованный Bing API ключ
    """
    # Ваш Bing API ключ (замените на реальный)
    bing_api_key = "YOUR_BING_API_KEY_HERE"

    try:
        encrypted_key = encryption_service.encrypt_api_key(bing_api_key, "BING_API_KEY")

        print(f"Зашифрованный Bing API ключ:")
        print(f"ENCRYPTED_BING_API_KEY = '{encrypted_key}'")
        print(f"\nДобавьте эту строку в ваши настройки окружения")

        return encrypted_key

    except Exception as e:
        logger.error(f"Ошибка шифрования Bing API ключа: {e}")
        raise


def decrypt_bing_api_key(encrypted_key: str) -> str:
    """
    Дешифрует Bing API ключ

    Args:
        encrypted_key: Зашифрованный ключ

    Returns:
        Расшифрованный Bing API ключ
    """
    try:
        return encryption_service.decrypt_api_key(encrypted_key, "BING_API_KEY")

    except Exception as e:
        logger.error(f"Ошибка дешифрования Bing API ключа: {e}")
        raise


def get_bing_api_key() -> str:
    """
    Получает расшифрованный Bing API ключ из переменных окружения

    Returns:
        Расшифрованный Bing API ключ или None если не найден
    """
    try:
        # Получаем зашифрованный ключ из переменных окружения
        encrypted_key = os.environ.get("ENCRYPTED_BING_API_KEY")

        if not encrypted_key:
            logger.warning("ENCRYPTED_BING_API_KEY не найден в переменных окружения")
            return None

        # Дешифруем ключ
        decrypted_key = decrypt_bing_api_key(encrypted_key)
        return decrypted_key

    except Exception as e:
        logger.error(f"Ошибка получения Bing API ключа: {e}")
        return None


def encrypt_google_search_engine_id(search_engine_id: str) -> str:
    """
    Шифрует Google Search Engine ID

    Args:
        search_engine_id: ID поисковой системы для шифрования

    Returns:
        Зашифрованный Search Engine ID
    """
    try:
        encrypted_id = encryption_service.encrypt_api_key(
            search_engine_id, "GOOGLE_SEARCH_ENGINE_ID"
        )

        print(f"Зашифрованный Google Search Engine ID:")
        print(f"ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID = '{encrypted_id}'")
        print(f"\nДобавьте эту строку в ваши настройки окружения")

        return encrypted_id

    except Exception as e:
        logger.error(f"Ошибка шифрования Google Search Engine ID: {e}")
        raise


def decrypt_google_search_engine_id(encrypted_id: str) -> str:
    """
    Дешифрует Google Search Engine ID

    Args:
        encrypted_id: Зашифрованный ID

    Returns:
        Расшифрованный Google Search Engine ID
    """
    try:
        return encryption_service.decrypt_api_key(
            encrypted_id, "GOOGLE_SEARCH_ENGINE_ID"
        )

    except Exception as e:
        logger.error(f"Ошибка дешифрования Google Search Engine ID: {e}")
        raise


def get_google_search_engine_id() -> str:
    """
    Получает расшифрованный Google Search Engine ID из переменных окружения

    Returns:
        Расшифрованный Google Search Engine ID или None если не найден
    """
    try:
        # Сначала пробуем получить зашифрованный ID
        encrypted_id = os.environ.get("ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID")

        if encrypted_id:
            # Дешифруем ID
            decrypted_id = decrypt_google_search_engine_id(encrypted_id)
            return decrypted_id

        # Если зашифрованного нет, пробуем получить обычный (для обратной совместимости)
        plain_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        if plain_id:
            logger.warning(
                "Используется незашифрованный GOOGLE_SEARCH_ENGINE_ID. Рекомендуется использовать ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID"
            )
            return plain_id

        logger.warning(
            "ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID и GOOGLE_SEARCH_ENGINE_ID не найдены в переменных окружения"
        )
        return None

    except Exception as e:
        logger.error(f"Ошибка получения Google Search Engine ID: {e}")
        return None


def get_google_search_engine_id() -> str:
    """
    Получает расшифрованный Google Search Engine ID из переменных окружения

    Returns:
        Расшифрованный Google Search Engine ID или None если не найден
    """
    try:
        # Сначала пробуем получить зашифрованный ID
        encrypted_id = os.environ.get("ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID")

        if encrypted_id:
            # Дешифруем ID
            decrypted_id = encryption_service.decrypt_api_key(
                encrypted_id, "GOOGLE_SEARCH_ENGINE_ID"
            )
            return decrypted_id

        # Если зашифрованного нет, пробуем получить обычный (для обратной совместимости)
        plain_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        if plain_id:
            logger.warning(
                "Используется незашифрованный GOOGLE_SEARCH_ENGINE_ID. Рекомендуется использовать ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID"
            )
            return plain_id

        logger.warning(
            "ENCRYPTED_GOOGLE_SEARCH_ENGINE_ID и GOOGLE_SEARCH_ENGINE_ID не найдены в переменных окружения"
        )
        return None

    except Exception as e:
        logger.error(f"Ошибка получения Google Search Engine ID: {e}")
        return None


if __name__ == "__main__":
    # Скрипт для генерации зашифрованного ключа
    print("🔐 Генерация зашифрованного Google API ключа...")

    try:
        encrypted_key = encrypt_google_api_key()

        print(f"\n✅ Ключ зашифрован успешно!")
        print(f"📋 Длина зашифрованного ключа: {len(encrypted_key)} символов")

        # Тестируем дешифрование
        print(f"\n🧪 Тестирование дешифрования...")
        decrypted_key = decrypt_google_api_key(encrypted_key)

        if decrypted_key == "AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs":
            print(f"✅ Дешифрование работает корректно!")
        else:
            print(f"❌ Ошибка дешифрования!")

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback

        traceback.print_exc()
