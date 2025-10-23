"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { WebSocketMessage, SendChatHistoryOptions } from "@/utils/chat/chatTypes";
import { wsLogger } from "@/utils/chat/logger";
import { fileToBase64 } from "@/utils/chat/fileUpload";
import { API_URLS, AuthProvider } from "@/common/constants/constants";
import { getRedisData } from "@/services/redis/redisService";
import { resolveServiceUrl } from "@/utils/api/serviceUrlResolver";

interface UseChatWebSocketProps {
  channelId?: string;
  onAuthError?: () => void;
  onMessageReceived?: (message: WebSocketMessage) => void;
  onResponseEnd?: () => void;
}

/**
 * Hook for managing WebSocket connections for chat
 */
export const useChatWebSocket = ({
  channelId = "default",
  onAuthError,
  onMessageReceived,
  onResponseEnd,
}: UseChatWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const lastReconnectTime = useRef<number>(0);
  const reconnectDelay = useRef<number>(1000); // Начальная задержка 1 секунда

  // Track connection attempts and welcome messages to prevent duplicates
  const connectionAttemptRef = useRef<string | null>(null);
  const welcomeMessageReceivedRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const isExplicitDisconnect = useRef(false);

  // Simple geolocation fallback
  const getLocation = useCallback(async () => {
    return {
      city: 'Запорожье',
      region: 'Запорожская область',
      country: 'Украина',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: navigator.language || 'en-US'
    };
  }, []);

  // Счетчик попыток обновления токена
  const tokenRefreshAttemptsRef = useRef<number>(0);

  // Максимальное количество попыток обновления токена
  const MAX_TOKEN_REFRESH_ATTEMPTS = 3;

  // Функция для показа уведомления об ошибке аутентификации
  const redirectToLogin = useCallback(
    (message: string) => {
      // Показываем уведомление с таймаутом
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive",
        duration: 10000, // 10 секунд таймаут
      });

      // Сохраняем сообщение об ошибке для возможного использования в будущем
      if (typeof window !== "undefined") {
        sessionStorage.setItem("auth_error", message);

        // Создаем URL логина с callback на текущую страницу
        const currentUrl = window.location.href;
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('callbackUrl', currentUrl);
        loginUrl.searchParams.set('message', message);

        // Добавляем задержку перед перенаправлением
        setTimeout(() => {
          console.log(`[ChatWebSocket] Redirecting to login with callback: ${loginUrl.href}`);
          window.location.href = loginUrl.href;
        }, 10000); // Перенаправляем через 10 секунд
      }
    },
    [toast],
  );









  // Функция для проверки истечения JWT токена
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      wsLogger.error('Error checking token expiration:', error);
      return true; // Считаем токен истекшим при ошибке
    }
  }, []);

  // Функция для получения токена доступа
  const getAccessToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      try {
        // Если требуется принудительное обновление (например, при ошибке авторизации),
        // сразу отправляем запрос на обновление токена
        if (forceRefresh) {
          wsLogger.info(
            "Forcing token refresh due to auth error or explicit request",
          );

          // ✅ КРИТИЧНО: Проверяем наличие refresh токена в Redis ПЕРЕД попыткой refresh
          try {
            const redisCheckResponse = await fetch("/api/redis?key=backend_auth");
            if (redisCheckResponse.ok) {
              const redisData = await redisCheckResponse.json();
              
              // Если токенов вообще нет в Redis - редирект на логин
              if (!redisData.exists || !redisData.value) {
                wsLogger.error("No tokens in Redis - redirecting to login");
                console.log("[Token Refresh] No tokens in Redis - redirecting to login");
                redirectToLogin("Authentication required. Please login.");
                return null;
              }
              
              // Парсим токены
              const tokenData = typeof redisData.value === 'string' 
                ? JSON.parse(redisData.value) 
                : redisData.value;
              
              // Если нет refresh токена - не можем обновить, редирект на логин
              if (!tokenData.refresh) {
                wsLogger.error("No refresh token found in Redis - redirecting to login");
                console.log("[Token Refresh] No refresh token - redirecting to login");
                redirectToLogin("Session expired. Please login again.");
                return null;
              }
              
              // Refresh токен есть - продолжаем попытку обновления
              wsLogger.info("Refresh token found in Redis - proceeding with token refresh");
            } else {
              // Не можем прочитать Redis - редирект на логин
              wsLogger.error("Could not check Redis - redirecting to login");
              redirectToLogin("Authentication error. Please login again.");
              return null;
            }
          } catch (redisError) {
            wsLogger.error("Error checking Redis tokens", redisError);
            // При ошибке проверки Redis - редирект на логин
            redirectToLogin("Authentication error. Please login again.");
            return null;
          }

          // Проверяем, не превысили ли мы максимальное количество попыток
          if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
            wsLogger.error(
              `Max token refresh attempts (${MAX_TOKEN_REFRESH_ATTEMPTS}) reached`,
            );
            redirectToLogin(
              "Too many authentication attempts. Please login again.",
            );
            return null;
          }

          // Увеличиваем счетчик попыток
          tokenRefreshAttemptsRef.current++;

          wsLogger.info(
            `Refreshing token (attempt ${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`,
          );

          // Отправляем запрос на обновление токена
          try {
            // ЭТАП 1: Показываем начало обновления токена
            console.log("[Token Refresh] Starting token refresh process...");
            toast({
              title: "Token Refresh",
              description: "Refreshing authentication tokens...",
              duration: 3000,
            });

            console.log("[Token Refresh] Sending request to /api/auth/refresh");
            const refreshResponse = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            console.log("[Token Refresh] Response status:", refreshResponse.status);
            console.log("[Token Refresh] Response ok:", refreshResponse.ok);

            if (!refreshResponse.ok) {
              const errorText = await refreshResponse.text();
              console.error("[Token Refresh] Error response:", errorText);
              wsLogger.error(`Token refresh failed: ${refreshResponse.status} - ${errorText}`);

              // ЭТАП 2 - НЕУСПЕХ: Ошибка получения токенов
              toast({
                title: "❌ Token Refresh Failed",
                description: `Failed to refresh tokens (${refreshResponse.status}). Please login again.`,
                variant: "destructive",
                duration: 8000,
              });

              // Если это последняя попытка, перенаправляем на логин
              if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
                redirectToLogin(
                  "Failed to refresh authentication. Please login again.",
                );
              }
              return null;
            }

            console.log("[Token Refresh] Getting response data...");
            const refreshData = await refreshResponse.json();
            console.log("[Token Refresh] Response data:", {
              success: refreshData.success,
              hasAccess: !!refreshData.access,
              hasRefresh: !!refreshData.refresh,
              tokensVerified: refreshData.tokensVerified
            });

            if (!refreshData.access) {
              wsLogger.error("No access token in refresh response");

              // ЭТАП 2 - НЕУСПЕХ: Нет токена в ответе
              toast({
                title: "❌ Token Refresh Failed",
                description: "No access token received. Please login again.",
                variant: "destructive",
                duration: 8000,
              });

              redirectToLogin("Authentication failed. Please login again.");
              return null;
            }

            // ЭТАП 2: Проверяем результат сохранения токенов
            if (refreshData.tokensVerified === true) {
              // Токены успешно обновлены и проверены
              toast({
                title: "✅ Token Refresh Complete",
                description: "Authentication tokens successfully refreshed and verified",
                duration: 4000,
              });
            } else {
              // Токены получены, но есть проблемы с сохранением
              toast({
                title: "⚠️ Token Refresh Warning",
                description: "Tokens refreshed but storage verification failed",
                duration: 6000,
                variant: "destructive",
              });
            }

            // Сбрасываем счетчик попыток после успешного обновления
            tokenRefreshAttemptsRef.current = 0;
            console.log("[Token Refresh] Success! New token:", refreshData.access ? "received" : "missing");
            wsLogger.info("Token refreshed successfully");
            return refreshData.access;
          } catch (refreshError) {
            console.error("[Token Refresh] Request failed:", refreshError);
            wsLogger.error("Error refreshing token:", refreshError);

            // ЭТАП 2 - НЕУСПЕХ: Ошибка сети или другая ошибка
            toast({
              title: "❌ Token Refresh Error",
              description: "Network error during token refresh. Please try again.",
              variant: "destructive",
              duration: 8000,
            });

            // Если это последняя попытка, перенаправляем на логин
            if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
              redirectToLogin("Authentication failed. Please login again.");
            }
            return null;
          }
        }

        // Если не требуется принудительное обновление, получаем текущий токен из Redis
        let response;
        try {
          console.log("[DEBUG] Attempting to fetch from Redis API");
          console.log("[DEBUG] Request URL: /api/redis?key=backend_auth");
          response = await fetch("/api/redis?key=backend_auth");
          console.log("[DEBUG] Redis API response status:", response.status);
          console.log("[DEBUG] Redis API response ok:", response.ok);
          console.log("[DEBUG] Redis API response headers:", Object.fromEntries(response.headers.entries()));
        } catch (fetchError) {
          console.error("[DEBUG] Failed to connect to Redis API:", fetchError);
          wsLogger.error("Failed to connect to Redis API:", fetchError);

          // Если не можем получить данные из Redis, пытаемся обновить токен
          wsLogger.info("Attempting to refresh token through API due to Redis error");
          return await getAccessToken(true); // Рекурсивный вызов с принудительным обновлением
        }

        if (!response.ok) {
          wsLogger.error(
            "Failed to get auth data from Redis:",
            response.status,
          );
          // Пытаемся обновить токен
          return await getAccessToken(true);
        }

        const data = await response.json();

        if (!data || !data.value) {
          wsLogger.error("No auth data in Redis");
          // Пытаемся обновить токен
          return await getAccessToken(true);
        }

        // Парсим данные
        let parsedData;
        try {
          parsedData =
            typeof data.value === "string"
              ? JSON.parse(data.value)
              : data.value;

          // Сохраняем данные в localStorage для резервного доступа
          localStorage.setItem("backend_auth", JSON.stringify(parsedData));
        } catch (error) {
          wsLogger.error("Error parsing auth data:", error);
          redirectToLogin("Invalid authentication data. Please login again.");
          return null;
        }

        // Проверяем наличие токена
        if (!parsedData.access) {
          wsLogger.error("No access token in auth data");
          return await getAccessToken(true);
        }

        // Проверяем, не истек ли токен
        if (isTokenExpired(parsedData.access)) {
          wsLogger.info("Access token expired, refreshing...");
          return await getAccessToken(true);
        }

        // Возвращаем существующий токен доступа
        return parsedData.access;
      } catch (error) {
        wsLogger.error("Error getting access token:", error);
        return null;
      }
    },
    [redirectToLogin, isTokenExpired],
  );

  // Function to connect to WebSocket
  const connect = useCallback(
    async (customChannelId?: string, sendGreeting: boolean = false) => {
      // Don't attempt to connect if chat is hidden or explicitly disconnected
      if (!isChatVisible || isExplicitDisconnect.current) {
        wsLogger.info('Connection attempt prevented: chat is hidden or explicitly disconnected');
        return;
      }

      // Reset reconnect attempts if we're not in a reconnection scenario
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        wsLogger.info('Max reconnection attempts reached, not trying to reconnect');
        return;
      }

      // Проверяем, прошло ли достаточно времени с последней попытки
      const now = Date.now();
      const timeSinceLastReconnect = now - lastReconnectTime.current;
      
      if (timeSinceLastReconnect < reconnectDelay.current) {
        const waitTime = reconnectDelay.current - timeSinceLastReconnect;
        wsLogger.info(`Rate limiting: waiting ${waitTime}ms before reconnect attempt`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Обновляем время последней попытки
      lastReconnectTime.current = Date.now();

      // If already connected to the same channel, do nothing
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const currentUrl = socketRef.current.url;
        const targetChannelId = customChannelId || channelId;

        // Check if already connected to the same channel
        if (
          currentUrl.includes(`/ws/chat/${targetChannelId}/`) ||
          (currentUrl.includes("/ws/chat/test/") &&
            targetChannelId === "default")
        ) {
          wsLogger.info(
            `Already connected to channel ${targetChannelId}, skipping reconnect`,
          );
          return;
        }

        // If connected to a different channel, close the connection first
        wsLogger.info(
          `Closing connection to different channel before connecting to ${targetChannelId}`,
        );
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);

        // Add a small delay before reconnecting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // If connecting, do nothing
      if (isConnecting) {
        wsLogger.info("Already connecting to WebSocket");
        return;
      }

      try {
        setIsConnecting(true);
        wsLogger.info("Connecting to WebSocket...");

        // Create WebSocket connection
        const targetChannelId = customChannelId || channelId;

        // Check if we're already attempting to connect to this channel
        if (connectionAttemptRef.current === targetChannelId) {
          wsLogger.debug(`Connection attempt already in progress for channel ${targetChannelId}`);
          return;
        }

        // Mark this connection attempt
        connectionAttemptRef.current = targetChannelId;

        // Функция для обработки окончательной неудачи с токеном
        const handleTokenFailure = () => {
          toast({
            title: "Connection Error",
            description: "Failed to get authentication token for WebSocket connection. Redirecting to login...",
            variant: "destructive",
            duration: 5000,
          });

          if (onAuthError) {
            onAuthError();
          }

          // Редирект на логин через 2 секунды
          setTimeout(() => {
            redirectToLogin("Authentication failed. Please login again.");
          }, 2000);
        };

        // Получаем токен доступа с автоматическим рефрешем при необходимости
        wsLogger.info("Getting access token for WebSocket connection");
        let token = await getAccessToken(false); // Сначала проверяем текущий токен

        // Если токен не получен, пытаемся принудительно обновить
        if (!token && tokenRefreshAttemptsRef.current < MAX_TOKEN_REFRESH_ATTEMPTS) {
          wsLogger.info("No valid token found, attempting forced refresh...");
          tokenRefreshAttemptsRef.current += 1;

          toast({
            title: "Connecting...",
            description: `Refreshing authentication tokens... (${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`,
            duration: 3000,
          });

          token = await getAccessToken(true); // Принудительное обновление
        }

        // ✅ КРИТИЧНО: Токен обязателен для подключения
        if (!token) {
          wsLogger.error("No access token available - cannot connect to WebSocket");
          console.log("[WebSocket] No token - cannot connect, redirecting to login");
          setIsConnecting(false);
          
          // Редирект на логин
          redirectToLogin("Authentication required. Please login to use chat.");
          return;
        }

        // Используем serviceUrlResolver для правильного определения WebSocket URL с токеном
        const baseUrl = await resolveServiceUrl('backend', `/api/chat/${targetChannelId}/?token=${token}`);
        const wsUrl = baseUrl.replace(/^http/, 'ws');

        wsLogger.info(`🔗 WebSocket URL: ${wsUrl}`);

        // Добавляем подробное логирование для отладки
        wsLogger.info(`Environment variables:`, {
          NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
          NEXT_PUBLIC_WS_HOST: process.env.NEXT_PUBLIC_WS_HOST,
          IS_DOCKER: process.env.IS_DOCKER,
          wsUrl,
          token: token ? "[HIDDEN]" : "null",
        });

        // Проверяем, что токен существует и имеет правильный формат
        if (!token || token.length < 10) {
          wsLogger.error(
            `Invalid token format: ${token ? token.substring(0, 5) + "..." : "null"}`,
          );
          toast({
            title: "Authentication Error",
            description:
              "Invalid authentication token. Please try logging in again.",
            variant: "destructive",
            duration: 5000,
          });

          if (onAuthError) {
            onAuthError();
          }

          return;
        }

        wsLogger.info(
          `Creating WebSocket connection to ${wsUrl} for channel ${targetChannelId}`,
        );

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        // Set up event handlers
        socket.onopen = () => {
          wsLogger.info(
            `WebSocket connection established for channel ${targetChannelId}`,
          );
          setIsConnected(true);
          setIsConnecting(false);

          // Clear connection attempt reference
          connectionAttemptRef.current = null;

          // Сбрасываем счетчики при успешном подключении
          tokenRefreshAttemptsRef.current = 0;
          reconnectAttempts.current = 0;
          reconnectDelay.current = 1000; // Сбрасываем задержку к начальному значению

          // Dispatch event for connection established
          window.dispatchEvent(
            new CustomEvent("websocket-connected", {
              detail: { channelId: targetChannelId },
            }),
          );
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            wsLogger.debug("WebSocket message received", { type: data.type });

            // Check for duplicate welcome messages
            if (data.type === "welcome") {
              const messageId = data.message_id || `welcome_${data.session_id}`;
              if (welcomeMessageReceivedRef.current.has(messageId)) {
                wsLogger.debug("Skipping duplicate welcome message", { messageId });
                return;
              }
              welcomeMessageReceivedRef.current.add(messageId);
            }

            // Фильтруем системные сообщения
            const messageContent = data.content || data.message || "";
            const isSystemMessage =
              data.type === "system_message" ||
              data.role === "system" ||
              data.user_name === "System" ||
              messageContent.includes("Connected to chat server") ||
              messageContent.includes("Connection established") ||
              messageContent.includes("User has joined") ||
              messageContent.includes("User has left") ||
              messageContent.includes("Connection closed") ||
              messageContent.includes("Обрабатываю ваш запрос");

            // Если это системное сообщение, пропускаем его
            if (isSystemMessage) {
              wsLogger.debug("Skipping system message", {
                message: messageContent,
              });

              // Если это response_end, все равно обрабатываем его
              if (data.type === "response_end") {
                setIsWaitingForResponse(false);
              }

              return;
            }

            // Add message to list
            setMessages((prev) => [...prev, data]);

            // If it's a response_end message, set isWaitingForResponse to false
            if (data.type === "response_end") {
              setIsWaitingForResponse(false);

              // Dispatch event for thinking state ended
              window.dispatchEvent(
                new CustomEvent("agent-thinking-ended", {
                  detail: { timestamp: new Date().toISOString() },
                }),
              );

              // Call onResponseEnd callback if provided
              if (onResponseEnd) {
                wsLogger.debug("Calling onResponseEnd callback");
                onResponseEnd();
              }
            }

            // Call onMessageReceived callback if provided
            if (onMessageReceived) {
              onMessageReceived(data);
            }

            // Dispatch event for new message
            window.dispatchEvent(
              new CustomEvent("new-message-received", {
                detail: { message: data, channelId: targetChannelId },
              }),
            );

            // Старое событие skeleton-interrupt отключено
            // Теперь скелетон скрывается по новой логике - когда последнее сообщение от assistant
            if (data.type === "response_end") {
              console.log(
                "[useChatWebSocket] Response end received - skeleton will be hidden by message logic",
              );
            }
          } catch (error) {
            wsLogger.error("Error parsing WebSocket message", {
              error,
              data: event.data,
            });
          }
        };

        socket.onclose = (event) => {
          console.log("[DEBUG] WebSocket connection closed:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          wsLogger.info(
            `WebSocket connection closed for channel ${targetChannelId}`,
            {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            },
          );

          setIsConnected(false);
          setIsConnecting(false);
          setIsWaitingForResponse(false);

          // Clear connection attempt reference on close
          connectionAttemptRef.current = null;

          // Don't try to reconnect if chat is hidden or explicitly disconnected
          if (!isChatVisible || isExplicitDisconnect.current) {
            wsLogger.info('Not reconnecting: chat is hidden or explicitly disconnected');
            return;
          }

          // Увеличиваем счетчик попыток переподключения
          reconnectAttempts.current += 1;
          
          // Увеличиваем задержку экспоненциально (1s -> 2s -> 4s)
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 5000);
          
          wsLogger.info(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}, delay: ${reconnectDelay.current}ms`);

          // Обрабатываем ошибки авторизации
          if (event.code === 1008 || event.code === 4001) {
            wsLogger.error(
              `WebSocket closed due to authentication error: code=${event.code}, reason=${event.reason}`,
            );

            // Пытаемся автоматически обновить токен с трехразовыми попытками
            (async () => {
              wsLogger.info(
                "Attempting to refresh token after authentication error",
              );

              // Показываем уведомление пользователю
              toast({
                title: "Authentication",
                description: "Refreshing authentication token...",
                duration: 5000,
              });

              // Принудительно обновляем токен (это запустит логику с трехразовыми попытками)
              const newToken = await getAccessToken(true);

              if (newToken) {
                wsLogger.info("Token refreshed successfully, reconnecting...");

                // Показываем уведомление об успешном обновлении токена
                toast({
                  title: "Authentication",
                  description: "Token refreshed successfully, reconnecting...",
                  duration: 3000,
                });

                // Если токен успешно обновлен, пытаемся переподключиться
                setTimeout(() => {
                  connect(targetChannelId);
                }, 1000);
              } else {
                // Если не удалось обновить токен после всех попыток, перенаправляем на страницу логина
                wsLogger.error(
                  "Failed to refresh token after all attempts, redirecting to login page",
                );
                redirectToLogin("Authentication failed after multiple attempts. Please login again.");
              }
            })();
            return; // Важно: выходим из функции, чтобы не обрабатывать это как обычное закрытие
          }

          // Dispatch event for connection closed
          window.dispatchEvent(
            new CustomEvent("websocket-disconnected", {
              detail: {
                channelId: targetChannelId,
                code: event.code,
                reason: event.reason,
              },
            }),
          );
        };

        socket.onerror = (error) => {
          console.log("[DEBUG] WebSocket error:", error);
          wsLogger.error(`WebSocket error for channel ${targetChannelId}`, {
            error,
          });
          setIsConnecting(false);

          // Clear connection attempt reference on error
          connectionAttemptRef.current = null;

          // Добавляем более подробное логирование
          console.log("[DEBUG] WebSocket URL:", wsUrl);
          console.log("[DEBUG] WebSocket readyState:", socket.readyState);

          // При ошибке соединения пытаемся принудительно обновить токены
          if (tokenRefreshAttemptsRef.current < MAX_TOKEN_REFRESH_ATTEMPTS) {
            tokenRefreshAttemptsRef.current += 1;

            // Показываем уведомление о попытке обновления токенов
            toast({
              title: "Connection Error",
              description: `Refreshing authentication tokens... (${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`,
              variant: "destructive",
              duration: 3000,
            });

            (async () => {
              console.log(
                `[DEBUG] Attempting FORCED token refresh after WebSocket error (attempt ${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`,
              );
              wsLogger.info(`Attempting FORCED token refresh after WebSocket error (attempt ${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`);

              // Принудительно обновляем токен (не просто проверяем)
              const newToken = await getAccessToken(true); // true = принудительное обновление

              if (newToken) {
                console.log(
                  "[DEBUG] Token forcefully refreshed successfully, reconnecting...",
                );
                wsLogger.info("Token forcefully refreshed successfully, reconnecting...");

                toast({
                  title: "Authentication Updated",
                  description: "Tokens refreshed successfully, reconnecting...",
                  duration: 2000,
                });

                // Если токен успешно обновлен, пытаемся переподключиться
                setTimeout(() => {
                  connect(targetChannelId);
                }, 1500);
              } else {
                // Если не удалось получить валидный токен
                wsLogger.error(
                  "Failed to forcefully refresh token after WebSocket error",
                );

                // Если достигли максимума попыток, перенаправляем на логин
                if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
                  redirectToLogin("Authentication failed after multiple token refresh attempts");
                } else {
                  // Еще одна попытка через больший интервал
                  setTimeout(() => {
                    connect(targetChannelId);
                  }, 3000);
                }
              }
            })();
          } else {
            // Достигли максимума попыток reset токена - редирект на логин
            wsLogger.warn(`Maximum token refresh attempts (${MAX_TOKEN_REFRESH_ATTEMPTS}) reached, redirecting to login`);

            toast({
              title: "Authentication Failed",
              description: "Unable to establish secure connection. Redirecting to login...",
              variant: "destructive",
              duration: 5000,
            });

            setTimeout(() => {
              redirectToLogin("Connection failed after multiple attempts. Please log in again.");
            }, 2000);
          }
        };
      } catch (error) {
        wsLogger.error("Error connecting to WebSocket", { error });
        setIsConnecting(false);

        toast({
          title: "Connection Error",
          description: "Failed to connect to chat server. Please try again.",
          variant: "destructive",
          duration: 5000,
        });

        if (
          error instanceof Error &&
          error.message &&
          error.message.includes("Authentication") &&
          onAuthError
        ) {
          onAuthError();
        }
      }
    },
    [
      isConnecting,
      channelId,
      onAuthError,
      onMessageReceived,
      toast,
      getAccessToken,
      redirectToLogin,
      isChatVisible,
    ],
  );

  // Function to disconnect from WebSocket
  const disconnect = useCallback((explicit = true) => {
    isExplicitDisconnect.current = explicit;
    if (socketRef.current) {
      wsLogger.info(`Disconnecting from WebSocket${explicit ? ' (explicit)' : ''}...`);
      socketRef.current.close(1000, explicit ? 'User disconnected' : 'Reconnecting...');
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      setIsWaitingForResponse(false);
      
      // Reset reconnect attempts on explicit disconnect
      if (explicit) {
        reconnectAttempts.current = 0;
      }
    }
  }, []);

  // Function to send a message
  const sendMessage = useCallback(
    async (message: string) => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        wsLogger.error("Cannot send message: WebSocket not connected");
        throw new Error("WebSocket not connected");
      }

      try {
        // Set waiting for response flag immediately when user sends a message
        // This will trigger the thinking skeleton to appear
        setIsWaitingForResponse(true);

        // Dispatch event for thinking state started
        window.dispatchEvent(
          new CustomEvent("agent-thinking-started", {
            detail: { timestamp: new Date().toISOString() },
          }),
        );

        // Get location if available
        let locationData = null;
        try {
          // Получаем данные о местоположении
          locationData = await getLocation();
          wsLogger.info("Location data retrieved", { locationData });
        } catch (error) {
          wsLogger.warn("Failed to get location, using default values", {
            error,
          });

          // Используем значения по умолчанию
          const locale = navigator.language || "en-US";
          const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          locationData = {
            city: "Запорожье",
            region: "Запорожская область",
            country: "Украина",
            timezone,
            locale,
          };
        }

        // Create message object with proper structure
        const messageObj = {
          message,
          type: "chat",  // Consumer expects "chat" type
          timestamp: new Date().toISOString(),
          role: "user",
          location: locationData,
        };

        // Send message
        wsLogger.info("Sending message to WebSocket", { messageObj });

        // Добавляем проверку состояния сокета перед отправкой
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(messageObj));
          console.log("[DEBUG] Message sent successfully");
        } else {
          console.log(
            "[DEBUG] Socket not open, current state:",
            socketRef.current.readyState,
          );
          wsLogger.error("WebSocket not in OPEN state", {
            readyState: socketRef.current.readyState,
          });

          // Пытаемся переподключиться
          await connect(channelId);

          // Пробуем отправить сообщение снова после переподключения
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(JSON.stringify(messageObj));
            console.log("[DEBUG] Message sent after reconnection");
          } else {
            throw new Error("Failed to reconnect WebSocket");
          }
        }
      } catch (error) {
        console.log("[DEBUG] Error sending message:", error);
        wsLogger.error("Error sending message to WebSocket", {
          error,
          message,
        });
        setIsWaitingForResponse(false);

        // Показываем уведомление об ошибке
        toast({
          title: "Connection Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
          duration: 5000,
        });

        throw error;
      }
    },
    [getLocation, connect, channelId, toast],
  );

  // Function to send chat history
  const sendChatHistory = useCallback(
    async (
      history: WebSocketMessage[],
      options: SendChatHistoryOptions = {},
    ) => {
      // Добавляем параметр sendGreeting в опции, если он не указан
      options.sendGreeting = options.sendGreeting ?? false; // По умолчанию не отправляем приветственное сообщение
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        wsLogger.error("Cannot send chat history: WebSocket not connected");
        throw new Error("WebSocket not connected");
      }

      try {
        // Get location data for the history object
        let locationData = null;
        try {
          // Получаем данные о местоположении
          locationData = await getLocation();
          wsLogger.info("Location data retrieved for history", {
            locationData,
          });
        } catch (error) {
          wsLogger.warn(
            "Failed to get location for history, using default values",
            { error },
          );

          // Используем значения по умолчанию
          const locale = navigator.language || "en-US";
          const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          locationData = {
            city: "Запорожье",
            region: "Запорожская область",
            country: "Украина",
            timezone,
            locale,
          };
        }

        // Create history object with location data
        const historyObj = {
          history,
          location: locationData,
          ...options,
        };

        // Send history
        wsLogger.info("Sending chat history to WebSocket", {
          historyLength: history.length,
          options,
          location: locationData,
        });

        // Добавляем проверку состояния сокета перед отправкой
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(historyObj));
          console.log("[DEBUG] Chat history sent successfully");
        } else {
          console.log(
            "[DEBUG] Socket not open for history, current state:",
            socketRef.current.readyState,
          );
          wsLogger.error("WebSocket not in OPEN state for history", {
            readyState: socketRef.current.readyState,
          });

          // Пытаемся переподключиться
          await connect(options.chunk_id || channelId);

          // Пробуем отправить историю снова после переподключения
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(JSON.stringify(historyObj));
            console.log("[DEBUG] Chat history sent after reconnection");
          } else {
            throw new Error("Failed to reconnect WebSocket for history");
          }
        }

        // Dispatch event for history sent
        window.dispatchEvent(
          new CustomEvent("history-sent", {
            detail: { count: history.length, options },
          }),
        );
      } catch (error) {
        wsLogger.error("Error sending chat history to WebSocket", { error });

        // Показываем уведомление об ошибке
        toast({
          title: "Connection Error",
          description: "Failed to load chat history. Please try again.",
          variant: "destructive",
          duration: 5000,
        });

        throw error;
      }
    },
    [getLocation, connect, channelId, toast],
  );

  // Function to cancel current task
  const cancelCurrentTask = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      wsLogger.warn("Cannot cancel task: WebSocket not connected");
      return;
    }

    try {
      // Get location data for the cancel request
      let locationData = null;
      try {
        // Получаем данные о местоположении
        locationData = await getLocation();
      } catch (error) {
        wsLogger.warn(
          "Failed to get location for cancel request, using default values",
          { error },
        );

        // Используем значения по умолчанию
        const locale = navigator.language || "en-US";
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

        locationData = {
          city: "Запорожье",
          region: "Запорожская область",
          country: "Украина",
          timezone,
          locale,
        };
      }

      // Create cancel message with proper structure
      const cancelMessage = {
        type: "message",
        request_type: "cancel",
        timestamp: new Date().toISOString(),
        message: "cancel",
        cancel: true,
        location: locationData,
      };

      // Send cancel message
      wsLogger.info("Sending cancel request to WebSocket");
      socketRef.current.send(JSON.stringify(cancelMessage));
      setIsWaitingForResponse(false);

      // Dispatch event for thinking state ended due to cancellation
      window.dispatchEvent(
        new CustomEvent("agent-thinking-ended", {
          detail: { timestamp: new Date().toISOString(), cancelled: true },
        }),
      );
    } catch (error) {
      wsLogger.error("Error sending cancel request to WebSocket", { error });
    }
  }, [getLocation]);

  // Handle visibility change and cleanup
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      console.log(`[WebSocket] Visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (!isVisible) {
        // Chat is being hidden, close the connection
        isExplicitDisconnect.current = true;
        if (socketRef.current) {
          wsLogger.info('Chat hidden, closing WebSocket connection');
          socketRef.current.close(1000, 'Chat window closed');
          socketRef.current = null;
          setIsConnected(false);
          setIsConnecting(false);
        }
      } else {
        // Chat is visible again, reset the flag
        isExplicitDisconnect.current = false;
      }
      setIsChatVisible(isVisible);
    };

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Clean up on unmount
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (socketRef.current) {
        wsLogger.info("Cleaning up WebSocket connection");
        isExplicitDisconnect.current = true;
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, []);

  // Function to send files
  const sendFiles = useCallback(
    async (files: File[], message: string = "") => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        wsLogger.error("Cannot send files: WebSocket not connected");
        throw new Error("WebSocket not connected");
      }

      try {
        // Set waiting for response flag
        setIsWaitingForResponse(true);

        // Dispatch event for thinking state started
        window.dispatchEvent(
          new CustomEvent("agent-thinking-started", {
            detail: { timestamp: new Date().toISOString() },
          }),
        );

        // Get location if available
        let locationData = null;
        try {
          // Получаем данные о местоположении
          locationData = await getLocation();
          wsLogger.info("Location data retrieved for file upload", {
            locationData,
          });
        } catch (error) {
          wsLogger.warn(
            "Failed to get location for file upload, using default values",
            { error },
          );

          // Используем значения по умолчанию
          const locale = navigator.language || "en-US";
          const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          locationData = {
            city: "Запорожье",
            region: "Запорожская область",
            country: "Украина",
            timezone,
            locale,
          };
        }

        // Convert files to base64
        const filesData = await Promise.all(
          files.map(async (file) => {
            try {
              const base64 = await fileToBase64(file);
              return {
                name: file.name,
                type: file.type,
                size: file.size,
                content: base64,
              };
            } catch (error) {
              wsLogger.error(
                `Error converting file ${file.name} to base64:`,
                error,
              );
              throw new Error(
                `Error processing file ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            }
          }),
        );

        // Create message object
        const messageObj = {
          type: "file_message",
          message,
          files: filesData,
          role: "user",
          user_name: "User",
          location: locationData,
          timestamp: new Date().toISOString(),
        };

        // Send message
        wsLogger.info("Sending files to WebSocket", {
          fileCount: files.length,
          messageLength: message.length,
        });

        // Check socket state before sending
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(messageObj));
          wsLogger.info("Files sent successfully");
        } else {
          wsLogger.error("WebSocket not in OPEN state", {
            readyState: socketRef.current.readyState,
          });

          // Try to reconnect
          await connect(channelId);

          // Try to send files again after reconnection
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(JSON.stringify(messageObj));
            wsLogger.info("Files sent after reconnection");
          } else {
            throw new Error("Failed to reconnect WebSocket");
          }
        }
      } catch (error) {
        wsLogger.error("Error sending files to WebSocket", { error });
        setIsWaitingForResponse(false);

        // Dispatch event for thinking state ended due to error
        window.dispatchEvent(
          new CustomEvent("agent-thinking-ended", {
            detail: { timestamp: new Date().toISOString(), error: true },
          }),
        );

        throw error;
      }
    },
    [getLocation, connect, channelId],
  );

  return {
    isConnected,
    isConnecting,
    isWaitingForResponse,
    connect,
    disconnect,
    sendMessage,
    sendFiles,
    sendChatHistory,
    cancelCurrentTask,
    messages,
  };
};
