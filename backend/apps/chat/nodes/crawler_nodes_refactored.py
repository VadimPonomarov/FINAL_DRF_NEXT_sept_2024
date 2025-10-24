"""
Unified crawler nodes (REFACTORED).
Universal LLM-based crawler - NO hardcoding, ONLY AI intelligence.
"""

import logging
from typing import Dict, Any
from apps.chat.types.types import AgentState
from apps.chat.services.crawler_service import crawler_service
from apps.chat.services.universal_crawler_service import universal_crawler_service
from apps.chat.config.crawler_config import DEEP_CRAWL_CONFIG
from apps.chat.config.llm_config import call_llm
from apps.chat.utils.url_utils import extract_urls

logger = logging.getLogger(__name__)


def _needs_deep_crawl(query: str) -> bool:
    """
    Intelligent detection if query requires deep crawling using LLM.
    
    Args:
        query: User query
        
    Returns:
        True if deep crawl is needed
    """
    try:
        # Use centralized LLM config for deep crawl detection
        prompt = f"""Analyze this user query and determine if it requires DEEP web crawling (multiple pages, price extraction, catalog parsing) or SIMPLE single-page crawl.

Query: "{query}"

Deep crawl is needed when:
- User asks to parse/extract prices, products, or structured data
- User mentions currency rates, exchange rates, курсы валют, курс, цены
- Query implies extracting multiple items or comparing data
- Keywords like "all", "list of", "compare", "спарс", "парс" are present
- User wants data in table format or structured format
- User wants to extract specific information from a site

Simple crawl is sufficient when:
- User asks general questions about a page
- User wants to read/summarize content
- No data extraction or parsing is mentioned

Examples of DEEP:
- "спарсь курсы валют" → DEEP
- "extract prices from" → DEEP
- "parse currency rates" → DEEP
- "покажи в таблице" → DEEP

Examples of SIMPLE:
- "what is this page about" → SIMPLE
- "summarize the article" → SIMPLE

Respond with ONLY "DEEP" or "SIMPLE" (one word)."""

        response = call_llm(
            messages=[{"role": "user", "content": prompt}],
            task='deep_crawl_detection'
        )
        
        result = response.strip().upper()
        needs_deep = "DEEP" in result
        
        logger.info(f"🤖 Intelligent deep crawl detection: '{query}' → {'DEEP' if needs_deep else 'SIMPLE'}")
        return needs_deep
        
    except Exception as e:
        logger.error(f"LLM deep crawl detection failed: {e}. Falling back to heuristic.")
        # Minimal fallback for safety
        query_lower = query.lower()
        return 'спарс' in query_lower or 'parse' in query_lower or 'extract' in query_lower


def crawl4ai_extract_node(state: AgentState) -> AgentState:
    """
    Extract and summarize content from a URL.
    Simplified version delegating to service layer.
    """
    try:
        # Extract URLs from query or context
        urls = extract_urls(state.query)
        if not urls and state.context.get('url'):
            urls = [state.context['url']]
        
        if not urls:
            return state.model_copy(update={
                "result": "No valid URLs found in the query. Please provide a URL to crawl.",
                "metadata": {**state.metadata, "crawl4ai_error": "no_urls"}
            })
        
        url = urls[0]
        logger.info(f"Extracting content from: {url}")
        
        # Perform single URL crawl
        import asyncio
        result = asyncio.run(crawler_service.crawl_url(url))
        
        if not result.get('success'):
            return state.model_copy(update={
                "result": f"Failed to crawl {url}. Please check the URL and try again.",
                "metadata": {**state.metadata, "crawl4ai_error": "crawl_failed"}
            })
        
        # Extract content
        content = result.get('markdown', '') or result.get('cleaned_html', '')
        summary = content[:2000] if content else "No content extracted."
        
        response = f"**📄 Контент с {url}:**\n\n{summary}"
        if len(content) > 2000:
            response += "\n\n_[содержимое обрезано]_"
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "crawled_url": url,
                "content_length": len(content),
                "crawl_method": "single"
            }
        })
        
    except Exception as e:
        error_msg = f"Crawl error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def crawl4ai_ask_node(state: AgentState) -> AgentState:
    """
    Universal crawler using LLM-based intelligent extraction.
    NO hardcoded patterns - ONLY AI intelligence.
    Works with ANY website, ANY data type.
    """
    try:
        # Initialize table variables
        table_html = None
        table_data = None
        
        # Extract URLs
        urls = extract_urls(state.query)
        if not urls and state.context.get('url'):
            urls = [state.context['url']]
        
        if not urls:
            return state.model_copy(update={
                "result": "URL не найден в запросе. Пожалуйста, предоставьте URL для анализа.",
                "metadata": {**state.metadata, "crawl4ai_error": "no_urls"}
            })
        
        url = urls[0]
        
        # Check if deep crawl is needed using LLM
        needs_deep = _needs_deep_crawl(state.query)
        
        import asyncio
        
        if needs_deep:
            logger.info(f"🤖 Universal LLM-based deep crawl for: {url}")
            logger.info(f"📝 Query: {state.query}")
            
            # Use universal crawler with LLM extraction
            result = asyncio.run(
                universal_crawler_service.crawl_with_llm_extraction(
                    url=url,
                    query=state.query,
                    max_depth=DEEP_CRAWL_CONFIG['max_depth'],
                    max_links=DEEP_CRAWL_CONFIG['max_links']
                )
            )
            
            if not result['success']:
                return state.model_copy(update={
                    "result": f"❌ Не удалось извлечь данные с {url}: {result.get('error', 'Unknown error')}",
                    "metadata": {**state.metadata, "crawl4ai_error": "extraction_failed"}
                })
            
            # Extract results from LLM extraction
            extracted_data = result.get('extracted_data', {})
            items = extracted_data.get('items', [])
            data_type = extracted_data.get('data_type', 'unknown')
            summary = extracted_data.get('summary', '')
            
            # Build response
            if items:
                response = f"**🎯 Универсальное извлечение данных с {url}**\n\n"
                response += f"📊 **Тип данных:** {data_type}\n"
                response += f"✅ **Найдено элементов:** {len(items)}\n\n"
                response += f"**Сводка:** {summary}\n\n"
                
                # Add first few items as preview
                response += "**📦 Данные (первые элементы):**\n\n"
                for item in items[:5]:
                    response += "• "
                    response += " | ".join([f"**{k}:** {v}" for k, v in item.items()])
                    response += "\n"
                
                if len(items) > 5:
                    response += f"\n_...и еще {len(items) - 5} элементов_\n"
                
                response += f"\n**🌐 Просканировано:** {result.get('total_pages', 1)} страниц"
            else:
                response = f"**⚠️ Данные не найдены на {url}**\n\n"
                response += f"Сводка: {summary}\n\n"
                response += "Возможно, сайт использует сложную защиту от краулинга или данные загружаются динамически."
            
            # Extract table data
            table_html = result.get('table_html')
            table_data = result.get('table_data')
            
            metadata = {
                **state.metadata,
                "analyzed_url": url,
                "crawl_method": "universal_llm",
                "total_pages": result.get('total_pages', 1),
                "items_found": len(items),
                "data_type": data_type,
                "has_table": table_html is not None,
                "universal_extraction": True
            }
        else:
            logger.info(f"📄 Simple single page crawl: {url}")
            
            # For simple queries, just return the content
            result = asyncio.run(crawler_service.crawl_url(url))
            
            if not result.get('success'):
                return state.model_copy(update={
                    "result": f"Failed to crawl {url}",
                    "metadata": {**state.metadata, "crawl4ai_error": "crawl_failed"}
                })
            
            # Extract content
            content = result.get('markdown', '') or result.get('cleaned_html', '')
            
            response = f"**📄 Контент с {url}:**\n\n{content[:2000]}"
            if len(content) > 2000:
                response += "\n\n_[содержимое обрезано]_"
            
            metadata = {
                **state.metadata,
                "analyzed_url": url,
                "crawl_method": "single",
                "content_length": len(content)
            }
        
        # Add to chat history with table data
        state.add_chat_message("assistant", response)
        
        # Prepare update dict
        update_dict = {
            "result": response,
            "metadata": metadata
        }
        
        # Add table data if available (from LLM extraction)
        if needs_deep:
            if table_html is not None:
                update_dict["table_html"] = table_html
            if table_data is not None:
                update_dict["table_data"] = table_data
        
        return state.model_copy(update=update_dict)
        
    except Exception as e:
        error_msg = f"Universal crawler error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return state.model_copy(update={"error": error_msg})


def crawl4ai_multi_url_node(state: AgentState) -> AgentState:
    """
    Crawl multiple URLs and combine results.
    Simplified version.
    """
    try:
        # Extract URLs
        urls = extract_urls(state.query)
        if state.context.get('urls'):
            urls.extend(state.context['urls'])
        
        if not urls:
            return state.model_copy(update={
                "result": "No valid URLs found",
                "metadata": {**state.metadata, "crawl4ai_error": "no_urls"}
            })
        
        logger.info(f"Crawling {len(urls)} URLs")
        
        # Crawl all URLs
        import asyncio
        
        async def crawl_all():
            tasks = [crawler_service.crawl_url(url) for url in urls[:5]]  # Max 5 URLs
            return await asyncio.gather(*tasks)
        
        results = asyncio.run(crawl_all())
        
        # Combine results
        combined_content = []
        for i, result in enumerate(results):
            if result.get('success'):
                url = urls[i]
                content = result.get('markdown', '')[:1000]
                combined_content.append(f"**{url}:**\n{content}")
        
        response = "\n\n---\n\n".join(combined_content) if combined_content else "No content extracted"
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "urls_crawled": len(urls),
                "successful_crawls": sum(1 for r in results if r.get('success')),
                "crawl_method": "multi"
            }
        })
        
    except Exception as e:
        error_msg = f"Multi-URL crawl error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})

