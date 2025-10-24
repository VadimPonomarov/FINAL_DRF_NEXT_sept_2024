"""
Universal web crawler using Crawl4AI with LLM-based intelligent extraction.
No hardcoded patterns - only AI intelligence.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from apps.chat.config.llm_config import call_llm

logger = logging.getLogger(__name__)

# Check Crawl4AI availability
try:
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
    CRAWL4AI_AVAILABLE = True
    logger.info("✅ Crawl4AI доступен для универсального краулинга")
except ImportError:
    CRAWL4AI_AVAILABLE = False
    logger.warning("❌ Crawl4AI не установлен. Установите: pip install crawl4ai")


class ExtractedData(BaseModel):
    """Universal model for any extracted data."""
    items: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted items with flexible schema")
    summary: str = Field(default="", description="Summary of extracted data")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class UniversalCrawlerService:
    """
    Universal web crawler that uses LLM to intelligently extract ANY data from ANY website.
    No hardcoded patterns - only AI intelligence.
    """
    
    def __init__(self):
        self.default_config = {
            'headless': True,
            'browser_type': 'chromium',
            'page_timeout': 60000,
            'verbose': False,
            # Anti-detection: hide automation, incognito, webdriver
            'magic': True,  # Enable stealth mode
        }
        
        # Realistic browser headers to bypass detection
        self.realistic_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        # Viewport sizes (realistic desktop)
        self.viewport = {
            'width': 1920,
            'height': 1080,
        }
    
    async def crawl_with_llm_extraction(
        self,
        url: str,
        query: str,
        max_depth: int = 2,
        max_links: int = 5,
    ) -> Dict[str, Any]:
        """
        Crawl URL and extract data using LLM intelligence.
        
        Args:
            url: URL to crawl
            query: User query explaining what to extract
            max_depth: Depth for deep crawling
            max_links: Max internal links to follow
            
        Returns:
            Dictionary with extracted data
        """
        if not CRAWL4AI_AVAILABLE:
            return self._fallback_extraction(url, query)
        
        logger.info(f"🚀 Универсальный краулинг: {url}")
        logger.info(f"📝 Запрос пользователя: {query}")
        
        try:
            # Step 1: Crawl with JavaScript rendering
            crawled_data = await self._crawl_with_js(url, max_depth, max_links)
            
            if not crawled_data['success']:
                return crawled_data
            
            # Step 2: Extract structured data using LLM
            extracted = await self._extract_with_llm(
                content=crawled_data['content'],
                url=url,
                query=query
            )
            
            # Step 3: Format as table if applicable
            table_data = await self._format_as_table(extracted, query)
            
            return {
                'success': True,
                'url': url,
                'extracted_data': extracted,
                'table_html': table_data.get('table_html'),
                'table_data': table_data.get('table_data'),
                'summary': extracted.get('summary', ''),
                'total_pages': crawled_data.get('total_pages', 1),
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка универсального краулинга: {e}")
            return {
                'success': False,
                'url': url,
                'error': str(e),
            }
    
    async def _crawl_with_js(
        self,
        url: str,
        max_depth: int,
        max_links: int
    ) -> Dict[str, Any]:
        """
        Crawl URL with full JavaScript rendering and deep crawling.
        """
        try:
            # Enhanced JavaScript to wait for dynamic content
            wait_js = """
            async function waitForContent() {
                // Hide incognito/automation detection
                Object.defineProperty(navigator, 'webdriver', {get: () => false});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['uk-UA', 'uk', 'en-US', 'en']});
                
                // Simulate human-like behavior with random delay
                const randomDelay = 3000 + Math.floor(Math.random() * 2000); // 3-5 sec
                await new Promise(resolve => setTimeout(resolve, randomDelay));
                
                // Wait for specific currency rate elements (try different selectors)
                const waitForCurrencyRates = async () => {
                    const maxAttempts = 20; // 10 seconds max
                    for (let i = 0; i < maxAttempts; i++) {
                        // Check for currency-related elements
                        const hasCurrencyData = document.body.innerText.includes('USD') || 
                                               document.body.innerText.includes('EUR') ||
                                               document.body.innerText.includes('курс') ||
                                               document.querySelector('[class*="rate"]') ||
                                               document.querySelector('[class*="currency"]') ||
                                               document.querySelector('[class*="exchange"]');
                        
                        if (hasCurrencyData) {
                            console.log('Currency data found!');
                            break;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                };
                
                await waitForCurrencyRates();
                
                // Auto-scroll to trigger lazy loading
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            // Wait more for content to load after scrolling
                            setTimeout(resolve, 2000);
                        }
                    }, 100);
                });
            }
            
            await waitForContent();
            """
            
            all_content = []
            all_links = []
            visited = set()
            
            async def crawl_recursive(current_url: str, depth: int):
                if depth > max_depth or current_url in visited:
                    return
                
                visited.add(current_url)
                logger.info(f"  📄 Краулинг (глубина {depth}): {current_url}")
                
                # Add realistic cookies
                cookies = [
                    {'name': 'lang', 'value': 'ru', 'domain': current_url.split('/')[2]},
                    {'name': 'currency', 'value': 'UAH', 'domain': current_url.split('/')[2]},
                ]
                
                async with AsyncWebCrawler(**self.default_config) as crawler:
                    result = await crawler.arun(
                        url=current_url,
                        bypass_cache=True,
                        js_code=wait_js,
                        wait_for='networkidle',
                        delay_before_return_html=7.0,  # Increased to 7 seconds for heavy JS sites
                        headers=self.realistic_headers,  # Bypass bot detection
                        viewport_width=self.viewport['width'],
                        viewport_height=self.viewport['height'],
                        # Simulate real user behavior
                        simulate_user=True,
                        override_navigator=True,  # Hide automation indicators
                    )
                    
                    if result.success:
                        # Collect content
                        content = result.markdown or result.cleaned_html or ""
                        all_content.append({
                            'url': current_url,
                            'content': content,
                            'depth': depth
                        })
                        
                        # Extract internal links for deep crawling
                        if depth < max_depth:
                            links = getattr(result, 'links', {})
                            internal_links = []
                            
                            if hasattr(links, 'internal'):
                                internal_links = list(links.internal)[:max_links]
                            elif isinstance(links, dict) and 'internal' in links:
                                internal_links = links['internal'][:max_links]
                            
                            all_links.extend(internal_links)
                            
                            # Recursively crawl internal links
                            for link in internal_links[:max_links]:
                                if link not in visited:
                                    await crawl_recursive(link, depth + 1)
            
            # Start crawling
            await crawl_recursive(url, 0)
            
            # Combine all content
            combined_content = "\n\n---\n\n".join([
                f"URL: {item['url']}\n\n{item['content'][:5000]}" 
                for item in all_content
            ])
            
            logger.info(f"✅ Краулинг завершен: {len(all_content)} страниц, {len(combined_content)} символов")
            
            return {
                'success': True,
                'content': combined_content,
                'total_pages': len(all_content),
                'links': all_links,
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка краулинга с JS: {e}")
            return {
                'success': False,
                'error': str(e),
                'content': '',
            }
    
    async def _extract_with_llm(
        self,
        content: str,
        url: str,
        query: str
    ) -> Dict[str, Any]:
        """
        Use LLM to intelligently extract structured data from content.
        No hardcoded patterns - pure AI intelligence.
        """
        logger.info(f"🤖 LLM извлечение данных из {len(content)} символов")
        
        # Build intelligent extraction prompt
        extraction_prompt = f"""You are an intelligent web data extractor. Analyze the webpage content and extract relevant structured data based on the user's query.

**User Query:** {query}

**URL:** {url}

**Content (truncated):**
{content[:15000]}

**Your Task:**
1. Identify what type of data the user wants (prices, currency rates, articles, products, etc.)
2. Extract ALL relevant items in a structured format
3. Return data as JSON with this structure:
   {{
     "items": [
       {{"field1": "value1", "field2": "value2", ...}},
       ...
     ],
     "summary": "Brief summary of what was extracted",
     "data_type": "Type of data (prices, currency_rates, articles, etc.)",
     "columns": ["field1", "field2", ...]
   }}

**Examples:**

For currency rates:
{{
  "items": [
    {{"currency": "USD", "buy": "41.50", "sell": "42.00"}},
    {{"currency": "EUR", "buy": "45.20", "sell": "46.10"}}
  ],
  "summary": "Извлечено 2 курса валют",
  "data_type": "currency_rates",
  "columns": ["currency", "buy", "sell"]
}}

For products/prices:
{{
  "items": [
    {{"name": "Product A", "price": "100.00", "currency": "UAH"}},
    {{"name": "Product B", "price": "150.00", "currency": "UAH"}}
  ],
  "summary": "Найдено 2 товара",
  "data_type": "products",
  "columns": ["name", "price", "currency"]
}}

**Important:**
- Extract ONLY actual data from the content, no fake examples
- If no relevant data found, return empty items list
- Be flexible with field names based on the content
- Preserve all numbers, currencies, and important details
- Return ONLY valid JSON, no other text

Extract now:"""
        
        try:
            # Use LLM to extract data
            response = call_llm(
                messages=[{"role": "user", "content": extraction_prompt}],
                task='classification',  # Use classification model for precise extraction
            )
            
            # Parse JSON response
            import json
            
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                extracted = json.loads(json_str)
                
                logger.info(f"✅ LLM извлекло {len(extracted.get('items', []))} элементов")
                logger.info(f"📊 Тип данных: {extracted.get('data_type', 'unknown')}")
                
                return extracted
            else:
                logger.warning("⚠️ LLM не вернул валидный JSON")
                return {
                    'items': [],
                    'summary': 'Не удалось извлечь структурированные данные',
                    'data_type': 'unknown',
                    'columns': [],
                }
                
        except Exception as e:
            logger.error(f"❌ Ошибка LLM извлечения: {e}")
            return {
                'items': [],
                'summary': f'Ошибка извлечения: {str(e)}',
                'data_type': 'error',
                'columns': [],
            }
    
    async def _format_as_table(
        self,
        extracted: Dict[str, Any],
        query: str
    ) -> Dict[str, Any]:
        """
        Format extracted data as HTML table using LLM guidance.
        """
        items = extracted.get('items', [])
        
        if not items:
            return {
                'table_html': None,
                'table_data': [],
            }
        
        # Import pandas for table generation
        try:
            import pandas as pd
            
            # Create DataFrame
            df = pd.DataFrame(items)
            
            # Generate HTML table with styling
            table_html = df.to_html(
                index=False,
                classes='table table-striped table-bordered table-hover',
                escape=False
            )
            
            logger.info(f"✅ Создана таблица: {len(df)} строк, {len(df.columns)} колонок")
            
            return {
                'table_html': table_html,
                'table_data': items,
                'stats': {
                    'total_items': len(df),
                    'columns': list(df.columns),
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания таблицы: {e}")
            return {
                'table_html': None,
                'table_data': items,
            }
    
    async def _fallback_extraction(self, url: str, query: str) -> Dict[str, Any]:
        """Fallback when Crawl4AI is not available."""
        logger.warning("⚠️ Crawl4AI недоступен, используется fallback")
        
        try:
            import requests
            response = requests.get(url, timeout=30)
            
            # Use LLM to extract from HTML
            extracted = await self._extract_with_llm(
                content=response.text,
                url=url,
                query=query
            )
            
            table_data = await self._format_as_table(extracted, query)
            
            return {
                'success': True,
                'url': url,
                'extracted_data': extracted,
                'table_html': table_data.get('table_html'),
                'table_data': table_data.get('table_data'),
                'summary': extracted.get('summary', ''),
                'fallback_used': True,
            }
            
        except Exception as e:
            logger.error(f"❌ Fallback extraction failed: {e}")
            return {
                'success': False,
                'url': url,
                'error': str(e),
            }


# Global service instance
universal_crawler_service = UniversalCrawlerService()

