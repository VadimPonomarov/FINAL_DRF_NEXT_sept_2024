"""Configuration for web crawler."""

# Базовая конфигурация Crawl4AI
CRAWLER_CONFIG = {
    'headless': True,
    'browser_type': 'chromium',
    'page_timeout': 60000,
    'verbose': True,
}

# Параметры для crawl
CRAWL_PARAMS = {
    'bypass_cache': True,
    'remove_overlay_elements': True,
    'process_iframes': False,
    'screenshot': False,
    'delay_before_return_html': 3.0,
    'wait_for': 'body',
}

# JavaScript для автоматического скроллинга страницы
AUTO_SCROLL_JS = """
async function autoScroll() {
    await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });
}

await autoScroll();
"""

# Конфигурация для глубокого обхода
DEEP_CRAWL_CONFIG = {
    'max_depth': 2,
    'max_links': 5,
    'max_items_per_page': 10,
}

# Retry конфигурация
RETRY_CONFIG = {
    'total': 3,
    'backoff_factor': 1,
    'status_forcelist': [429, 500, 502, 503, 504],
}

# Таймауты для requests
REQUEST_TIMEOUT = {
    'connect': 10,
    'read': 30,
}

# User-Agent для HTTP запросов
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

