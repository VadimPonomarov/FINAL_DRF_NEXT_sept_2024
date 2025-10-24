"""
Улучшенная интеграция Crawl4AI для веб-скрапинга и извлечения контента.
Основана на архитектурных паттернах из проекта PythonLessons2024_AI.
"""

import asyncio
import logging
import re
import os
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from apps.chat.types.types import AgentState

logger = logging.getLogger(__name__)

# Проверка доступности Crawl4AI
try:
    from crawl4ai import AsyncWebCrawler
    CRAWL4AI_AVAILABLE = True
    logger.info("Crawl4AI доступен")
except ImportError:
    CRAWL4AI_AVAILABLE = False
    logger.warning("Crawl4AI не установлен. Установите: pip install crawl4ai")

# Проверка доступности g4f
try:
    import g4f
    from g4f.client import Client
    G4F_AVAILABLE = True
    logger.info("G4F доступен")
except ImportError:
    G4F_AVAILABLE = False
    logger.warning("G4F не установлен. Установите: pip install g4f")


class ImprovedCrawl4AIService:
    """Улучшенный сервис для веб-скрапинга с fallback механизмами."""
    
    def __init__(self):
        self.session = None
        self.retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        self.adapter = HTTPAdapter(max_retries=self.retry_strategy)
        
    def _get_session(self):
        """Получить HTTP сессию с retry стратегией."""
        if self.session is None:
            self.session = requests.Session()
            self.session.mount("http://", self.adapter)
            self.session.mount("https://", self.adapter)
        return self.session
    
    def extract_urls_from_query(self, query: str, context: dict = None) -> List[str]:
        """Извлечь URL из запроса и контекста."""
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, query)
        
        # Также проверить контекст для URL
        if context and 'url' in context:
            urls.append(context['url'])
        
        return urls
    
    def is_valid_url(self, url: str) -> bool:
        """Проверить валидность URL."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    async def crawl_with_crawl4ai(self, url: str, **kwargs) -> Dict[str, Any]:
        """Кролинг с использованием Crawl4AI."""
        if not CRAWL4AI_AVAILABLE:
            raise Exception("Crawl4AI не доступен")
        
        try:
            # Конфигурация для лучшей совместимости с JS-сайтами
            crawler_config = {
                'headless': True,  # Включить headless режим Playwright
                'browser_type': 'chromium',  # Использовать Chromium
                'headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                'page_timeout': 60000,  # Увеличить таймаут для JS-сайтов
                'verbose': True,  # Включить verbose логирование
            }
            
            # Добавить LLM конфигурацию если доступен g4f
            if G4F_AVAILABLE:
                try:
                    g4f_client = Client()
                    crawler_config["llm_config"] = {
                        "provider": "g4f",
                        "model": "gpt-4o",
                        "client": g4f_client,
                        "temperature": 0.1,
                        "max_tokens": 1000,
                    }
                    logger.info("Настроен G4F клиент для Crawl4AI")
                except Exception as e:
                    logger.warning(f"Не удалось настроить G4F: {e}")
            
            async with AsyncWebCrawler(**crawler_config) as crawler:
                # JavaScript для автоматического скроллинга страницы
                scroll_js = """
                // Функция для плавного скроллинга с паузами для загрузки контента
                async function autoScroll() {
                    const scrollStep = 300; // Шаг скроллинга в пикселях
                    const scrollDelay = 500; // Задержка между шагами в мс
                    
                    let lastHeight = document.body.scrollHeight;
                    let currentPosition = 0;
                    
                    while (currentPosition < lastHeight) {
                        window.scrollBy(0, scrollStep);
                        currentPosition += scrollStep;
                        await new Promise(resolve => setTimeout(resolve, scrollDelay));
                        
                        // Проверить, не увеличилась ли высота (динамический контент)
                        let newHeight = document.body.scrollHeight;
                        if (newHeight > lastHeight) {
                            lastHeight = newHeight;
                        }
                    }
                    
                    // Скроллинг в самый верх для финальной проверки
                    window.scrollTo(0, 0);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                await autoScroll();
                """
                
                # Параметры для правильной обработки JS-сайтов с автоскроллингом
                crawl_params = {
                    'url': url,
                    'js_code': scroll_js,  # Добавлен автоматический скроллинг
                    'wait_for': 'body',  # Ждать загрузки body
                    'delay_before_return_html': 3.0,  # Увеличена задержка для выполнения JS и скроллинга
                    'process_iframes': False,
                    'remove_overlay_elements': True,
                    'screenshot': False,
                }
                
                # Объединить с переданными kwargs
                crawl_params.update(kwargs)
                
                logger.info(f"Запуск кролинга с автоскроллингом: {url}, delay={crawl_params.get('delay_before_return_html')}s")
                result = await crawler.arun(**crawl_params)
                
                logger.info(f"Кролинг завершён. Success: {result.success}, Content length: {len(getattr(result, 'markdown', ''))}")
                
                return {
                    "success": result.success,
                    "url": url,
                    "title": getattr(result, "title", ""),
                    "markdown": getattr(result, "markdown", ""),
                    "cleaned_html": getattr(result, "cleaned_html", ""),
                    "media": getattr(result, "media", {}),
                    "links": getattr(result, "links", {}),
                    "metadata": getattr(result, "metadata", {}),
                    "extracted_content": getattr(result, "extracted_content", ""),
                    "error_message": getattr(result, "error_message", ""),
                }
                
        except Exception as e:
            logger.error(f"Ошибка Crawl4AI: {e}")
            raise
    
    async def crawl_with_requests_fallback(self, url: str, **kwargs) -> Dict[str, Any]:
        """Fallback кролинг с использованием requests."""
        try:
            session = self._get_session()
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            # Простое извлечение контента
            content = response.text
            
            # Извлечение заголовка
            title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else ""
            
            # Простое извлечение текста (удаление HTML тегов)
            text_content = re.sub(r'<[^>]+>', ' ', content)
            text_content = re.sub(r'\s+', ' ', text_content).strip()
            
            return {
                "success": True,
                "url": url,
                "title": title,
                "markdown": text_content[:5000],  # Ограничение длины
                "cleaned_html": content,
                "media": {"images": []},
                "links": {"external": []},
                "metadata": {"method": "requests_fallback"},
                "extracted_content": text_content[:2000],
                "error_message": "",
            }
            
        except Exception as e:
            logger.error(f"Ошибка requests fallback: {e}")
            raise
    
    async def crawl_url(self, url: str, **kwargs) -> Dict[str, Any]:
        """Основной метод кролинга с fallback."""
        if not self.is_valid_url(url):
            raise ValueError(f"Невалидный URL: {url}")
        
        # Попытка 1: Crawl4AI
        if CRAWL4AI_AVAILABLE:
            try:
                logger.info(f"Попытка кролинга с Crawl4AI: {url}")
                return await self.crawl_with_crawl4ai(url, **kwargs)
            except Exception as e:
                logger.warning(f"Crawl4AI не удался: {e}, пробуем fallback")
        
        # Попытка 2: Requests fallback
        try:
            logger.info(f"Попытка кролинга с requests fallback: {url}")
            return await self.crawl_with_requests_fallback(url, **kwargs)
        except Exception as e:
            logger.error(f"Все методы кролинга не удались: {e}")
            raise
    
    async def crawl_deep(self, url: str, max_depth: int = 2, max_links: int = 5, **kwargs) -> Dict[str, Any]:
        """
        Глубокий обход ссылок на сайте.
        
        Args:
            url: Стартовый URL
            max_depth: Максимальная глубина обхода (по умолчанию 2)
            max_links: Максимальное количество ссылок для обхода на каждом уровне (по умолчанию 5)
            **kwargs: Дополнительные параметры для кролинга
            
        Returns:
            Словарь с результатами глубокого обхода
        """
        visited_urls = set()
        all_results = []
        
        async def crawl_recursive(current_url: str, depth: int = 0):
            # Проверка условий остановки
            if depth > max_depth or current_url in visited_urls:
                return
            
            visited_urls.add(current_url)
            logger.info(f"Глубокий обход: {current_url} (глубина: {depth})")
            
            try:
                # Кролинг текущего URL
                result = await self.crawl_url(current_url, **kwargs)
                all_results.append({
                    "url": current_url,
                    "depth": depth,
                    "result": result
                })
                
                # Если не достигнута максимальная глубина, обходим ссылки
                if depth < max_depth:
                    # Получить внутренние ссылки
                    internal_links = result.get("links", {}).get("internal", [])
                    
                    # Ограничить количество ссылок
                    links_to_visit = internal_links[:max_links]
                    
                    # Рекурсивно обойти каждую ссылку
                    for link in links_to_visit:
                        link_url = link.get("href", "") if isinstance(link, dict) else link
                        
                        # Пропустить якорные ссылки и уже посещенные
                        if link_url and not link_url.startswith('#') and link_url not in visited_urls:
                            # Преобразовать относительные URL в абсолютные
                            if not link_url.startswith('http'):
                                from urllib.parse import urljoin
                                link_url = urljoin(current_url, link_url)
                            
                            await crawl_recursive(link_url, depth + 1)
                            
            except Exception as e:
                logger.error(f"Ошибка при глубоком обходе {current_url}: {e}")
        
        # Начать рекурсивный обход
        await crawl_recursive(url, 0)
        
        return {
            "success": True,
            "base_url": url,
            "total_pages": len(all_results),
            "results": all_results,
            "visited_urls": list(visited_urls)
        }
    
    def format_results(self, result: Dict[str, Any]) -> str:
        """Форматирование результатов кролинга - простое, без хардкода."""
        if not result.get("success"):
            return f"❌ Не удалось получить данные с {result.get('url', 'URL')}"
        
        formatted_parts = []
        
        # Заголовок страницы
        if result.get("title"):
            formatted_parts.append(f"**📄 Заголовок:** {result['title']}\n")
        
        # URL
        formatted_parts.append(f"**🔗 URL:** {result['url']}\n")
        
        # Извлеченный контент или markdown
        content = result.get("extracted_content") or result.get("markdown", "")
        if content:
            if len(content) > 1500:
                content = content[:1500] + "...\n\n[Контент обрезан]"
            formatted_parts.append(f"**📝 Контент:**\n{content}\n")
        
        # Медиа информация
        if result.get("media", {}).get("images"):
            image_count = len(result["media"]["images"])
            formatted_parts.append(f"**🖼️ Изображения:** {image_count} найдено\n")
        
        # Ссылки
        if result.get("links", {}).get("external"):
            link_count = len(result["links"]["external"])
            formatted_parts.append(f"**🔗 Внешние ссылки:** {link_count} найдено\n")
        
        return "\n".join(formatted_parts)
    
    def format_deep_results(self, deep_result: Dict[str, Any]) -> str:
        """Форматирование результатов глубокого обхода."""
        if not deep_result.get("success"):
            return "❌ Глубокий обход не удался"
        
        formatted_parts = []
        formatted_parts.append(f"**🌐 Глубокий обход сайта:**\n")
        formatted_parts.append(f"**🏠 Базовый URL:** {deep_result['base_url']}")
        formatted_parts.append(f"**📊 Всего страниц:** {deep_result['total_pages']}\n")
        
        # Форматировать результаты по глубине
        for item in deep_result.get("results", []):
            depth = item.get("depth", 0)
            url = item.get("url", "")
            result = item.get("result", {})
            
            indent = "  " * depth
            formatted_parts.append(f"{indent}**{'📍' if depth == 0 else '🔗'} Уровень {depth}:** {url}")
            
            if result.get("title"):
                formatted_parts.append(f"{indent}  📄 {result['title']}")
            
            # Показать краткое содержимое (первые 200 символов)
            content = result.get("markdown", "")
            if content:
                preview = content[:200].replace('\n', ' ').strip()
                if len(content) > 200:
                    preview += "..."
                formatted_parts.append(f"{indent}  💬 {preview}\n")
        
        return "\n".join(formatted_parts)


# Глобальный экземпляр сервиса
crawl_service = ImprovedCrawl4AIService()


def improved_crawl4ai_extract_node(state: AgentState) -> AgentState:
    """
    Улучшенный узел извлечения контента с веб-страниц.
    
    Args:
        state: Текущее состояние агента
        
    Returns:
        Обновленное состояние с извлеченным контентом
    """
    try:
        # Извлечь URL из запроса и контекста
        urls = crawl_service.extract_urls_from_query(state.query, state.context)
        
        if not urls:
            return state.model_copy(
                update={
                    "error": "❌ URL не найден в запросе. Пожалуйста, предоставьте URL для кролинга."
                }
            )
        
        # Взять первый URL
        url = urls[0]
        
        # Получить параметры из контекста
        extraction_strategy = state.context.get("extraction_strategy")
        css_selector = state.context.get("css_selector")
        word_count_threshold = state.context.get("word_count_threshold", 10)
        
        # Выполнить кролинг
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                crawl_service.crawl_url(
                    url=url,
                    extraction_strategy=extraction_strategy,
                    css_selector=css_selector,
                    word_count_threshold=word_count_threshold,
                )
            )
        finally:
            loop.close()
        
        if not result.get("success"):
            return state.model_copy(
                update={
                    "error": f"❌ Не удалось получить данные с {url}: {result.get('error_message', 'Неизвестная ошибка')}"
                }
            )
        
        # Форматировать результаты
        formatted_result = crawl_service.format_results(result)
        
        # Сохранить результаты в состоянии
        state.add_intermediate_result("crawl4ai_result", result)
        state.add_intermediate_result("crawled_url", url)
        
        return state.model_copy(
            update={
                "result": formatted_result,
                "html": result.get("cleaned_html", ""),
                "metadata": {
                    **state.metadata,
                    "crawled_url": url,
                    "page_title": result.get("title", ""),
                    "content_length": len(result.get("markdown", "")),
                    "has_extracted_content": bool(result.get("extracted_content")),
                    "crawl_method": result.get("metadata", {}).get("method", "crawl4ai"),
                },
            }
        )
        
    except Exception as e:
        error_msg = f"❌ Ошибка извлечения контента: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def improved_crawl4ai_ask_node(state: AgentState) -> AgentState:
    """
    Улучшенный узел для анализа веб-контента с AI.
    Поддерживает глубокий обход при необходимости.
    
    Args:
        state: Текущее состояние агента
        
    Returns:
        Обновленное состояние с AI-анализом
    """
    try:
        # Извлечь URL из запроса и контекста
        urls = crawl_service.extract_urls_from_query(state.query, state.context)
        
        if not urls:
            return state.model_copy(
                update={
                    "error": "❌ URL не найден в запросе. Пожалуйста, предоставьте URL для анализа."
                }
            )
        
        url = urls[0]
        
        # Извлечь вопрос из запроса (удалить URL)
        question = state.query.lower()
        for url_to_remove in urls:
            question = question.replace(url_to_remove, "").strip()
        
        # Определить, нужен ли глубокий обход
        deep_crawl_keywords = [
            'глубок', 'deep', 'все страниц', 'all pages', 'полностью', 'completely',
            'весь сайт', 'whole site', 'entire site', 'подробно', 'detailed',
            'цен', 'price', 'прайс', 'стоимост', 'товар', 'product', 'каталог', 'catalog'
        ]
        
        needs_deep_crawl = any(keyword in question for keyword in deep_crawl_keywords)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            if needs_deep_crawl:
                # Глубокий обход для поиска информации на подстраницах
                logger.info(f"Запуск глубокого обхода для {url}")
                deep_result = loop.run_until_complete(
                    crawl_service.crawl_deep(
                        url=url,
                        max_depth=2,  # До 2 уровней вглубь
                        max_links=5,  # До 5 ссылок на каждом уровне
                    )
                )
                
                # Собрать весь контент со всех страниц и извлечь цены
                all_content = []
                prices_found = []
                
                import re
                
                # Словарь для дедупликации URL (http vs https)
                seen_urls = {}
                
                for item in deep_result.get("results", []):
                    result = item.get("result", {})
                    raw_content = result.get("markdown", "")
                    if not raw_content:
                        raw_content = result.get("cleaned_html", "")
                    
                    page_url = item.get('url', '')
                    
                    # Нормализуем URL для дедупликации (убираем http/https различия)
                    normalized_url = page_url.replace('http://', 'https://').rstrip('/')
                    
                    if not raw_content:
                        continue
                    
                    # ШАГ 1: ПОЛНОСТЬЮ УДАЛЯЕМ base64 изображения ИЗ ИСХОДНОГО контента
                    content = re.sub(r'data:image/[^;]+;base64,[A-Za-z0-9+/=]{50,}', '', raw_content, flags=re.DOTALL)
                    content = re.sub(r'!\[.*?\]\(data:image[^\)]*\)', '', content)
                    content = re.sub(r'<img[^>]*src="data:image[^"]*"[^>]*>', '', content)
                    
                    # ШАГ 2: Извлечение цен с расширенным контекстом (60 символов)
                    price_patterns = [
                        # Формат "Ціна: 150 ₴"
                        r'(?:ціна|цена|price|вартість)[:\s]+(\d{2,}(?:[.,]\d{2})?)\s*(?:грн|₴|uah)',
                        # Просто "150 грн"
                        r'\b(\d{2,}(?:[.,]\d{2})?)\s*(?:грн|₴|uah)\b',
                    ]
                    
                    page_prices = []
                    page_items = []  # Структурированные данные: {название, цена}
                    
                    logger.info(f"🔍 Поиск цен на странице: {page_url}")
                    logger.info(f"📄 Длина контента: {len(content)} символов")
                    
                    for pattern in price_patterns:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        for match in matches:
                            price_str = match.group(1)
                            clean_price = price_str.replace(' ', '').replace(',', '.')
                            
                            try:
                                price_val = float(clean_price)
                                if 10 <= price_val <= 100000 and clean_price not in page_prices:
                                    # Извлекаем РАСШИРЕННЫЙ контекст (60 символов ДО цены)
                                    start = max(0, match.start() - 60)
                                    end = match.start()
                                    context = content[start:end].strip()
                                    
                                    # Извлекаем название товара из контекста
                                    # Берем последнюю строку/предложение перед ценой
                                    item_name = context.split('\n')[-1].strip()
                                    if not item_name or len(item_name) < 3:
                                        item_name = "Товар"
                                    
                                    # Очищаем от мусора (ссылки, символы)
                                    item_name = re.sub(r'\(https?://[^\)]+\)', '', item_name)
                                    item_name = re.sub(r'[*_\[\]#]+', '', item_name)
                                    item_name = item_name[:50].strip()  # Макс 50 символов
                                    
                                    page_prices.append(clean_price)
                                    page_items.append({
                                        'name': item_name,
                                        'price': clean_price
                                    })
                                    logger.info(f"  ✅ Цена найдена: {clean_price} грн — {item_name[:30]}")
                            except Exception as e:
                                logger.warning(f"  ⚠️ Ошибка обработки цены '{price_str}': {e}")
                    
                    # Проверяем, не видели ли мы этот URL ранее
                    is_new_url = normalized_url not in seen_urls
                    
                    # Дедупликация URL + сохранение цен
                    if page_items and is_new_url:
                        prices_found.append({
                            'url': page_url,
                            'items': page_items[:10]  # Максимум 10 товаров с одной страницы
                        })
                    
                    # ШАГ 3: Сохранить только ТЕКСТОВЫЙ контент (БЕЗ изображений)
                    # Убираем все ссылки на изображения
                    clean_content = re.sub(r'!\[.*?\]\([^\)]+\)', '', content)
                    clean_content = clean_content[:800].strip()  # Короче для компактности
                    
                    # Сохраняем контент только для новых URL
                    if is_new_url:
                        all_content.append(f"📄 **{page_url}**\n{clean_content[:400]}")
                        seen_urls[normalized_url] = True  # Отмечаем URL как обработанный ПОСЛЕ всех операций
                
                combined_content = "\n\n".join(all_content)
                
                # ЛОГИРОВАНИЕ для отладки
                logger.info(f"📊 Парсинг завершен: найдено {len(prices_found)} страниц с ценами")
                for pf in prices_found:
                    logger.info(f"  • {pf['url']}: {len(pf.get('items', []))} товаров")
                
                # Форматировать ответ с ценами
                response = f"**🔍 Глубокий анализ {url}:**\n\n"
                
                # СТРУКТУРИРОВАННЫЙ ВЫВОД ЦЕН (таблица товаров)
                if prices_found:
                    response += "**💰 НАЙДЕННЫЕ ТОВАРЫ И ЦЕНЫ:**\n\n"
                    
                    total_items = 0
                    for page_info in prices_found:
                        items = page_info.get('items', [])
                        if not items:
                            continue
                        
                        response += f"📄 **{page_info['url']}**\n\n"
                        response += "| Товар | Цена |\n"
                        response += "|-------|------|\n"
                        
                        for item in items:
                            name = item.get('name', 'Товар')[:60]  # Обрезаем длинные названия
                            price = item.get('price', '0')
                            response += f"| {name} | **{price} грн** |\n"
                            total_items += 1
                        
                        response += "\n"
                    
                    response += f"**📊 Всего найдено:** {total_items} товар(ов)\n\n"
                    response += "---\n\n"
                else:
                    response += "**⚠️ Цены не найдены** на просканированных страницах.\n\n"
                
                # Краткая сводка по обходу (без избыточного контента)
                response += f"**🌐 Глубокий обход:** {len(deep_result.get('results', []))} страниц\n\n"
                
                # Показываем ТОЛЬКО краткий контент (если нет цен)
                if not prices_found and combined_content:
                    response += f"**📝 Фрагмент контента:**\n{combined_content[:1000]}"
                    if len(combined_content) > 1000:
                        response += "\n\n_[контент сокращен для читаемости]_"
                
                state.add_intermediate_result("deep_crawl_result", deep_result)
                metadata = {
                    **state.metadata,
                    "analyzed_url": url,
                    "question": question,
                    "deep_crawl": True,
                    "pages_analyzed": deep_result.get("total_pages", 0),
                }
                
            else:
                # Обычный анализ одной страницы с умным extraction strategy
                if not question:
                    question = "О чем эта страница?"
                
                # Универсальный промпт для извлечения данных - пусть LLM сам решает как форматировать
                extraction_strategy = f"""
You are an intelligent data extraction assistant. Analyze the page content and answer the user's question.

User's question: {question}

Instructions:
1. If the page contains TABULAR DATA (prices, rates, lists, etc.):
   - Extract ALL relevant data
   - Format it as a clear MARKDOWN TABLE with | separators
   - Include column headers
   - Example format:
     | Column1 | Column2 | Column3 |
     |---------|---------|---------|
     | Data1   | Data2   | Data3   |

2. If the question asks for SPECIFIC DATA (prices, rates, numbers):
   - Extract ALL matching items
   - Present them in structured format (table or list)
   - Include units and context

3. For general questions:
   - Provide a comprehensive answer
   - Use the original language of the question
   - Include relevant details from the page

4. Always respond in the SAME LANGUAGE as the user's question.

Now analyze the page and provide the best possible answer with proper formatting.
"""
                
                result = loop.run_until_complete(
                    crawl_service.crawl_url(
                        url=url, 
                        extraction_strategy=extraction_strategy
                    )
                )
                
                if not result.get("success"):
                    return state.model_copy(
                        update={
                            "error": f"❌ Не удалось проанализировать {url}: {result.get('error_message', 'Неизвестная ошибка')}"
                        }
                    )
                
                # Получить AI-ответ - LLM уже сформатировал его правильно
                answer = result.get("extracted_content", "")
                if not answer:
                    # Фолбэк на markdown контент
                    answer = result.get("markdown", "")[:2000]
                    if not answer:
                        answer = f"Я смог получить доступ к странице '{result.get('title', url)}', но не смог извлечь текстовый контент."
                
                # Форматировать ответ - минимальная обработка
                response = f"**🔍 Анализ {url}:**\n\n"
                if result.get("title"):
                    response += f"**📄 Заголовок страницы:** {result['title']}\n\n"
                
                response += f"{answer}"
                
                state.add_intermediate_result("crawl4ai_ask_result", result)
                metadata = {
                    **state.metadata,
                    "analyzed_url": url,
                    "question": question,
                    "page_title": result.get("title", ""),
                    "ai_analysis": True,
                    "deep_crawl": False,
                    "crawl_method": result.get("metadata", {}).get("method", "crawl4ai"),
                }
        finally:
            loop.close()
        
        state.add_intermediate_result("question", question)
        state.add_intermediate_result("analyzed_url", url)
        
        # Добавить сообщение в чат
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": metadata,
        })
        
    except Exception as e:
        error_msg = f"❌ Ошибка AI-анализа: {str(e)}"
        logger.error(error_msg)
        import traceback
        logger.error(traceback.format_exc())
        return state.model_copy(update={"error": error_msg})


def improved_crawl4ai_multi_url_node(state: AgentState) -> AgentState:
    """
    Улучшенный узел для кролинга нескольких URL.
    
    Args:
        state: Текущее состояние агента
        
    Returns:
        Обновленное состояние с объединенными результатами
    """
    try:
        # Извлечь URL из запроса и контекста
        urls = crawl_service.extract_urls_from_query(state.query, state.context)
        
        if not urls:
            return state.model_copy(
                update={
                    "error": "❌ URL не найдены в запросе. Пожалуйста, предоставьте URL для кролинга."
                }
            )
        
        # Ограничить количество для предотвращения злоупотреблений
        max_urls = state.context.get("max_urls", 3)
        urls = urls[:max_urls]
        
        results = []
        combined_content = []
        
        # Кролинг каждого URL
        for url in urls:
            if not crawl_service.is_valid_url(url):
                continue
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        crawl_service.crawl_url(url=url)
                    )
                finally:
                    loop.close()
                
                if result.get("success"):
                    results.append(result)
                    combined_content.append(
                        f"## {result.get('title', url)}\n{result.get('markdown', '')[:1000]}...\n"
                    )
                
            except Exception as e:
                logger.error(f"Ошибка кролинга {url}: {e}")
                continue
        
        if not results:
            return state.model_copy(
                update={"error": "❌ Не удалось получить данные ни с одного из предоставленных URL."}
            )
        
        # Форматировать объединенные результаты
        formatted_result = f"**🌐 Проанализировано {len(results)} URL:**\n\n" + "\n".join(combined_content)
        
        # Сохранить результаты
        state.add_intermediate_result("multi_crawl_results", results)
        state.add_intermediate_result("crawled_urls", [r["url"] for r in results])
        
        return state.model_copy(
            update={
                "result": formatted_result,
                "metadata": {
                    **state.metadata,
                    "crawled_urls_count": len(results),
                    "total_urls_requested": len(urls),
                    "multi_url_crawl": True,
                },
            }
        )
        
    except Exception as e:
        error_msg = f"❌ Ошибка множественного кролинга: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
