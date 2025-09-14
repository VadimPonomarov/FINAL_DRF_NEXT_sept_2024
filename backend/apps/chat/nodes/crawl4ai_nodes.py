"""
Crawl4AI integration nodes for web scraping and content extraction.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from apps.chat.types.types import AgentState
import re
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

try:
    from crawl4ai import AsyncWebCrawler
    from crawl4ai.extraction_strategy import LLMExtractionStrategy
    CRAWL4AI_AVAILABLE = True
except ImportError:
    CRAWL4AI_AVAILABLE = False
    logger.warning("Crawl4AI not available. Install with: pip install crawl4ai")


class Crawl4AIService:
    """Service for Crawl4AI web scraping operations."""
    
    def __init__(self):
        self.crawler = None
    
    async def crawl_url(self, url: str, extraction_strategy: Optional[str] = None, 
                       css_selector: Optional[str] = None, 
                       word_count_threshold: int = 10) -> Dict[str, Any]:
        """
        Crawl a URL and extract content.
        
        Args:
            url: URL to crawl
            extraction_strategy: Strategy for content extraction
            css_selector: CSS selector for specific content
            word_count_threshold: Minimum word count for content
            
        Returns:
            Crawling results dictionary
        """
        if not CRAWL4AI_AVAILABLE:
            raise Exception("Crawl4AI not available")
        
        try:
            async with AsyncWebCrawler(verbose=True) as crawler:
                # Basic crawl parameters
                crawl_params = {
                    "url": url,
                    "word_count_threshold": word_count_threshold,
                    "bypass_cache": True
                }
                
                # Add CSS selector if provided
                if css_selector:
                    crawl_params["css_selector"] = css_selector
                
                # Add extraction strategy if provided
                if extraction_strategy:
                    crawl_params["extraction_strategy"] = LLMExtractionStrategy(
                        provider="openai/gpt-4o-mini",
                        api_token=None,  # Will use default or environment
                        instruction=extraction_strategy
                    )
                
                result = await crawler.arun(**crawl_params)
                
                return {
                    "success": result.success,
                    "url": url,
                    "title": getattr(result, 'title', ''),
                    "markdown": getattr(result, 'markdown', ''),
                    "cleaned_html": getattr(result, 'cleaned_html', ''),
                    "media": getattr(result, 'media', {}),
                    "links": getattr(result, 'links', {}),
                    "metadata": getattr(result, 'metadata', {}),
                    "extracted_content": getattr(result, 'extracted_content', ''),
                    "error_message": getattr(result, 'error_message', '')
                }
                
        except Exception as e:
            logger.error(f"Crawl4AI error: {e}")
            raise
    
    def extract_urls_from_query(self, query: str) -> List[str]:
        """Extract URLs from user query."""
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, query)
        return urls
    
    def is_valid_url(self, url: str) -> bool:
        """Check if URL is valid."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False


# Global service instance
crawl4ai_service = Crawl4AIService()


def crawl4ai_extract_node(state: AgentState) -> AgentState:
    """
    Extract content from web pages using Crawl4AI.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with extracted content
    """
    try:
        if not CRAWL4AI_AVAILABLE:
            return state.model_copy(update={
                "error": "Crawl4AI not available. Install with: pip install crawl4ai"
            })
        
        # Extract URLs from query
        urls = crawl4ai_service.extract_urls_from_query(state.query)
        
        if not urls:
            return state.model_copy(update={
                "error": "No valid URLs found in the query. Please provide a URL to crawl."
            })
        
        # Get crawling parameters from context
        extraction_strategy = state.context.get("extraction_strategy")
        css_selector = state.context.get("css_selector")
        word_count_threshold = state.context.get("word_count_threshold", 10)
        
        # Crawl the first URL (can be extended to handle multiple URLs)
        url = urls[0]
        
        if not crawl4ai_service.is_valid_url(url):
            return state.model_copy(update={
                "error": f"Invalid URL: {url}"
            })
        
        # Perform crawling
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                crawl4ai_service.crawl_url(
                    url=url,
                    extraction_strategy=extraction_strategy,
                    css_selector=css_selector,
                    word_count_threshold=word_count_threshold
                )
            )
        finally:
            loop.close()
        
        if not result["success"]:
            return state.model_copy(update={
                "error": f"Failed to crawl {url}: {result.get('error_message', 'Unknown error')}"
            })
        
        # Format results
        formatted_result = format_crawl_results(result)
        
        # Store results in state
        state.add_intermediate_result("crawl4ai_result", result)
        state.add_intermediate_result("crawled_url", url)
        
        return state.model_copy(update={
            "result": formatted_result,
            "html": result.get("cleaned_html", ""),
            "metadata": {
                **state.metadata,
                "crawled_url": url,
                "page_title": result.get("title", ""),
                "content_length": len(result.get("markdown", "")),
                "has_extracted_content": bool(result.get("extracted_content"))
            }
        })
        
    except Exception as e:
        error_msg = f"Crawl4AI extraction error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def crawl4ai_ask_node(state: AgentState) -> AgentState:
    """
    Use Crawl4AI's Ask AI feature to answer questions about web content.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with AI-generated answer
    """
    try:
        if not CRAWL4AI_AVAILABLE:
            return state.model_copy(update={
                "result": f"Извините, функция анализа веб-сайтов временно недоступна (Crawl4AI не установлен). Для анализа сайта '{state.query}' рекомендую открыть его вручную в браузере.",
                "metadata": {
                    **state.metadata,
                    "crawl4ai_unavailable": True,
                    "fallback_response": True
                }
            })
        
        # Extract URLs from query
        urls = crawl4ai_service.extract_urls_from_query(state.query)
        
        if not urls:
            return state.model_copy(update={
                "error": "No valid URLs found in the query. Please provide a URL to analyze."
            })
        
        url = urls[0]
        
        # Extract question from query (remove URL)
        question = state.query
        for url_to_remove in urls:
            question = question.replace(url_to_remove, "").strip()
        
        if not question:
            question = "What is this page about?"
        
        # Use extraction strategy to answer the question
        extraction_strategy = f"Answer this question based on the page content: {question}"
        
        # Perform crawling with AI extraction
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                crawl4ai_service.crawl_url(
                    url=url,
                    extraction_strategy=extraction_strategy
                )
            )
        finally:
            loop.close()
        
        if not result["success"]:
            return state.model_copy(update={
                "error": f"Failed to analyze {url}: {result.get('error_message', 'Unknown error')}"
            })
        
        # Get the AI-generated answer
        answer = result.get("extracted_content", "")
        if not answer:
            answer = f"I was able to crawl the page '{result.get('title', url)}' but couldn't generate a specific answer to your question."
        
        # Format response
        response = f"**Analysis of {url}:**\n\n"
        if result.get("title"):
            response += f"**Page Title:** {result['title']}\n\n"
        response += f"**Answer:** {answer}"
        
        # Store results
        state.add_intermediate_result("crawl4ai_ask_result", result)
        state.add_intermediate_result("question", question)
        state.add_intermediate_result("analyzed_url", url)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "analyzed_url": url,
                "question": question,
                "page_title": result.get("title", ""),
                "ai_analysis": True
            }
        })
        
    except Exception as e:
        error_msg = f"Crawl4AI Ask AI error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def format_crawl_results(result: Dict[str, Any]) -> str:
    """Format Crawl4AI results for display."""
    formatted_parts = []
    
    # Add title
    if result.get("title"):
        formatted_parts.append(f"**Page Title:** {result['title']}\n")
    
    # Add URL
    formatted_parts.append(f"**URL:** {result['url']}\n")
    
    # Add extracted content if available
    if result.get("extracted_content"):
        formatted_parts.append(f"**Extracted Content:**\n{result['extracted_content']}\n")
    
    # Add markdown content (truncated)
    if result.get("markdown"):
        markdown = result["markdown"]
        if len(markdown) > 2000:
            markdown = markdown[:2000] + "...\n\n[Content truncated]"
        formatted_parts.append(f"**Page Content:**\n{markdown}\n")
    
    # Add media information
    if result.get("media") and result["media"].get("images"):
        image_count = len(result["media"]["images"])
        formatted_parts.append(f"**Media:** Found {image_count} images\n")
    
    # Add links information
    if result.get("links") and result["links"].get("external"):
        link_count = len(result["links"]["external"])
        formatted_parts.append(f"**Links:** Found {link_count} external links\n")
    
    return "\n".join(formatted_parts)


def crawl4ai_multi_url_node(state: AgentState) -> AgentState:
    """
    Crawl multiple URLs and combine results.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with combined crawl results
    """
    try:
        if not CRAWL4AI_AVAILABLE:
            return state.model_copy(update={
                "error": "Crawl4AI not available. Install with: pip install crawl4ai"
            })
        
        # Extract URLs from query
        urls = crawl4ai_service.extract_urls_from_query(state.query)
        
        if not urls:
            return state.model_copy(update={
                "error": "No valid URLs found in the query. Please provide URLs to crawl."
            })
        
        # Limit to prevent abuse
        max_urls = state.context.get("max_urls", 3)
        urls = urls[:max_urls]
        
        results = []
        combined_content = []
        
        # Crawl each URL
        for url in urls:
            if not crawl4ai_service.is_valid_url(url):
                continue
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        crawl4ai_service.crawl_url(url=url)
                    )
                finally:
                    loop.close()
                
                if result["success"]:
                    results.append(result)
                    combined_content.append(f"## {result.get('title', url)}\n{result.get('markdown', '')[:1000]}...\n")
                
            except Exception as e:
                logger.error(f"Error crawling {url}: {e}")
                continue
        
        if not results:
            return state.model_copy(update={
                "error": "Failed to crawl any of the provided URLs."
            })
        
        # Format combined results
        formatted_result = f"**Crawled {len(results)} URLs:**\n\n" + "\n".join(combined_content)
        
        # Store results
        state.add_intermediate_result("multi_crawl_results", results)
        state.add_intermediate_result("crawled_urls", [r["url"] for r in results])
        
        return state.model_copy(update={
            "result": formatted_result,
            "metadata": {
                **state.metadata,
                "crawled_urls_count": len(results),
                "total_urls_requested": len(urls),
                "multi_url_crawl": True
            }
        })
        
    except Exception as e:
        error_msg = f"Multi-URL crawl error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
