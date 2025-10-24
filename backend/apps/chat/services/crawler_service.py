"""Web crawling service using Crawl4AI."""

import asyncio
import logging
from typing import Any, Dict, List, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..config.crawler_config import (
    CRAWLER_CONFIG,
    CRAWL_PARAMS,
    AUTO_SCROLL_JS,
    DEEP_CRAWL_CONFIG,
    RETRY_CONFIG,
    REQUEST_TIMEOUT,
    USER_AGENT,
)
from ..utils.url_utils import (
    extract_urls,
    normalize_url,
    is_internal_link,
    convert_to_absolute_url,
    is_valid_url,
)
from ..utils.text_processing import remove_base64_images
from ..services.price_parser_service import price_parser_service

logger = logging.getLogger(__name__)

# Check Crawl4AI availability
try:
    from crawl4ai import AsyncWebCrawler
    CRAWL4AI_AVAILABLE = True
    logger.info("Crawl4AI доступен")
except ImportError:
    CRAWL4AI_AVAILABLE = False
    logger.warning("Crawl4AI не установлен. Установите: pip install crawl4ai")


class CrawlerService:
    """Service for web scraping with JavaScript rendering support."""
    
    def __init__(self):
        self.session = None
        self.retry_strategy = Retry(**RETRY_CONFIG)
        self.adapter = HTTPAdapter(max_retries=self.retry_strategy)
    
    def _get_session(self) -> requests.Session:
        """Get or create HTTP session with retry strategy."""
        if self.session is None:
            self.session = requests.Session()
            self.session.mount("http://", self.adapter)
            self.session.mount("https://", self.adapter)
            self.session.headers.update({'User-Agent': USER_AGENT})
        return self.session
    
    async def crawl_url(self, url: str, **kwargs) -> Dict[str, Any]:
        """
        Crawl a single URL with JavaScript rendering.
        
        Args:
            url: URL to crawl
            **kwargs: Additional parameters for crawler
            
        Returns:
            Dictionary with crawl results
        """
        if not CRAWL4AI_AVAILABLE:
            return await self._fallback_crawl(url)
        
        try:
            logger.info(f"Запуск кролинга с автоскроллингом: {url}, delay=3.0s")
            
            async with AsyncWebCrawler(**CRAWLER_CONFIG) as crawler:
                # Merge params
                crawl_params = {
                    **CRAWL_PARAMS,
                    'js_code': AUTO_SCROLL_JS,
                    **kwargs
                }
                
                result = await crawler.arun(url, **crawl_params)
                
                success = result.success if hasattr(result, 'success') else False
                content_length = len(result.markdown) if hasattr(result, 'markdown') else 0
                
                logger.info(f"Кролинг завершен. Success: {success}, Content length: {content_length}")
                
                # Extract links - convert to list if it's a Links object
                links = getattr(result, 'links', [])
                if hasattr(links, 'internal') and hasattr(links, 'external'):
                    # It's a Links object, extract internal links
                    links = list(links.internal) if links.internal else []
                elif not isinstance(links, list):
                    # Convert to list if it's not already
                    links = list(links) if links else []
                
                return {
                    'success': success,
                    'url': url,
                    'markdown': getattr(result, 'markdown', ''),
                    'cleaned_html': getattr(result, 'cleaned_html', ''),
                    'links': links,
                }
                
        except Exception as e:
            logger.error(f"❌ Ошибка кролинга {url}: {e}")
            return await self._fallback_crawl(url)
    
    async def _fallback_crawl(self, url: str) -> Dict[str, Any]:
        """Fallback crawling using simple HTTP request."""
        try:
            session = self._get_session()
            response = session.get(url, timeout=REQUEST_TIMEOUT['read'])
            
            return {
                'success': response.status_code == 200,
                'url': url,
                'markdown': response.text,
                'cleaned_html': response.text,
                'links': extract_urls(response.text),
            }
        except Exception as e:
            logger.error(f"❌ Fallback crawl failed for {url}: {e}")
            return {
                'success': False,
                'url': url,
                'markdown': '',
                'cleaned_html': '',
                'links': [],
            }
    
    async def crawl_deep(
        self, 
        url: str, 
        max_depth: int = 2, 
        max_links: int = 5
    ) -> Dict[str, Any]:
        """
        Perform deep crawling (follow internal links).
        
        Args:
            url: Starting URL
            max_depth: Maximum depth to crawl
            max_links: Maximum links per page
            
        Returns:
            Dictionary with all crawled pages
        """
        logger.info(f"Глубокий обход: {url} (глубина: {max_depth})")
        
        visited = set()
        results = []
        
        async def crawl_recursive(current_url: str, depth: int):
            if depth > max_depth or current_url in visited:
                return
            
            visited.add(current_url)
            logger.info(f"Попытка кролинга с Crawl4AI: {current_url}")
            
            result = await self.crawl_url(current_url)
            results.append({'url': current_url, 'result': result, 'depth': depth})
            
            if depth < max_depth:
                links = result.get('links', [])[:max_links]
                for link in links:
                    absolute_link = convert_to_absolute_url(link, current_url)
                    if is_internal_link(absolute_link, url) and absolute_link not in visited:
                        await crawl_recursive(absolute_link, depth + 1)
        
        await crawl_recursive(url, 0)
        
        return {
            'base_url': url,
            'total_pages': len(results),
            'results': results
        }
    
    def process_crawl_results(
        self, 
        deep_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process deep crawl results: extract prices, clean content, deduplicate.
        
        Args:
            deep_result: Results from crawl_deep
            
        Returns:
            Processed data with prices and content
        """
        url = deep_result.get('base_url', '')
        all_content = []
        prices_found = []
        seen_urls = {}
        
        for item in deep_result.get("results", []):
            result = item.get("result", {})
            raw_content = result.get("markdown", "") or result.get("cleaned_html", "")
            page_url = item.get('url', '')
            
            # Normalize URL for deduplication
            normalized_url = normalize_url(page_url)
            is_new_url = normalized_url not in seen_urls
            
            if not raw_content or not is_new_url:
                continue
            
            # Remove base64 images
            content = remove_base64_images(raw_content)
            
            # Extract prices
            price_data = price_parser_service.extract_prices_from_content(content, page_url)
            if price_data.get('items'):
                # Limit items per page
                price_data['items'] = price_data['items'][:DEEP_CRAWL_CONFIG['max_items_per_page']]
                prices_found.append(price_data)
            
            # Save cleaned content
            clean_content = content[:800].strip()
            all_content.append(f"📄 **{page_url}**\n{clean_content[:400]}")
            
            # Mark URL as processed
            seen_urls[normalized_url] = True
        
        return {
            'url': url,
            'prices_found': prices_found,
            'all_content': all_content,
            'total_pages': len(deep_result.get('results', []))
        }
    
    def format_response(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format crawl results with structured table data.
        
        Args:
            processed_data: Processed crawl data
            
        Returns:
            Dict with 'result' (text), 'table_html', 'table_data'
        """
        url = processed_data.get('url', '')
        prices_found = processed_data.get('prices_found', [])
        all_content = processed_data.get('all_content', [])
        total_pages = processed_data.get('total_pages', 0)
        
        # Format prices as structured table data
        table_result = price_parser_service.format_prices_as_structured_data(
            prices_found, 
            include_url=False  # Don't clutter with URLs in simple case
        )
        
        # Build text response with item list (fallback for frontend without table support)
        response_text = f"**🔍 Анализ {url}**\n\n"
        
        if table_result.get('table_html'):
            # Add statistics summary
            response_text += table_result.get('summary', '') + "\n\n"
            
            # Add detailed item list (fallback for frontends without table rendering)
            response_text += "**📦 Найденные товары:**\n\n"
            for item in table_result.get('table_data', []):
                name = item.get('Товар', 'Неизвестно')
                price = item.get('Цена (грн)', '0')
                response_text += f"• {name} — **{price} грн**\n"
            response_text += "\n"
        else:
            response_text += "⚠️ Цены не найдены\n\n"
        
        # Add crawl summary
        response_text += f"**🌐 Просканировано:** {total_pages} страниц"
        
        # Add content preview if no prices found
        if not prices_found and all_content:
            combined_content = "\n\n".join(all_content)
            response_text += f"\n\n**📝 Фрагмент контента:**\n{combined_content[:1000]}"
            if len(combined_content) > 1000:
                response_text += "\n\n_[содержимое обрезано для читаемости]_"
        
        return {
            'result': response_text,
            'table_html': table_result.get('table_html'),
            'table_data': table_result.get('table_data'),
            'stats': table_result.get('stats')
        }


# Global service instance
crawler_service = CrawlerService()

