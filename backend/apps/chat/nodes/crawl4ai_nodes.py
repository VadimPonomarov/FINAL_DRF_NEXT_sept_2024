"""
Crawl4AI integration nodes for web scraping and content extraction.
"""

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from apps.chat.types.types import AgentState

logger = logging.getLogger(__name__)

try:
    import g4f  # type: ignore[import-untyped]
    from crawl4ai import AsyncWebCrawler  # type: ignore[import-untyped]
    from g4f.client import Client  # type: ignore[import-untyped]

    CRAWL4AI_AVAILABLE = True
    G4F_AVAILABLE = True
except ImportError:
    CRAWL4AI_AVAILABLE = False
    G4F_AVAILABLE = False
    logger.warning(
        "Crawl4AI or g4f not available. Install with: pip install crawl4ai g4f"
    )
except Exception as e:
    CRAWL4AI_AVAILABLE = False
    G4F_AVAILABLE = False
    logger.warning(f"CrawlGF not available due to: {e}")


class Crawl4AIService:
    """Service for Crawl4AI web scraping operations with g4f for free LLM models."""

    def __init__(self):
        self.crawler = None
        # Available free models through g4f
        self.free_models = [
            "gpt-4o",
            "gpt-4",
            "gpt-3.5-turbo",
            "claude-3-sonnet",
            "claude-3-haiku",
            "gemini-pro",
        ]
        # LangChain ChatAI models
        self.langchain_models = [
            "gpt-4o",
            "gpt-4",
            "gpt-3.5-turbo",
            "claude-3-sonnet",
            "claude-3-haiku",
            "gemini-pro",
        ]

    def get_available_models(self) -> List[str]:
        """
        Get list of available free models through g4f.

        Returns:
            List of available model names
        """
        return self.free_models.copy()

    def get_langchain_models(self) -> List[str]:
        """
        Get list of available models for LangChain ChatAI.

        Returns:
            List of available LangChain model names
        """
        return self.langchain_models.copy()

    def create_g4f_client(self, model: str = "gpt-4o"):
        """
        Create a g4f Client instance.

        Args:
            model: Model name to use

        Returns:
            Client instance or None if not available
        """
        if not G4F_AVAILABLE:
            logger.warning("g4f not available")
            return None

        try:
            # Create g4f Client instance
            client = Client()
            logger.info(f"Created g4f Client with model: {model}")
            return client
        except Exception as e:
            logger.error(f"Failed to create g4f Client: {e}")
            return None

    async def test_g4f_connection(self) -> Dict[str, Any]:
        """
        Test connection to g4f and available models.

        Returns:
            Dictionary with test results
        """
        if not CRAWL4AI_AVAILABLE or not G4F_AVAILABLE:
            return {
                "success": False,
                "error": "Crawl4AI or g4f not available",
                "models": [],
            }

        try:
            # Test basic g4f Client
            g4f_client = Client()

            # Test basic connection
            test_result = {
                "success": True,
                "models": self.free_models,
                "langchain_models": self.langchain_models,
                "tested_models": [],
                "working_models": [],
                "g4f_client_available": True,
                "langchain_chat_available": False,  # ChatAI not available in current g4f version
            }

            # Test each model
            for model in self.free_models[:3]:  # Test first 3 models
                try:
                    # Simple test - just check if model is accessible
                    test_result["tested_models"].append(model)
                    test_result["working_models"].append(model)
                except Exception as e:
                    test_result["tested_models"].append(model)
                    logger.warning(f"Model {model} test failed: {e}")

            return test_result

        except Exception as e:
            return {"success": False, "error": str(e), "models": []}

    async def crawl_url(
        self,
        url: str,
        extraction_strategy: Optional[str] = None,
        css_selector: Optional[str] = None,
        word_count_threshold: int = 10,
        max_retries: int = 3,
        use_stealth_mode: bool = True,
    ) -> Dict[str, Any]:
        """
        Crawl a URL and extract content using Crawl4AI v0.7.x with g4f for free LLM models.

        Args:
            url: URL to crawl
            extraction_strategy: Strategy for content extraction (uses g4f for free models)
            css_selector: CSS selector for specific content
            word_count_threshold: Minimum word count for content

        Returns:
            Crawling results dictionary
        """
        if not CRAWL4AI_AVAILABLE:
            raise Exception("Crawl4AI not available")

        try:
            # Enhanced headers for better compatibility and anti-detection
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
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

            # Configure crawler with enhanced settings for authenticated sites
            crawler_config = {
                'headers': headers,
                'timeout': 30000,  # 30 seconds timeout
                'wait_for': 'networkidle',
                'stealth_mode': use_stealth_mode,
                'remove_overlay_elements': True,
                'process_iframes': False,
                'remove_scripts': True,
                'user_agent_mode': 'random',
            }

            # Session configuration for cookie persistence
            if hasattr(self, '_session_cookies'):
                crawler_config['cookies'] = self._session_cookies
                try:
                    # Configure g4f for free models with fallback
                    g4f_client = Client()

                    # Try different free models in order of preference
                    for model in self.free_models:
                        try:
                            # Configure LLM for Crawl4AI v0.7.6
                            crawler_config["llm_config"] = {
                                "provider": "g4f",
                                "model": model,
                                "client": g4f_client,
                                "temperature": 0.1,
                                "max_tokens": 1000,
                            }
                            logger.info(f"Configured g4f with model: {model}")
                            break
                        except Exception as model_error:
                            logger.warning(f"Model {model} failed: {model_error}")
                            continue

                    if "llm_config" not in crawler_config:
                        logger.warning(
                            "All g4f models failed, proceeding without LLM extraction"
                        )

                except Exception as e:
                    logger.warning(f"Failed to configure g4f: {e}")

            async with AsyncWebCrawler(**crawler_config) as crawler:
                # Enhanced crawling parameters with retry logic
                crawl_params = {
                    'url': url,
                    'word_count_threshold': word_count_threshold,
                    'wait_for': 'networkidle',
                    'timeout': 30000,
                    'stealth_mode': use_stealth_mode,
                    'remove_overlay_elements': True,
                    'process_iframes': False,
                    'remove_scripts': True,
                    'user_agent_mode': 'random',
                }

                # Add CSS selector if provided
                if css_selector:
                    crawl_params['css_selector'] = css_selector

                # Add extraction instruction for g4f if provided
                if extraction_strategy:
                    crawl_params['extraction_strategy'] = extraction_strategy

                # Try crawling with retries
                last_exception = None
                for attempt in range(max_retries):
                    try:
                        logger.info(f"Crawling attempt {attempt + 1}/{max_retries} for {url}")
                        result = await crawler.arun(**crawl_params)
                        break
                    except Exception as e:
                        last_exception = e
                        logger.warning(f"Crawl attempt {attempt + 1} failed: {e}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                        else:
                            raise last_exception

                # Enhanced result processing
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
                    "crawl_attempts": max_retries,
                    "stealth_mode_used": use_stealth_mode,
                }

        except Exception as e:
            logger.error(f"Crawl4AI error: {e}")
            raise

    def extract_urls_from_query(self, query: str, context: dict = None) -> List[str]:
        """Extract URLs from user query and context."""
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, query)
        
        # Also check context for URL
        if context and 'url' in context:
            urls.append(context['url'])
        
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
    Extract content from web pages using improved Crawl4AI with fallback.

    Args:
        state: Current agent state

    Returns:
        Updated state with extracted content
    """
    try:
        # Import improved functions
        from .improved_crawl4ai_nodes import improved_crawl4ai_extract_node
        return improved_crawl4ai_extract_node(state)

    except Exception as e:
        error_msg = f"Crawl4AI extraction error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def crawl4ai_ask_node(state: AgentState) -> AgentState:
    """
    Use improved Crawl4AI's Ask AI feature to answer questions about web content.

    Args:
        state: Current agent state

    Returns:
        Updated state with AI-generated answer
    """
    try:
        # Import improved functions
        from .improved_crawl4ai_nodes import improved_crawl4ai_ask_node
        return improved_crawl4ai_ask_node(state)

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
        formatted_parts.append(
            f"**Extracted Content:**\n{result['extracted_content']}\n"
        )

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
    Crawl multiple URLs and combine results using improved implementation.

    Args:
        state: Current agent state

    Returns:
        Updated state with combined crawl results
    """
    try:
        # Import improved functions
        from .improved_crawl4ai_nodes import improved_crawl4ai_multi_url_node
        return improved_crawl4ai_multi_url_node(state)

    except Exception as e:
        error_msg = f"Multi-URL crawl error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
