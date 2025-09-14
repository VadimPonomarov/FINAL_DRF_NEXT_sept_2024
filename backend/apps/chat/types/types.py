"""
Enhanced types and state for multi-tool chat agent with ChatAI integration.
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import pandas as pd


class DataMode(str, Enum):
    """Data mode for determining information source."""

    HISTORICAL = "historical"  # Use trained/historical data
    REALTIME = "realtime"     # Fetch current/live data


class Intent(str, Enum):
    """User request type for graph routing."""

    # Core conversation
    GENERAL_CHAT = "general_chat"           # General conversation with ChatAI

    # Information retrieval
    FACTUAL_SEARCH = "factual_search"       # Search with Tavily
    WEB_CRAWLING = "web_crawling"           # Web scraping with Crawl4AI

    # Content generation
    TEXT_GENERATION = "text_generation"     # Text generation with ChatAI
    IMAGE_GENERATION = "image_generation"   # Image generation with ChatAI flux-schnell

    # Code and analysis
    CODE_EXECUTION = "code_execution"       # Python code execution
    DATA_ANALYSIS = "data_analysis"         # Data analysis and visualization

    # File operations
    FILE_READ = "file_read"                 # Read file contents
    FILE_WRITE = "file_write"               # Write to files
    FILE_ANALYSIS = "file_analysis"         # Analyze file contents

    # Utility
    DATETIME = "datetime"                   # Date/time queries


class ChatMessage(BaseModel):
    """Individual chat message."""

    role: str = Field(..., description="Message role: user, assistant, system")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AgentState(BaseModel):
    """
    Enhanced agent state for processing requests.

    Attributes:
        query: Original user query
        user_id: User identifier
        session_id: Session identifier
        chat_history: Conversation history
        now: Current timestamp
        intent: Determined request type
        data_mode: Data source mode (historical/realtime)
        result: Final processing result
        intermediate_results: Results from intermediate steps
        context: Additional context data
        files: File-related data
        df: Structured data for visualization
        html: HTML content for parsing
        images: Generated or processed images
        error: Error message if occurred
        metadata: Additional metadata
    """

    # Core fields
    query: str = Field(..., description="User query")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")

    # Chat context
    chat_history: List[ChatMessage] = Field(default_factory=list, description="Chat history")

    # Processing state
    now: Optional[datetime] = Field(default_factory=datetime.now)
    intent: Optional[Intent] = Field(default=None, description="Classified intent")
    data_mode: Optional[DataMode] = Field(default=DataMode.HISTORICAL, description="Data source mode")

    # Results
    result: Optional[str] = Field(default=None, description="Final result")
    intermediate_results: Dict[str, Any] = Field(default_factory=dict, description="Intermediate results")

    # Data containers
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    files: Dict[str, Any] = Field(default_factory=dict, description="File data")
    df: Optional[pd.DataFrame] = Field(default=None, description="Structured data")
    html: Optional[str] = Field(default=None, description="HTML content")
    images: List[str] = Field(default_factory=list, description="Image URLs or paths")

    # Error handling
    error: Optional[str] = Field(default=None, description="Error message")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    model_config = {"arbitrary_types_allowed": True}

    def has_error(self) -> bool:
        """Check if state has error."""
        return self.error is not None

    def get_timestamp(self) -> str:
        """Get formatted timestamp."""
        return self.now.strftime('%d.%m.%Y %H:%M') if self.now else ""

    def add_intermediate_result(self, key: str, value: Any) -> None:
        """Add intermediate result."""
        self.intermediate_results[key] = value

    def get_intermediate_result(self, key: str, default: Any = None) -> Any:
        """Get intermediate result."""
        return self.intermediate_results.get(key, default)

    def add_chat_message(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add message to chat history."""
        message = ChatMessage(
            role=role,
            content=content,
            metadata=metadata or {}
        )
        self.chat_history.append(message)

    def get_recent_messages(self, limit: int = 10) -> List[ChatMessage]:
        """Get recent chat messages."""
        return self.chat_history[-limit:] if self.chat_history else []