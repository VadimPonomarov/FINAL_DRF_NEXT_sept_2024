"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { wsLogger } from "@/utils/chat/logger";
import { WebSocketMessage } from "@/utils/chat/chatTypes";
import { useToast } from "@/hooks/use-toast";

interface UseChatWebSocketProps {
  channelId: string;
  onAuthError?: () => void;
  onMessageReceived?: (message: any) => void;
  onResponseEnd?: () => void;
}

interface UseChatWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isWaitingForResponse: boolean;
  messages: any[];
  connect: (channelId?: string, isNewChat?: boolean) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: string) => Promise<void>;
  sendFiles: (files: File[], message?: string) => Promise<void>;
  sendChatHistory: (messages: WebSocketMessage[], metadata?: any) => Promise<void>;
  cancelCurrentTask: () => void;
}

const MAX_TOKEN_REFRESH_ATTEMPTS = 3;
const MIN_REFRESH_DELAY = 2000;
const MIN_CONNECTION_DELAY = 1000;

export const useChatWebSocket = ({
  channelId,
  onAuthError,
  onMessageReceived,
  onResponseEnd,
}: UseChatWebSocketProps): UseChatWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const lastRefreshAttemptRef = useRef<number>(0);
  const lastConnectionAttemptRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const tokenRefreshAttemptsRef = useRef<number>(0);
  
  const { toast } = useToast();

  const getWebSocketUrl = useCallback(async (customChannelId?: string) => {
    try {
      // Получаем токен из Redis
      const { getRedisData } = await import('@/app/api/redis');
      const tokenData = await getRedisData('backend_auth');
      
      let token = '';
      if (tokenData) {
        try {
          const parsed = typeof tokenData === 'string' ? JSON.parse(tokenData) : tokenData;
          token = parsed.access || '';
        } catch (e) {
          console.warn('Failed to parse token data:', e);
        }
      }

      // Используем Service Registry для определения WebSocket URL
      const { resolveServiceUrl } = await import('@/utils/api/serviceUrlResolver');

      // Получаем URL бэкенда через Service Registry
      const backendUrl = await resolveServiceUrl('backend', '', async (key: string) => {
        return await getRedisData(key.replace('service_registry:', ''));
      });

      const targetChannelId = customChannelId || channelId;
      
      // Преобразуем HTTP URL в WebSocket URL и добавляем токен
      let wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/api/chat/${targetChannelId}/`;
      
      if (token) {
        wsUrl += `?token=${encodeURIComponent(token)}`;
      }

      wsLogger.info(`🔗 WebSocket URL: ${wsUrl}`);
      return wsUrl;
    } catch (error) {
      // Fallback к старой логике
      wsLogger.warn(`⚠️ Service Registry unavailable, using fallback: ${error}`);
      const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
      const host = isDocker ? 'app' : 'localhost';
      const port = '8000';
      const targetChannelId = customChannelId || channelId;
      
      // Получаем токен для fallback
      try {
        const response = await fetch('/api/redis?key=backend_auth');
        const tokenData = await response.json();
        let token = '';
        if (tokenData && tokenData.value) {
          const parsed = typeof tokenData.value === 'string' ? JSON.parse(tokenData.value) : tokenData.value;
          token = parsed.access || '';
        }
        
        let fallbackUrl = `ws://${host}:${port}/api/chat/${targetChannelId}/`;
        if (token) {
          fallbackUrl += `?token=${encodeURIComponent(token)}`;
        }
        wsLogger.info(`🔗 WebSocket URL from fallback: ${fallbackUrl}`);
        return fallbackUrl;
      } catch (tokenError) {
        wsLogger.warn('Failed to get token for fallback:', tokenError);
        const fallbackUrl = `ws://${host}:${port}/api/chat/${targetChannelId}/`;
        wsLogger.info(`🔗 WebSocket URL from fallback without token: ${fallbackUrl}`);
        return fallbackUrl;
      }
    }
  }, [channelId]);

  const handleTokenRefresh = useCallback(async () => {
    const now = Date.now();
    
    // Check if enough time has passed since last refresh attempt
    if (now - lastRefreshAttemptRef.current < MIN_REFRESH_DELAY) {
      wsLogger.warn('Skipping token refresh - too soon since last attempt');
      return false;
    }
    
    // Check if already refreshing
    if (isRefreshingRef.current) {
      wsLogger.warn('Token refresh already in progress');
      return false;
    }
    
    // Check max attempts
    if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
      wsLogger.error('Max token refresh attempts reached');
      return false;
    }
    
    try {
      isRefreshingRef.current = true;
      lastRefreshAttemptRef.current = now;
      tokenRefreshAttemptsRef.current++;
      
      wsLogger.info(`Attempting token refresh (attempt ${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`);
      
      // Wait before attempting refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { tokenRefreshManager } = await import('@/utils/auth/tokenRefreshManager');
      const refreshResult = await tokenRefreshManager.refreshToken();
      
      if (refreshResult.success) {
        wsLogger.info('Token refresh successful');
        tokenRefreshAttemptsRef.current = 0; // Reset attempts on success
        
        // Wait after successful refresh
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return true;
      } else {
        wsLogger.error('Token refresh failed:', refreshResult.error);
        return false;
      }
    } catch (error) {
      wsLogger.error('Token refresh error:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const connect = useCallback(async (customChannelId?: string, isNewChat: boolean = false) => {
    const now = Date.now();
    
    // Check connection delay
    if (now - lastConnectionAttemptRef.current < MIN_CONNECTION_DELAY) {
      wsLogger.warn('Skipping connection - too soon since last attempt');
      return;
    }
    
    if (isConnecting || isConnected) {
      wsLogger.info('Already connecting or connected');
      return;
    }

    setIsConnecting(true);
    lastConnectionAttemptRef.current = now;
    
    const targetChannelId = customChannelId || channelId;
    wsLogger.info(`Attempting to connect to channel ${targetChannelId}`);

    try {
      const wsUrl = await getWebSocketUrl(targetChannelId);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = (event) => {
        wsLogger.info('WebSocket OPEN', { 
          event, 
          url: wsUrl,
          readyState: socket.readyState 
        });
        
        setIsConnected(true);
        setIsConnecting(false);
        tokenRefreshAttemptsRef.current = 0; // Reset on successful connection
        
        toast({
          title: "Подключено",
          description: "WebSocket соединение установлено",
          duration: 2000
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          wsLogger.debug("WebSocket message received", { type: data.type });

          if (onMessageReceived) {
            onMessageReceived(data);
          }

          if (data.type === "response_end") {
            setIsWaitingForResponse(false);
            onResponseEnd?.();
          }

          setMessages((prev) => [...prev, data]);
        } catch (error) {
          wsLogger.error("Error processing WebSocket message", { error });
        }
      };

      socket.onclose = async (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        wsLogger.info("WebSocket connection closed", { 
          code: event.code, 
          reason: event.reason 
        });
        
        // Handle authentication errors (codes 1008 and 4001)
        if (event.code === 1008 || event.code === 4001) {
          wsLogger.warn(`WebSocket authentication error (code ${event.code}), attempting token refresh...`);
          
          const refreshSuccess = await handleTokenRefresh();
          
          if (refreshSuccess) {
            wsLogger.info('Token refreshed successfully, attempting reconnection...');
            toast({
              title: "Переподключение",
              description: "Токен обновлен, переподключаемся...",
              duration: 2000
            });
            
            // Retry connection with new token
            setTimeout(() => {
              if (isMountedRef.current) {
                connect(targetChannelId, isNewChat);
              }
            }, 1000);
          } else {
            wsLogger.error('Token refresh failed, calling onAuthError');
            onAuthError?.();
          }
        }
      };

      socket.onerror = (error) => {
        wsLogger.error("WebSocket error", { error });
        setIsConnecting(false);
      };

    } catch (error) {
      wsLogger.error("WebSocket connection error", { error });
      setIsConnecting(false);
      onAuthError?.();
    }
  }, [isConnecting, isConnected, channelId, getWebSocketUrl, onMessageReceived, onResponseEnd, onAuthError, handleTokenRefresh, toast]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      wsLogger.info('Disconnecting WebSocket');
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      wsLogger.error('Cannot send message - WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    try {
      const payload = {
        type: 'chat',
        message: message,
      };
      
      socketRef.current.send(JSON.stringify(payload));
      setIsWaitingForResponse(true);
      wsLogger.info('Message sent', { message });
    } catch (error) {
      wsLogger.error('Error sending message', { error });
      throw error;
    }
  }, []);

  const sendFiles = useCallback(async (files: File[], message: string = '') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      wsLogger.error('Cannot send files - WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    try {
      // Convert files to base64
      const filePromises = Array.from(files).map(file => {
        return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              name: file.name,
              type: file.type,
              data: base64
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const fileData = await Promise.all(filePromises);

      const payload = {
        type: 'file_message',
        files: fileData,
        message: message
      };

      socketRef.current.send(JSON.stringify(payload));
      setIsWaitingForResponse(true);
      wsLogger.info('Files sent', { count: files.length });
    } catch (error) {
      wsLogger.error('Error sending files', { error });
      throw error;
    }
  }, []);

  const sendChatHistory = useCallback(async (historyMessages: WebSocketMessage[], metadata?: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      wsLogger.error('Cannot send chat history - WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    try {
      const payload = {
        type: 'chat_history',
        messages: historyMessages,
        metadata: metadata || {}
      };

      socketRef.current.send(JSON.stringify(payload));
      wsLogger.info('Chat history sent', { count: historyMessages.length, metadata });
    } catch (error) {
      wsLogger.error('Error sending chat history', { error });
      throw error;
    }
  }, []);

  const cancelCurrentTask = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          type: 'cancel'
        };
        socketRef.current.send(JSON.stringify(payload));
        setIsWaitingForResponse(false);
        wsLogger.info('Task cancellation requested');
      } catch (error) {
        wsLogger.error('Error cancelling task', { error });
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isWaitingForResponse,
    messages,
    connect,
    disconnect,
    sendMessage,
    sendFiles,
    sendChatHistory,
    cancelCurrentTask,
  };
};
