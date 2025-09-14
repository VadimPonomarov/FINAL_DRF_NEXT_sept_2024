/**
 * Enhanced WebSocket hook with proper typing and error handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  IncomingWebSocketMessage, 
  OutgoingWebSocketMessage,
  WebSocketError,
  AuthenticationError 
} from '@/types/enhanced-chat';

interface UseEnhancedWebSocketOptions {
  url: string;
  protocols?: string[];
  onMessage?: (message: IncomingWebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: WebSocketError) => void;
  onAuthError?: () => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

interface UseEnhancedWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: WebSocketError | null;
  connectionAttempts: number;
  lastActivity: Date | null;
  
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: OutgoingWebSocketMessage) => boolean;
  sendRaw: (data: string) => boolean;
}

export const useEnhancedWebSocket = (
  options: UseEnhancedWebSocketOptions
): UseEnhancedWebSocketReturn => {
  const {
    url,
    protocols,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    onAuthError,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);

  // Clear timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          startHeartbeat(); // Schedule next heartbeat
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  // Handle WebSocket message
  const handleMessage = useCallback((event: MessageEvent) => {
    setLastActivity(new Date());
    
    try {
      const data = JSON.parse(event.data) as IncomingWebSocketMessage;
      
      // Handle pong messages internally
      if (data.type === 'pong') {
        console.log('[WebSocket] Received pong');
        return;
      }
      
      onMessage?.(data);
    } catch (err) {
      const error = new WebSocketError('Failed to parse WebSocket message', event);
      setError(error);
      onError?.(error);
    }
  }, [onMessage, onError]);

  // Handle WebSocket open
  const handleOpen = useCallback(() => {
    console.log('[WebSocket] Connected');
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    setConnectionAttempts(0);
    setLastActivity(new Date());
    
    startHeartbeat();
    onConnect?.();
  }, [onConnect, startHeartbeat]);

  // Handle WebSocket close
  const handleClose = useCallback((event: CloseEvent) => {
    console.log(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`);
    
    setIsConnected(false);
    setIsConnecting(false);
    clearTimeouts();
    
    // Handle authentication errors
    if (event.code === 4001) {
      const authError = new AuthenticationError('Authentication required');
      setError(authError);
      onAuthError?.();
      return;
    }
    
    onDisconnect?.(event.code, event.reason);
    
    // Auto-reconnect if not manually disconnected
    if (!isManualDisconnect.current && autoReconnect && connectionAttempts < maxReconnectAttempts) {
      const delay = reconnectDelay * Math.pow(2, connectionAttempts); // Exponential backoff
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${connectionAttempts + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionAttempts(prev => prev + 1);
        connect();
      }, delay);
    }
  }, [onDisconnect, onAuthError, autoReconnect, connectionAttempts, maxReconnectAttempts, reconnectDelay, clearTimeouts]);

  // Handle WebSocket error
  const handleError = useCallback((event: Event) => {
    console.error('[WebSocket] Error:', event);
    
    const error = new WebSocketError('WebSocket connection error', event);
    setError(error);
    setIsConnecting(false);
    onError?.(error);
  }, [onError]);

  // Connect function
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    if (isConnecting) {
      console.log('[WebSocket] Connection already in progress');
      return;
    }

    console.log('[WebSocket] Connecting to:', url);
    setIsConnecting(true);
    setError(null);
    isManualDisconnect.current = false;

    try {
      const ws = new WebSocket(url, protocols);
      
      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
      wsRef.current = ws;
    } catch (err) {
      const error = new WebSocketError(`Failed to create WebSocket connection: ${err}`);
      setError(error);
      setIsConnecting(false);
      onError?.(error);
    }
  }, [url, protocols, isConnecting, handleOpen, handleMessage, handleClose, handleError, onError]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('[WebSocket] Manually disconnecting');
    isManualDisconnect.current = true;
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionAttempts(0);
  }, [clearTimeouts]);

  // Send message function
  const sendMessage = useCallback((message: OutgoingWebSocketMessage): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    try {
      const data = JSON.stringify(message);
      wsRef.current.send(data);
      setLastActivity(new Date());
      return true;
    } catch (err) {
      const error = new WebSocketError(`Failed to send message: ${err}`);
      setError(error);
      onError?.(error);
      return false;
    }
  }, [onError]);

  // Send raw data function
  const sendRaw = useCallback((data: string): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send raw data: not connected');
      return false;
    }

    try {
      wsRef.current.send(data);
      setLastActivity(new Date());
      return true;
    } catch (err) {
      const error = new WebSocketError(`Failed to send raw data: ${err}`);
      setError(error);
      onError?.(error);
      return false;
    }
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearTimeouts]);

  return {
    isConnected,
    isConnecting,
    error,
    connectionAttempts,
    lastActivity,
    connect,
    disconnect,
    sendMessage,
    sendRaw
  };
};
