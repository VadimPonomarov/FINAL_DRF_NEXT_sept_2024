"""
Enhanced nodes package for LangGraph chat agent.

This package contains all processing nodes for the chat agent:
- ChatAI nodes for text and image generation
- DuckDuckGo nodes for web search
- Crawl4AI nodes for web scraping
- File operation nodes
- Utility nodes for basic operations
"""

# Import all nodes for easy access
from .chatai_nodes import (
    chatai_text_node,
    chatai_image_node,
    chatai_enhanced_text_node
)

from .duckduckgo_nodes import (
    duckduckgo_search_node,
    duckduckgo_enhanced_search_node,
    duckduckgo_context_node
)

from .crawl4ai_nodes import (
    crawl4ai_extract_node,
    crawl4ai_ask_node,
    crawl4ai_multi_url_node
)

from .file_nodes import (
    file_read_node,
    file_write_node,
    file_list_node,
    file_analysis_node
)

from .utility_nodes import (
    datetime_node,
    codegen_node,
    riza_exec_node,
    final_output_node,
    debug_node
)

from .math_nodes import (
    math_node,
    advanced_math_node
)

__all__ = [
    # ChatAI nodes
    'chatai_text_node',
    'chatai_image_node',
    'chatai_enhanced_text_node',

    # DuckDuckGo nodes
    'duckduckgo_search_node',
    'duckduckgo_enhanced_search_node',
    'duckduckgo_context_node',

    # Crawl4AI nodes
    'crawl4ai_extract_node',
    'crawl4ai_ask_node',
    'crawl4ai_multi_url_node',

    # File nodes
    'file_read_node',
    'file_write_node',
    'file_list_node',
    'file_analysis_node',

    # Utility nodes
    'datetime_node',
    'codegen_node',
    'riza_exec_node',
    'final_output_node',
    'debug_node',

    # Math nodes
    'math_node',
    'advanced_math_node'
]