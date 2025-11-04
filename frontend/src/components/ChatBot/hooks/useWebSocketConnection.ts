import { useCallback, useRef, useState, useEffect } from "react";
import { wsLogger } from "@/modules/chatbot/chat/logger";

interface UseWebSocketConnectionProps {
  channelId: string;
  onAuthError?: () => void;
  onMessageReceived?: (message: any) => void;
  onResponseEnd?: () => void;
}

export const useWebSocketConnection = ({
  channelId,
  onAuthError,
  onMessageReceived,
  onResponseEnd,
}: UseWebSocketConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const visibilityChangeTimeoutRef = useRef<NodeJS.Timeout>(null);
  const isMountedRef = useRef(true);

  const getWebSocketUrl = useCallback(async () => {
    try {
      // Используем Service Registry для определения WebSocket URL
      const { resolveServiceUrl } = await import('@/shared/utils/api/serviceUrlResolver');
      const { getRedisData } = await import('@/app/api/redis');

      // Получаем URL бэкенда через Service Registry
      const backendUrl = await resolveServiceUrl('backend', '', async (key: string) => {
        return await getRedisData(key.replace('service_registry:', ''));
      });

      // Преобразуем HTTP URL в WebSocket URL
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/api/chat/${channelId}/`;

      console.log(`🔗 WebSocket URL from Service Registry: ${wsUrl}`);
      return wsUrl;
    } catch (error) {
      // Fallback к старой логике
      console.warn(`⚠️ Service Registry unavailable, using fallback: ${error}`);
      const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
      const host = isDocker ? 'app' : 'localhost';
      const port = '8000';
      const fallbackUrl = `ws://${host}:${port}/api/chat/${channelId}/`;
      console.log(`🔗 WebSocket URL from fallback: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }, [channelId]);

  const connect = useCallback(async (customChannelId?: string) => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    wsLogger.info(`Attempting to connect to channel ${customChannelId || channelId}`);

    try {
      const wsUrl = await getWebSocketUrl();
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

      socket.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsLogger.info("WebSocket connection closed");
      };

      socket.onerror = (error) => {
        wsLogger.error("WebSocket error", { error });
      };

    } catch (error) {
      wsLogger.error("WebSocket connection error", { error });
      onAuthError?.();
    }
  }, [isConnecting, isConnected, getWebSocketUrl, onMessageReceived, onResponseEnd]);

  useEffect(() => {
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
    socketRef,
  };
};
