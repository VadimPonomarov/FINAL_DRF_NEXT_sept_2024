from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from loguru import logger

from core.services.jwt import JwtService


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware для проверки JWT токена в WebSocket соединениях.
    """

    async def __call__(self, scope, receive, send):
        # Only handle WebSocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)

        try:
            # Get token from query parameters
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            logger.info(f"WebSocket connection attempt. Path: {scope.get('path')}, Query params keys: {list(query_params.keys())}")

            # Try to get token from multiple sources
            token = self._extract_token(query_params, scope.get("headers", []))

            if not token:
                logger.warning("WebSocket connection attempt without token - allowing for potential token refresh")
                # Instead of immediately rejecting, we'll allow the connection but mark user as anonymous
                # This allows the frontend to attempt token refresh
                scope["user"] = None
                scope["user_name"] = "anonymous"
                scope["auth_required"] = True
                logger.info("WebSocket connection allowed without authentication (anonymous mode)")
                return await super().__call__(scope, receive, send)

            try:
                # Validate the token
                validated_user = await self._validate_token(token)
                if not validated_user:
                    logger.warning("WebSocket token validation failed - allowing anonymous connection for refresh")
                    scope["user"] = None
                    scope["user_name"] = "anonymous"
                    scope["auth_required"] = True
                    return await super().__call__(scope, receive, send)

                # Add authenticated user to scope
                scope["user"] = validated_user
                scope["user_name"] = getattr(validated_user, "username",
                                           validated_user.email.split("@")[0] if hasattr(validated_user, "email")
                                           else "anonymous")
                scope["auth_required"] = False

                logger.info(f"WebSocket authentication successful for user: {scope['user_name']}")
                return await super().__call__(scope, receive, send)

            except Exception as token_error:
                # Log the error but allow anonymous connection for potential token refresh
                error_message = str(token_error)
                if hasattr(token_error, 'detail'):
                    error_message = f"Token validation failed: {token_error.detail}"

                logger.warning(f"Token validation error (allowing anonymous): {error_message}")

                # Allow anonymous connection for token refresh attempts
                scope["user"] = None
                scope["user_name"] = "anonymous"
                scope["auth_required"] = True
                scope["auth_error"] = error_message

                return await super().__call__(scope, receive, send)

        except Exception as e:
            # Handle general exceptions
            error_message = str(e)
            if hasattr(e, 'detail'):
                error_message = f"Connection error: {e.detail}"

            logger.error(f"WebSocket connection error: {error_message}", exc_info=True)
            return await self.close_with_error(send, 4000, "Internal server error")


    async def close_with_error(self, send, code: int, message: str = None):
        """Helper method to close connection with error

        Args:
            send: ASGI send function
            code: WebSocket close code
            message: Optional error message
        """
        close_data = {
            "type": "websocket.close",
            "code": code
        }

        # Добавляем сообщение об ошибке, если оно есть
        if message:
            logger.info(
                f"Closing WebSocket connection with code {code} and message: {message}")
            close_data["reason"] = message
        else:
            logger.info(f"Closing WebSocket connection with code {code}")

        await send(close_data)

    def _extract_token(self, query_params: dict, headers: list) -> str:
        """Extract token from query parameters or headers."""
        # Try query parameters first
        token = query_params.get("token", [None])[0]
        if token:
            return token.strip()

        # Try Authorization header
        headers_dict = dict(headers)
        auth_header = headers_dict.get(b"authorization", b"").decode()
        if auth_header:
            # Handle "Bearer <token>" format
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1].strip()
            return auth_header.strip()

        # Try WebSocket protocol header (some clients use this)
        protocol_header = headers_dict.get(b"sec-websocket-protocol", b"").decode()
        if protocol_header:
            return protocol_header.strip()

        return None

    async def _validate_token(self, token: str):
        """Validate JWT token and return user."""
        if not token:
            return None

        try:
            # Clean the token (remove 'Bearer ' if present)
            clean_token = token.replace("Bearer ", "").strip()
            if not clean_token:
                return None

            # Validate the token
            validated_user = await sync_to_async(JwtService.validate_any_token)(clean_token)
            if not validated_user or not validated_user.is_authenticated:
                return None

            return validated_user

        except Exception as e:
            logger.debug(f"Token validation failed: {e}")
            return None
