"""
Enhanced ChatAgent with LangGraph integration for intelligent conversation processing.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import time

from .types.types import AgentState, ChatMessage, Intent, DataMode
from .graph import get_global_graph

logger = logging.getLogger(__name__)


class EnhancedChatAgent:
    """
    Enhanced chat agent that orchestrates conversation processing through LangGraph.

    This agent serves as the main interface between the WebSocket consumer and the
    LangGraph processing pipeline. It handles:
    - Message preprocessing and validation
    - State management and chat history
    - Graph execution coordination
    - Response formatting for frontend consumption
    """

    def __init__(self, user_id: Optional[str] = None, session_id: Optional[str] = None):
        """
        Initialize the enhanced chat agent.

        Args:
            user_id: User identifier
            session_id: Session identifier
        """
        self.user_id = user_id
        self.session_id = session_id or f"session_{int(time.time())}"
        self.chat_history: List[ChatMessage] = []
        self.graph = get_global_graph()

        logger.info(f"Enhanced ChatAgent initialized for user {user_id}, session {self.session_id}")

    async def process_message(self, message: str, user_id: Optional[str] = None,
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process incoming message through the LangGraph pipeline.

        Args:
            message: The incoming message text
            user_id: User identifier (optional, uses instance user_id if not provided)
            context: Additional context for processing

        Returns:
            Dict containing structured response for frontend consumption
        """
        start_time = time.time()

        try:
            # Use provided user_id or fall back to instance user_id
            effective_user_id = user_id or self.user_id or "anonymous"

            # Validate input
            if not message or not message.strip():
                return self._create_error_response("Empty message received")

            # Add user message to history
            user_message = ChatMessage(
                role="user",
                content=message.strip(),
                timestamp=datetime.now()
            )
            self.chat_history.append(user_message)

            # Create initial agent state
            initial_state = AgentState(
                query=message.strip(),
                user_id=effective_user_id,
                session_id=self.session_id,
                chat_history=self.chat_history.copy(),
                context=context or {},
                metadata={
                    "start_time": start_time,
                    "agent_version": "enhanced_v1.0"
                }
            )

            # Process through graph
            final_state = await self._execute_graph(initial_state)

            # Calculate processing time
            processing_time = int((time.time() - start_time) * 1000)

            # Handle errors
            if final_state.has_error():
                logger.error(f"Graph processing error: {final_state.error}")
                return self._create_error_response(final_state.error, processing_time)

            # Extract result
            result = final_state.result or "I processed your request but didn't generate a response."

            # Add assistant message to history
            assistant_message = ChatMessage(
                role="assistant",
                content=result,
                timestamp=datetime.now(),
                metadata={
                    "intent": final_state.intent.value if final_state.intent else None,
                    "data_mode": final_state.data_mode.value if final_state.data_mode else None,
                    "processing_time": processing_time,
                    "image_url": final_state.image_url,  # Save image_url for history
                    "table_html": final_state.table_html,  # Save table for history
                    "table_data": final_state.table_data   # Save table data for history
                }
            )
            self.chat_history.append(assistant_message)

            # Create success response
            return self._create_success_response(
                result,
                final_state,
                processing_time
            )

        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            error_msg = f"Agent processing error: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return self._create_error_response(error_msg, processing_time)

    async def _execute_graph(self, state: AgentState) -> AgentState:
        """
        Execute the LangGraph processing pipeline.

        Args:
            state: Initial agent state

        Returns:
            Final processed state
        """
        try:
            # Run graph in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            final_state = await loop.run_in_executor(
                None,
                self.graph.invoke,
                state
            )
            return final_state

        except Exception as e:
            logger.error(f"Graph execution error: {e}")
            return state.model_copy(update={
                "error": f"Graph execution failed: {str(e)}"
            })

    def _create_success_response(self, result: str, state: AgentState,
                               processing_time: int) -> Dict[str, Any]:
        """Create structured success response for frontend."""
        response_data = {
            "success": True,
            "response": [
                {
                    "role": "assistant",
                    "content": result,
                    "timestamp": datetime.now().isoformat(),
                    "metadata": {
                        "intent": state.intent.value if state.intent else None,
                        "data_mode": state.data_mode.value if state.data_mode else None,
                        "processing_time": processing_time,
                        "session_id": self.session_id,
                        "has_images": bool(state.images),
                        "has_files": bool(state.files)
                    }
                }
            ],
            "metadata": {
                "processing_time": processing_time,
                "session_id": self.session_id,
                "message_count": len(self.chat_history),
                "agent_version": "enhanced_v1.0"
            }
        }
        
        # Add image_url if present in state
        if state.image_url:
            response_data["image_url"] = state.image_url
            response_data["response"][0]["image_url"] = state.image_url
        
        # Add table data if present in state  
        if state.table_html:
            response_data["table_html"] = state.table_html
            response_data["response"][0]["table_html"] = state.table_html
        if state.table_data:
            response_data["table_data"] = state.table_data
            response_data["response"][0]["table_data"] = state.table_data
        
        return response_data
        
    def _create_error_response(self, error_message: str,
                             processing_time: Optional[int] = None) -> Dict[str, Any]:
        """Create structured error response for frontend."""
        return {
            "success": False,
            "error": error_message,
            "response": [
                {
                    "role": "assistant",
                    "content": f"❌ {error_message}",
                    "timestamp": datetime.now().isoformat(),
                    "metadata": {
                        "error": True,
                        "processing_time": processing_time,
                        "session_id": self.session_id
                    }
                }
            ],
            "metadata": {
                "processing_time": processing_time,
                "session_id": self.session_id,
                "error": True
            }
        }

    def get_chat_history(self) -> List[Dict[str, Any]]:
        """Get formatted chat history for frontend."""
        history = []
        for msg in self.chat_history:
            msg_dict = {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "metadata": msg.metadata or {}
            }
            
            # Extract image_url and table data from metadata if present
            if msg.metadata:
                if "image_url" in msg.metadata and msg.metadata["image_url"]:
                    msg_dict["image_url"] = msg.metadata["image_url"]
                if "table_html" in msg.metadata and msg.metadata["table_html"]:
                    msg_dict["table_html"] = msg.metadata["table_html"]
                if "table_data" in msg.metadata and msg.metadata["table_data"]:
                    msg_dict["table_data"] = msg.metadata["table_data"]
            
            history.append(msg_dict)
        
        return history

    def clear_history(self) -> None:
        """Clear chat history."""
        self.chat_history.clear()
        logger.info(f"Chat history cleared for session {self.session_id}")

    def set_context(self, context: Dict[str, Any]) -> None:
        """Set additional context for processing."""
        self.context = context


# Backward compatibility
class ChatAgent(EnhancedChatAgent):
    """Backward compatibility alias."""
    pass
