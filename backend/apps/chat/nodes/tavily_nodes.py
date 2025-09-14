"""
Tavily Search integration nodes for real-time information retrieval.
"""

import logging
from typing import List, Dict, Any, Optional
from apps.chat.types.types import AgentState
import os

logger = logging.getLogger(__name__)

try:
    from tavily import TavilyClient
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False
    logger.warning("Tavily not available. Install with: pip install tavily-python")


class TavilyService:
    """Service for Tavily search operations."""

    def __init__(self):
        # Use key_manager for encrypted API key
        from core.security.key_manager import key_manager
        self.api_key = key_manager.get_key('TAVILY_API_KEY')
        self.client = None

        if TAVILY_AVAILABLE and self.api_key:
            try:
                self.client = TavilyClient(api_key=self.api_key)
                logger.info("Tavily client initialized successfully with encrypted API key")
            except Exception as e:
                logger.error(f"Failed to initialize Tavily client: {e}")
        else:
            logger.warning("Tavily client not initialized. Check API key and installation.")
    
    def search(self, query: str, max_results: int = 5, include_domains: Optional[List[str]] = None, 
               exclude_domains: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Perform search using Tavily.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            include_domains: Domains to include in search
            exclude_domains: Domains to exclude from search
            
        Returns:
            Search results dictionary
        """
        if not self.client:
            raise Exception("Tavily client not available")
        
        try:
            search_params = {
                "query": query,
                "max_results": max_results,
                "search_depth": "advanced",
                "include_answer": True,
                "include_raw_content": False
            }
            
            if include_domains:
                search_params["include_domains"] = include_domains
            if exclude_domains:
                search_params["exclude_domains"] = exclude_domains
            
            results = self.client.search(**search_params)
            return results
            
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
            raise
    
    def get_search_context(self, query: str, max_results: int = 3) -> str:
        """
        Get search context for use in other nodes.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            Formatted search context
        """
        try:
            results = self.search(query, max_results)
            
            if not results.get("results"):
                return "No search results found."
            
            context_parts = []
            
            # Add answer if available
            if results.get("answer"):
                context_parts.append(f"Answer: {results['answer']}")
            
            # Add search results
            context_parts.append("Search Results:")
            for i, result in enumerate(results["results"][:max_results], 1):
                title = result.get("title", "No title")
                content = result.get("content", "No content")
                url = result.get("url", "No URL")
                
                context_parts.append(f"{i}. {title}")
                context_parts.append(f"   Content: {content[:200]}...")
                context_parts.append(f"   Source: {url}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            return f"Search error: {str(e)}"


# Global service instance
tavily_service = TavilyService()


def tavily_search_node(state: AgentState) -> AgentState:
    """
    Perform search using Tavily and return results.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with search results
    """
    try:
        if not tavily_service.client:
            return state.model_copy(update={
                "result": f"Извините, поиск в интернете временно недоступен. Для вопроса '{state.query}' рекомендую обратиться к актуальным источникам информации.",
                "metadata": {
                    **state.metadata,
                    "search_unavailable": True,
                    "fallback_response": True
                }
            })
        
        # Extract search query
        search_query = state.query
        
        # Get search parameters from context
        max_results = state.context.get("max_search_results", 5)
        include_domains = state.context.get("include_domains")
        exclude_domains = state.context.get("exclude_domains")
        
        # Perform search
        results = tavily_service.search(
            query=search_query,
            max_results=max_results,
            include_domains=include_domains,
            exclude_domains=exclude_domains
        )
        
        # Format results for display
        formatted_results = format_search_results(results)
        
        # Store results in state
        state.add_intermediate_result("tavily_results", results)
        state.add_intermediate_result("search_query", search_query)
        
        return state.model_copy(update={
            "result": formatted_results,
            "metadata": {
                **state.metadata,
                "search_engine": "tavily",
                "results_count": len(results.get("results", [])),
                "has_answer": bool(results.get("answer"))
            }
        })
        
    except Exception as e:
        error_msg = f"Tavily search error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def tavily_context_node(state: AgentState) -> AgentState:
    """
    Get search context for use in other processing nodes.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with search context
    """
    try:
        if not tavily_service.client:
            return state.model_copy(update={
                "context": {
                    **state.context,
                    "search_context": "Tavily search not available"
                }
            })
        
        # Get search context
        search_context = tavily_service.get_search_context(
            state.query, 
            max_results=state.context.get("context_results", 3)
        )
        
        # Add to context
        updated_context = {
            **state.context,
            "search_context": search_context,
            "has_search_context": True
        }
        
        return state.model_copy(update={
            "context": updated_context,
            "metadata": {
                **state.metadata,
                "search_context_added": True
            }
        })
        
    except Exception as e:
        error_msg = f"Tavily context error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def format_search_results(results: Dict[str, Any]) -> str:
    """Format Tavily search results for display."""
    if not results.get("results"):
        return "No search results found."
    
    formatted_parts = []
    
    # Add answer if available
    if results.get("answer"):
        formatted_parts.append(f"**Answer:** {results['answer']}\n")
    
    # Add search results
    formatted_parts.append("**Search Results:**\n")
    
    for i, result in enumerate(results["results"], 1):
        title = result.get("title", "No title")
        content = result.get("content", "No content")
        url = result.get("url", "No URL")
        score = result.get("score", 0)
        
        formatted_parts.append(f"**{i}. {title}**")
        formatted_parts.append(f"Content: {content}")
        formatted_parts.append(f"Source: {url}")
        formatted_parts.append(f"Relevance: {score:.2f}\n")
    
    return "\n".join(formatted_parts)


def tavily_enhanced_search_node(state: AgentState) -> AgentState:
    """
    Enhanced search that combines Tavily results with ChatAI processing.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with enhanced search response
    """
    try:
        # First get search context
        context_state = tavily_context_node(state)
        if context_state.has_error():
            return context_state
        
        # Check if we have search context
        search_context = context_state.context.get("search_context")
        if not search_context or search_context == "Tavily search not available":
            return context_state.model_copy(update={
                "result": "Search functionality is not available at the moment."
            })
        
        # Import language detection function
        from .chatai_nodes import _detect_language, _create_search_enhanced_prompt

        # Detect user's language
        user_language = _detect_language(state.query)

        # Prepare enhanced prompt for ChatAI in user's language
        enhanced_query = _create_search_enhanced_prompt(state.query, search_context, user_language)
        
        # Update state with enhanced query and context
        enhanced_state = context_state.model_copy(update={
            "query": enhanced_query,
            "context": {
                **context_state.context,
                "original_query": state.query,
                "user_language": user_language,
                "enhanced_with_search": True
            }
        })
        
        # Import and use ChatAI node
        from .chatai_nodes import chatai_enhanced_text_node
        result_state = chatai_enhanced_text_node(enhanced_state)
        
        # Restore original query but keep the enhanced result
        return result_state.model_copy(update={
            "query": state.query,
            "metadata": {
                **result_state.metadata,
                "enhanced_with_tavily": True,
                "original_query": state.query
            }
        })
        
    except Exception as e:
        error_msg = f"Enhanced Tavily search error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
