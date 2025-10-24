"""
Unified crawler nodes (REFACTORED).
Объединенная версия crawl4ai_nodes.py и improved_crawl4ai_nodes.py.
"""

import logging
from typing import Dict, Any
from apps.chat.types.types import AgentState
from apps.chat.services.crawler_service import crawler_service
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
- User mentions currency rates, exchange rates, catalogs
- Query implies extracting multiple items or comparing data
- Keywords like "all", "list of", "compare" are present

Simple crawl is sufficient when:
- User asks general questions about a page
- User wants to read/summarize content
- No data extraction or parsing is mentioned

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
    Crawl URL and answer questions about the content.
    Supports deep crawling for price extraction.
    Simplified version delegating to service layer.
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
                "result": "No valid URLs found. Please provide a URL.",
                "metadata": {**state.metadata, "crawl4ai_error": "no_urls"}
            })
        
        url = urls[0]
        
        # Check if deep crawl is needed
        needs_deep = _needs_deep_crawl(state.query)
        
        import asyncio
        
        if needs_deep:
            logger.info(f"🔄 Deep crawl requested for: {url}")
            
            # Perform deep crawl
            deep_result = asyncio.run(
                crawler_service.crawl_deep(
                    url,
                    max_depth=DEEP_CRAWL_CONFIG['max_depth'],
                    max_links=DEEP_CRAWL_CONFIG['max_links']
                )
            )
            
            # Process results
            processed_data = crawler_service.process_crawl_results(deep_result)
            
            # Format response with table data
            formatted = crawler_service.format_response(processed_data)
            
            # Extract components
            response = formatted['result']
            table_html = formatted.get('table_html')
            table_data = formatted.get('table_data')
            
            # Add intermediate result
            state.add_intermediate_result("deep_crawl_result", deep_result)
            
            metadata = {
                **state.metadata,
                "analyzed_url": url,
                "crawl_method": "deep",
                "total_pages": processed_data.get('total_pages', 0),
                "prices_found": len(processed_data.get('prices_found', [])),
                "has_table": table_html is not None
            }
        else:
            logger.info(f"📄 Single page crawl: {url}")
            
            # Perform single page crawl
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
        
        # Add table data if available (deep crawl with prices)
        if needs_deep:
            if table_html is not None:
                update_dict["table_html"] = table_html
            if table_data is not None:
                update_dict["table_data"] = table_data
        
        return state.model_copy(update=update_dict)
        
    except Exception as e:
        error_msg = f"Crawl error: {str(e)}"
        logger.error(error_msg)
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

