"""
Enhanced configuration and assembly of the multi-tool chat agent graph.
"""

import logging
from langgraph.graph import StateGraph
from .types.types import AgentState, Intent, DataMode
from .classifiers.langchain_classifier import langchain_intent_classifier

logger = logging.getLogger(__name__)

# Import all node modules
from .nodes.chatai_nodes import (
    chatai_text_node,
    chatai_image_node,
    chatai_enhanced_text_node
)
from .nodes.tavily_nodes import (
    tavily_search_node,
    tavily_enhanced_search_node,
    tavily_context_node
)
from .nodes.crawl4ai_nodes import (
    crawl4ai_extract_node,
    crawl4ai_ask_node,
    crawl4ai_multi_url_node
)
from .nodes.file_nodes import (
    file_read_node,
    file_write_node,
    file_list_node,
    file_analysis_node,
    attached_file_analysis_node
)
# Import utility nodes
from .nodes.utility_nodes import (
    datetime_node,
    codegen_node,
    riza_exec_node,
    final_output_node
)


def classify_intent_node(state: AgentState) -> AgentState:
    """LLM-based classification node for intent and data mode."""
    return langchain_intent_classifier.classify(state)


class EnhancedAgentGraph:
    """
    Enhanced class for building and managing the agent processing graph.
    """

    def __init__(self):
        """Initialize empty graph."""
        self.graph = None
        self._compiled_graph = None

    def build_graph(self) -> StateGraph:
        """
        Build processing graph with nodes and edges.

        Returns:
            Compiled graph for execution
        """
        # Create graph with state type
        graph = StateGraph(AgentState)

        # Add all nodes
        self._add_nodes(graph)

        # Configure edges and routing
        self._configure_edges(graph)

        # Compile graph
        self._compiled_graph = graph.compile()
        return self._compiled_graph

    def _add_nodes(self, graph: StateGraph) -> None:
        """
        Add all nodes to the graph.

        Args:
            graph: Graph to add nodes to
        """
        nodes = {
            # Core nodes
            "datetime": datetime_node,
            "classify_intent": classify_intent_node,

            # ChatAI nodes
            "chatai_text": chatai_text_node,
            "chatai_image": chatai_image_node,
            "chatai_enhanced": chatai_enhanced_text_node,

            # Search and crawling nodes
            "tavily_search": tavily_search_node,
            "tavily_enhanced": tavily_enhanced_search_node,
            "crawl4ai_extract": crawl4ai_extract_node,
            "crawl4ai_ask": crawl4ai_ask_node,

            # File operation nodes
            "file_read": file_read_node,
            "file_write": file_write_node,
            "file_analysis": file_analysis_node,
            "attached_file_analysis": attached_file_analysis_node,

            # Code execution nodes
            "codegen": codegen_node,
            "riza_exec": riza_exec_node,

            # Output node
            "output": final_output_node
        }

        for name, node_func in nodes.items():
            graph.add_node(name, node_func)

    def _configure_edges(self, graph: StateGraph) -> None:
        """
        Configure edges and conditional routing.

        Args:
            graph: Graph to configure edges for
        """
        # Set entry point
        graph.set_entry_point("datetime")

        # Sequential edges
        graph.add_edge("datetime", "classify_intent")

        # Conditional routing by intent type
        graph.add_conditional_edges(
            "classify_intent",
            self._route_by_intent,
            {
                Intent.GENERAL_CHAT: "chatai_enhanced",
                Intent.TEXT_GENERATION: "chatai_text",
                Intent.IMAGE_GENERATION: "chatai_image",
                Intent.FACTUAL_SEARCH: "tavily_enhanced",
                Intent.WEB_CRAWLING: "crawl4ai_ask",
                Intent.CODE_EXECUTION: "codegen",
                Intent.FILE_READ: "file_read",
                Intent.FILE_WRITE: "file_write",
                Intent.FILE_ANALYSIS: "file_analysis",
                Intent.DATETIME: "output"
            }
        )

        # Direct transitions to output
        graph.add_edge("chatai_text", "output")
        graph.add_edge("chatai_image", "output")
        graph.add_edge("chatai_enhanced", "output")
        graph.add_edge("tavily_search", "output")
        graph.add_edge("tavily_enhanced", "output")
        graph.add_edge("crawl4ai_extract", "output")
        graph.add_edge("crawl4ai_ask", "output")
        graph.add_edge("file_read", "output")
        graph.add_edge("file_write", "output")
        graph.add_edge("file_analysis", "output")
        graph.add_edge("attached_file_analysis", "output")

        # Code execution chain
        graph.add_edge("codegen", "riza_exec")
        graph.add_edge("riza_exec", "output")

        # Set finish point
        graph.set_finish_point("output")

    def _route_by_intent(self, state: AgentState) -> str:
        """
        Route request by determined intent type.

        Args:
            state: Current agent state

        Returns:
            Name of next node to execute
        """
        # Check if there are attached files in context
        attached_files = state.context.get("files", [])
        if attached_files:
            logger.info(f"Found {len(attached_files)} attached files, routing to attached_file_analysis")
            return "attached_file_analysis"

        # Default routing by intent
        if not state.intent:
            return Intent.GENERAL_CHAT.value
        return state.intent.value

    def invoke(self, state: AgentState) -> AgentState:
        """
        Execute request processing through the graph.

        Args:
            state: Initial agent state

        Returns:
            Final state after processing
        """
        if self._compiled_graph is None:
            raise RuntimeError("Graph not built. Call build_graph() first.")

        try:
            result = self._compiled_graph.invoke(state)
            return AgentState(**result)
        except Exception as e:
            logger.error(f"Graph execution error: {e}")
            return state.model_copy(update={
                "error": f"Graph execution failed: {str(e)}"
            })


def create_enhanced_agent_graph() -> EnhancedAgentGraph:
    """
    Factory function for creating and initializing the enhanced agent graph.

    Returns:
        Configured EnhancedAgentGraph instance
    """
    agent_graph = EnhancedAgentGraph()
    agent_graph.build_graph()
    return agent_graph


# Backward compatibility
def create_agent_graph() -> EnhancedAgentGraph:
    """Backward compatibility function."""
    return create_enhanced_agent_graph()


# Global graph instance for reuse
_global_graph = None

def get_global_graph() -> EnhancedAgentGraph:
    """Get or create global graph instance."""
    global _global_graph
    if _global_graph is None:
        _global_graph = create_enhanced_agent_graph()
    return _global_graph