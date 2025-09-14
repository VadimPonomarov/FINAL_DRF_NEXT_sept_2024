"""
Enhanced WebSocket consumer for chat orchestration.

This consumer serves as a pure orchestrator between frontend and backend,
handling connection management, user validation, message routing, and response formatting.
All AI processing is delegated to the ChatAgent and LangGraph pipeline.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from urllib.parse import parse_qs
from datetime import datetime

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.conf import settings

from .agent import EnhancedChatAgent

logger = logging.getLogger(__name__)
User = get_user_model()


class EnhancedChatConsumer(AsyncWebsocketConsumer):
    """
    Enhanced WebSocket consumer for chat orchestration.

    Responsibilities:
    - Connection lifecycle management
    - User authentication and validation
    - Message routing and response formatting
    - Error handling and logging
    - Session management

    All AI processing is delegated to EnhancedChatAgent.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user: Optional[User] = None
        self.agent: Optional[EnhancedChatAgent] = None
        self.session_id: Optional[str] = None
        self.connection_time: Optional[datetime] = None
    
    async def connect(self):
        """
        Handle WebSocket connection establishment.

        Validates user authentication, initializes agent, and sends welcome message.
        """
        try:
            self.connection_time = datetime.now()
            self.user = self.scope.get("user")

            # Validate authentication (skip in debug mode)
            if not self._is_user_authorized():
                logger.warning(f"🛑 Unauthorized connection attempt from {self._get_client_ip()}")
                await self._send_error("Authentication required")
                await self.close(code=4001)  # Custom close code for auth failure
                return

            # Generate session ID
            self.session_id = self._generate_session_id()

            # Initialize agent
            user_id = str(self.user.id) if self.user and self.user.is_authenticated else None
            self.agent = EnhancedChatAgent(user_id=user_id, session_id=self.session_id)

            # Parse connection parameters
            connection_params = self._parse_connection_params()

            # Accept connection
            await self.accept()

            # Initialize welcome message flag
            self._welcome_sent = False

            # Send welcome message
            await self._send_welcome_message(connection_params)

            logger.info(f"✅ Connection established: user={user_id}, session={self.session_id}")

        except Exception as e:
            logger.error(f"[connect] Connection error: {e}", exc_info=True)
            await self._send_error(f"Connection failed: {str(e)}")
            await self.close(code=4000)
    
    async def receive(self, text_data: str) -> None:
        """
        Handle incoming WebSocket messages.

        Routes messages to appropriate handlers based on message type.
        """
        try:
            # Parse incoming message
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                await self._send_error("Invalid JSON format")
                return

            # Validate message structure
            if not isinstance(data, dict):
                await self._send_error("Message must be a JSON object")
                return

            message_type = data.get("type", "chat")

            # Route by message type
            if message_type == "chat":
                await self._handle_chat_message(data)
            elif message_type == "file_message":
                await self._handle_file_message(data)
            elif message_type == "ping":
                await self._handle_ping()
            elif message_type == "chat_history":
                await self._handle_chat_history_request(data)
            elif message_type == "clear_history":
                await self._handle_clear_history()
            else:
                await self._send_error(f"Unknown message type: {message_type}")

        except Exception as e:
            logger.error(f"[receive] Message processing error: {e}", exc_info=True)
            await self._send_error(f"Message processing failed: {str(e)}")

    async def _handle_chat_message(self, data: Dict[str, Any]) -> None:
        """Handle chat message processing."""
        try:
            message = data.get("message", "").strip()
            files = data.get("files", [])

            # If files are attached, delegate to file message handler
            if files:
                logger.info(f"Chat message has {len(files)} attached files, delegating to file handler")
                await self._handle_file_message(data)
                return

            if not message:
                await self._send_error("Empty message")
                return

            if not self.agent:
                await self._send_error("Agent not initialized")
                return

            # Optional: Echo user message back immediately
            if data.get("echo", False):
                await self._send_user_message_echo(message)

            # Process message through agent
            response = await self.agent.process_message(
                message=message,
                context=data.get("context", {})
            )

            # Send response to frontend
            await self._send_agent_response(response)

        except Exception as e:
            logger.error(f"Chat message handling error: {e}", exc_info=True)
            await self._send_error(f"Chat processing failed: {str(e)}")

    async def _handle_file_message(self, data: Dict[str, Any]) -> None:
        """Handle file message processing."""
        try:
            message = data.get("message", "").strip()
            files = data.get("files", [])

            if not message and not files:
                await self._send_error("Empty file message")
                return

            if not self.agent:
                await self._send_error("Agent not initialized")
                return

            # Process file message through agent with file context
            context = data.get("context", {})
            context["files"] = files  # Add files to context
            context["message_type"] = "file_message"

            response = await self.agent.process_message(
                message=message or "Analyze the uploaded files",
                context=context
            )

            # Send response to frontend with file_message type
            await self._send_file_response(response, files)

        except Exception as e:
            logger.error(f"File message handling error: {e}", exc_info=True)
            await self._send_error(f"File processing failed: {str(e)}")

    async def _handle_ping(self) -> None:
        """Handle ping message for connection keepalive."""
        await self.send(text_data=json.dumps({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }))

    async def _handle_chat_history_request(self, data: Dict[str, Any]) -> None:
        """Handle chat history request."""
        try:
            if not self.agent:
                await self._send_error("Agent not initialized")
                return

            history = self.agent.get_chat_history()
            await self.send(text_data=json.dumps({
                "type": "chat_history",
                "history": history,
                "session_id": self.session_id
            }))

        except Exception as e:
            logger.error(f"Chat history request error: {e}", exc_info=True)
            await self._send_error("Failed to retrieve chat history")

    async def _handle_clear_history(self) -> None:
        """Handle clear chat history request."""
        try:
            if self.agent:
                self.agent.clear_history()

            await self.send(text_data=json.dumps({
                "type": "history_cleared",
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            }))

        except Exception as e:
            logger.error(f"Clear history error: {e}", exc_info=True)
            await self._send_error("Failed to clear history")

    async def disconnect(self, close_code: int) -> None:
        """
        Handle WebSocket disconnection.

        Cleanup resources and log disconnection.
        """
        try:
            # Calculate session duration
            duration = None
            if self.connection_time:
                duration = (datetime.now() - self.connection_time).total_seconds()

            # Log disconnection
            user_id = str(self.user.id) if self.user and self.user.is_authenticated else "anonymous"
            logger.info(
                f"❌ Disconnection: user={user_id}, session={self.session_id}, "
                f"code={close_code}, duration={duration}s"
            )

            # Cleanup agent
            if self.agent:
                # Could add cleanup logic here if needed
                self.agent = None

        except Exception as e:
            logger.error(f"Disconnect cleanup error: {e}", exc_info=True)

    # Helper methods for message handling

    def _is_user_authorized(self) -> bool:
        """Check if user is authorized to connect."""
        # In debug mode, allow all connections
        if settings.DEBUG:
            return True

        # In production, require authenticated user
        return self.user and self.user.is_authenticated

    def _get_client_ip(self) -> str:
        """Get client IP address from connection scope."""
        try:
            return self.scope.get("client", ["unknown", None])[0]
        except Exception:
            return "unknown"

    def _generate_session_id(self) -> str:
        """Generate unique session ID."""
        import time
        import random
        timestamp = int(time.time())
        random_part = random.randint(1000, 9999)
        user_part = str(self.user.id) if self.user and self.user.is_authenticated else "anon"
        return f"session_{user_part}_{timestamp}_{random_part}"

    def _parse_connection_params(self) -> Dict[str, Any]:
        """Parse connection parameters from query string."""
        try:
            query_params = self.scope.get("query_string", b"").decode("utf-8")
            if query_params:
                return parse_qs(query_params)
            return {}
        except Exception as e:
            logger.warning(f"Failed to parse connection params: {e}")
            return {}

    async def _send_welcome_message(self, connection_params: Dict[str, Any]) -> None:
        """Send welcome message to client."""
        # Check if we've already sent a welcome message for this session
        if hasattr(self, '_welcome_sent') and self._welcome_sent:
            logger.debug(f"Welcome message already sent for session {self.session_id}")
            return

        user_name = "Guest"
        if self.user and self.user.is_authenticated:
            user_name = getattr(self.user, 'username', None) or self.user.email  # UserModel doesn't have first_name

        welcome_data = {
            "type": "welcome",
            "message": f"👋 Hello, {user_name}! I'm ready to help you.",
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "message_id": f"welcome_{self.session_id}_{int(datetime.now().timestamp())}",
            "capabilities": [
                "General conversation",
                "Image generation",
                "Web search",
                "Code execution",
                "File operations"
            ]
        }

        await self.send(text_data=json.dumps(welcome_data))

        # Mark welcome message as sent for this session
        self._welcome_sent = True
        logger.debug(f"Welcome message sent for session {self.session_id}")

    async def _send_user_message_echo(self, message: str) -> None:
        """Echo user message back to client."""
        await self.send(text_data=json.dumps({
            "type": "user_message",
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id
        }))

    async def _send_agent_response(self, response: Dict[str, Any]) -> None:
        """Send agent response to client in expected format."""
        try:
            if response.get("success"):
                # Handle list of messages format
                if response.get("response"):
                    for msg in response.get("response", []):
                        await self.send(text_data=json.dumps({
                            "type": "message",
                            "message": msg["content"],
                            "role": msg["role"],
                            "timestamp": msg.get("timestamp", datetime.now().isoformat()),
                            "metadata": msg.get("metadata", {}),
                            "session_id": self.session_id
                        }))
                # Handle single result format (from agent)
                elif response.get("result"):
                    await self.send(text_data=json.dumps({
                        "type": "message",
                        "message": response["result"],
                        "role": "assistant",
                        "timestamp": datetime.now().isoformat(),
                        "metadata": response.get("metadata", {}),
                        "session_id": self.session_id
                    }))

                # Send metadata if present
                if response.get("metadata"):
                    await self.send(text_data=json.dumps({
                        "type": "response_metadata",
                        "metadata": response["metadata"],
                        "session_id": self.session_id
                    }))
            else:
                # Send error response
                await self._send_error(response.get("error", "Unknown error"))

        except Exception as e:
            logger.error(f"Error sending agent response: {e}", exc_info=True)
            await self._send_error("Failed to send response")

    async def _send_file_response(self, response: Dict[str, Any], files: List[Dict[str, Any]]) -> None:
        """Send file processing response to client."""
        try:
            if response.get("error"):
                await self._send_error(response["error"])
                return

            # Send successful file response
            for msg in response.get("response", []):
                await self.send(text_data=json.dumps({
                    "type": "file_message",
                    "message": msg["content"],
                    "role": msg["role"],
                    "timestamp": msg.get("timestamp", datetime.now().isoformat()),
                    "metadata": msg.get("metadata", {}),
                    "files": files,
                    "session_id": self.session_id
                }))

            # Send metadata if present
            if response.get("metadata"):
                await self.send(text_data=json.dumps({
                    "type": "file_metadata",
                    "metadata": response["metadata"],
                    "files": files,
                    "session_id": self.session_id
                }))

        except Exception as e:
            logger.error(f"Error sending file response: {e}")
            await self._send_error(f"Failed to send file response: {str(e)}")

    async def _send_error(self, error_message: str) -> None:
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            "type": "error",
            "message": error_message,
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id
        }))


# Backward compatibility
class ChatConsumer(EnhancedChatConsumer):
    """Backward compatibility alias."""
    pass
