import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { wsLogger } from '@/utils/chat/logger';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from './useGeolocation';

// Types
interface WebSocketOptions {
  url: string;
  onAuthError?: () => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp: string;
  role?: 'user' | 'assistant' | 'system';
  image_url?: string;
  id?: string;
  content?: string;
  user_name?: string;
  chunk_id?: string;
  channel_id?: string;
  [key: string]: any;
}

interface WebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (message: string) => Promise<boolean>;
  sendChatHistory: (
    history: WebSocketMessage[], 
    options?: { 
      is_new_chat?: boolean; 
      chunk_id?: string; 
      is_existing_chat?: boolean; 
    }
  ) => Promise<boolean>;
  messages: WebSocketMessage[];
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  readyState: number;
}

// Constants
const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket ready state constants
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

export const useWebSocket = ({
  url,
  onAuthError,
  autoConnect = true,
  reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
  maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
}: WebSocketOptions): WebSocketReturn => {
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const connectionAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueue = useRef<Array<string | ArrayBuffer | ArrayBufferView | Blob>>([]);
  const isMounted = useRef(true);
  const lastMessageRef = useRef<WebSocketMessage | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectAttempt = useRef<number>(0);
  const connectDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isExplicitDisconnect = useRef(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);
  const MAX_CONNECTION_ATTEMPTS = 5;
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [readyState, setReadyState] = useState<number>(CLOSED);
  const [isChatVisible, setIsChatVisible] = useState(true);
  
  // Hooks
  const { setMessage } = useNotification();
  const { toast } = useToast();
  const geolocation = useGeolocation();

  // Memoized URL to prevent unnecessary re-renders
  const wsUrl = useMemo(() => {
    try {
      return new URL(url, window.location.origin).toString();
    } catch (e) {
      console.error('Invalid WebSocket URL:', url);
      return '';
    }
  }, [url]);

  // Disconnect from WebSocket
  const disconnect = useCallback((explicitDisconnect = true) => {
    // Set explicit disconnect flag
    isExplicitDisconnect.current = explicitDisconnect;
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Close WebSocket connection if it exists
    if (wsRef.current) {
      try {
        // Only log if chat is visible or it's an explicit disconnect
        if (isChatVisible || explicitDisconnect) {
          wsLogger.info('Disconnecting WebSocket...');
        }
        
        // Close with appropriate code and reason
        wsRef.current.close(
          explicitDisconnect ? 1000 : 1001, // 1000 = normal closure, 1001 = going away
          explicitDisconnect ? 'User disconnected' : 'Reconnecting...'
        );
      } catch (err) {
        wsLogger.error('Error during WebSocket close:', err);
      } finally {
        wsRef.current = null;
      }
    }
    
    // Update state
    setIsConnected(false);
    setIsConnecting(false);
    setReadyState(CLOSED);
    
    // Reset reconnection attempts if this was an explicit disconnect
    if (explicitDisconnect) {
      reconnectAttempts.current = 0;
    }
  }, [isChatVisible]);

  // Connect to WebSocket
  const connect = useCallback(async (isReconnect = false): Promise<boolean> => {
    // Don't attempt to connect if chat is not visible
    if (!isChatVisible) {
      console.log('[WebSocket] Connection attempt blocked: chat window is closed');
      return false;
    }
    
    // Don't attempt to connect if this was an explicit disconnect
    if (isExplicitDisconnect.current) {
      console.log('[WebSocket] Connection attempt blocked: explicit disconnect');
      return false;
    }
    
    // Double-check isMounted to prevent race conditions
    if (!isMounted.current) {
      console.log('[WebSocket] Connection attempt blocked: component unmounted');
      return false;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectAttempt.current;
    
    // Prevent rapid reconnection attempts
    if (timeSinceLastAttempt < 2000) { // 2 second cooldown
      console.log('[WebSocket] Connection attempt too soon, skipping...');
      return false;
    }
    
    // If we've exceeded max connection attempts, don't try to reconnect
    if (isReconnect && reconnectAttempts.current >= maxReconnectAttempts) {
      console.log(`[WebSocket] Max reconnection attempts (${maxReconnectAttempts}) reached`);
      return false;
    }
    
    lastConnectAttempt.current = now;
    
    if (isConnecting) {
      console.log('[WebSocket] Already connecting, skipping...');
      return false;
    }
    
    if (isConnected) {
      console.log('[WebSocket] Already connected');
      return true;
    }
    
    // Reset explicit disconnect flag when attempting to connect
    isExplicitDisconnect.current = false;

    if (!wsUrl) {
      const err = new Error('Invalid WebSocket URL');
      console.error('[WebSocket] Invalid WebSocket URL:', url);
      setError(err);
      wsLogger.error('Invalid WebSocket URL');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log(`[WebSocket] Creating new WebSocket connection to: ${wsUrl}`);
      wsRef.current = new WebSocket(wsUrl);
      setReadyState(wsRef.current.readyState);
      console.log(`[WebSocket] Initial readyState: ${wsRef.current.readyState}`);

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connection opened');
        if (!isMounted.current) {
          console.log('[WebSocket] Component unmounted, skipping...');
          return;
        }
        
        setIsConnected(true);
        setIsConnecting(false);
        setReadyState(OPEN);
        reconnectAttempts.current = 0;
        wsLogger.info('WebSocket connected');
        console.log('[WebSocket] Connection state updated: connected');
        
        // Process any queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          if (message && wsRef.current?.readyState === OPEN) {
            wsRef.current.send(message);
          }
        }

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        if (!isMounted.current) return;

        try {
          const data = JSON.parse(event.data);
          
          // Update last message
          lastMessageRef.current = data;
          setLastMessage(data);
          
          // Add to messages if it's a chat message
          if (data.type === 'chat' || data.message) {
            setMessages(prev => [...prev, data]);
          }
          
          // Handle specific message types
          if (data.type === 'error') {
            wsLogger.error('WebSocket error:', data.message);
            setError(new Error(data.message));
          }
          
        } catch (err) {
          wsLogger.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        if (!isMounted.current) return;
        
        clearInterval(pingIntervalRef.current);
        setIsConnected(false);
        setReadyState(CLOSED);
        
        // Clear any pending reconnection attempts if chat is hidden
        if (!isChatVisible) {
          console.log('[WebSocket] Connection closed while chat is hidden - clearing reconnection attempts');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          reconnectAttempts.current = 0;
          return;
        }
        
        // Handle authentication errors (4000-4999 are custom error codes)
        if (event.code >= 4000 && event.code < 5000) {
          const errorMessage = `Authentication error (${event.code}): ${event.reason || 'Please log in again'}`;
          console.error('[WebSocket]', errorMessage);
          
          // Only show error if chat is visible and this wasn't an explicit disconnect
          if (isChatVisible && !isExplicitDisconnect.current) {
            // Don't call setError or onAuthError to prevent notifications
            // Just log to console
            console.log('[WebSocket] Not showing auth error notification - chat hidden or explicit disconnect');
          }
          
          // Don't try to reconnect on auth errors
          return;
        }
        
        // Handle normal closure
        if (event.code === 1000) {
          console.log('[WebSocket] Connection closed normally');
          return;
        }
        
        // If this was an explicit disconnect, don't try to reconnect
        if (isExplicitDisconnect.current) {
          console.log('[WebSocket] Not reconnecting: explicit disconnect');
          return;
        }
        
        // Only log the closure if chat is visible
        if (isChatVisible) {
          console.warn(`[WebSocket] Connection closed with code ${event.code}: ${event.reason || 'No reason provided'}`);
        }
        
        // Don't attempt to reconnect if chat is hidden or we've exceeded max attempts
        if (!isChatVisible || reconnectAttempts.current >= maxReconnectAttempts) {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            const errorMessage = `Failed to connect after ${maxReconnectAttempts} attempts`;
            console.error('[WebSocket]', errorMessage);
            
            // Only show error if chat is visible
            if (isChatVisible) {
              setError(new Error(errorMessage));
              onAuthError?.();
            }
          }
          return;
        }
        
        // Calculate exponential backoff delay with jitter
        reconnectAttempts.current += 1;
        const baseDelay = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttempts.current - 1),
          30000 // Max 30 seconds
        );
        
        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        const delay = Math.floor(baseDelay + jitter);
        
        console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          // Only try to reconnect if chat is visible and this wasn't an explicit disconnect
          if (isMounted.current && isChatVisible && !isExplicitDisconnect.current) {
            connect(true).catch(err => {
              console.error('[WebSocket] Reconnection attempt failed:', err);
            });
          }
        }, delay);
      };

      wsRef.current.onerror = (event) => {
        // Don't process errors if the chat is not visible or this was an explicit disconnect
        if (!isChatVisible || isExplicitDisconnect.current) {
          console.log('[WebSocket] Ignoring error - chat hidden or explicit disconnect');
          return;
        }
        
        // Get more detailed error information if available
        const errorMessage = event instanceof ErrorEvent ? event.message : 'WebSocket connection error';
        const errorCode = 'error' in event ? (event as any).code : 'unknown';
        
        // Log the error with more context (only to console, not to user)
        console.error(`[WebSocket] Error (code: ${errorCode}):`, errorMessage);
        
        // Don't show any error to the user, just log to console
        // setError and onAuthError are not called here to prevent notifications
        
        // If we're not already trying to reconnect, attempt to reconnect
        // but only if chat is visible and this wasn't an explicit disconnect
        if (!isConnecting && !isConnected && 
            reconnectAttempts.current < maxReconnectAttempts && 
            isChatVisible && 
            !isExplicitDisconnect.current) {
              
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts.current),
            30000 // Max 30 seconds
          );
          
          console.log(`[WebSocket] Scheduling reconnection in ${delay}ms after error`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted.current && isChatVisible && !isExplicitDisconnect.current) {
              connect(true).catch(err => {
                console.error('[WebSocket] Reconnection after error failed:', err);
              });
            }
          }, delay);
        }
      };

      return true;
    } catch (err) {
      wsLogger.error('Error connecting to WebSocket:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
      setIsConnecting(false);
      return false;
    }
  }, [wsUrl, isConnected, isConnecting, maxReconnectAttempts, reconnectInterval, onAuthError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      disconnect(false); // Don't treat unmount as explicit disconnect
      
      // Clear any pending debounce timers
      if (connectDebounceTimer.current) {
        clearTimeout(connectDebounceTimer.current);
        connectDebounceTimer.current = null;
      }
      
      // Clear any pending messages
      messageQueue.current = [];
    };
  }, [disconnect]);

  // Send a message through WebSocket
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!wsRef.current) {
      wsLogger.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    if (wsRef.current.readyState !== OPEN) {
      wsLogger.warn('Cannot send message: WebSocket not open. Queuing message.');
      messageQueue.current.push(JSON.stringify({ type: 'message', message }));
      return false;
    }

    try {
      const messageData = {
        type: 'message',
        message,
        timestamp: new Date().toISOString(),
        location: {
          city: geolocation.city,
          region: geolocation.region,
          country: geolocation.country,
          timezone: geolocation.timezone,
          locale: geolocation.locale
        }
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      return true;
    } catch (err) {
      wsLogger.error('Error sending message:', err);
      return false;
    }
  }, [geolocation]);

  // Send chat history
  const sendChatHistory = useCallback(async (
    history: WebSocketMessage[], 
    options: { 
      is_new_chat?: boolean; 
      chunk_id?: string; 
      is_existing_chat?: boolean; 
    } = {}
  ): Promise<boolean> => {
    if (!wsRef.current || wsRef.current.readyState !== OPEN) {
      wsLogger.warn('Cannot send chat history: WebSocket not connected');
      return false;
    }

    try {
      const messageData = {
        type: 'chat_history',
        history,
        ...options,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      return true;
    } catch (err) {
      wsLogger.error('Error sending chat history:', err);
      return false;
    }
  }, []);

  // Handle visibility change - immediately close connection when chat is hidden
  useEffect(() => {
    let visibilityTimer: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Clear any pending visibility changes
      if (visibilityTimer) {
        clearTimeout(visibilityTimer);
        visibilityTimer = null;
      }
      
      // If chat is being hidden, immediately close the connection
      if (!isVisible) {
        console.log('[WebSocket] Chat window hidden, cleaning up connections...');
        
        // Set chat as hidden to prevent any further connection attempts
        setIsChatVisible(false);
        
        // Clear any pending reconnection attempts first
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Reset reconnection attempts counter
        reconnectAttempts.current = 0;
        
        // Close the WebSocket connection if it exists
        if (wsRef.current) {
          try {
            // Save the current WebSocket instance
            const ws = wsRef.current;
            wsRef.current = null;
            
            // Close with a normal closure code
            ws.close(1000, 'Chat window closed');
          } catch (err) {
            console.log('[WebSocket] Error during close on visibility change:', err);
          }
        }
        
        // Update state to disconnected
        setIsConnected(false);
        setIsConnecting(false);
        setReadyState(CLOSED);
        
        // Clear any error state to prevent showing alerts
        setError(null);
        
        console.log('[WebSocket] Connection cleanup complete');
      } else {
        // When chat becomes visible, set a small delay before attempting to reconnect
        // to allow the UI to update first
        visibilityTimer = setTimeout(() => {
          console.log('[WebSocket] Chat window became visible, updating state...');
          setIsChatVisible(true);
          
          // Only attempt to connect if not already connected/connecting
          if (!isConnected && !isConnecting) {
            console.log('[WebSocket] Attempting to connect...');
            connect(true).catch(err => {
              console.log('[WebSocket] Connection attempt failed:', err);
            });
          } else {
            console.log('[WebSocket] Already connected or connecting, skipping connection attempt');
          }
        }, 300); // Small delay to allow UI to update
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial connection if autoConnect is true and chat is visible
    if (autoConnect && !document.hidden) {
      // Small delay for initial connection to prevent race conditions
      const timer = setTimeout(() => {
        if (isMounted.current && isChatVisible) {
          connect(true).catch(err => {
            wsLogger.error('Initial connection error:', err);
          });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }

    // Cleanup
    return () => {
      clearTimeout(visibilityTimer!);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoConnect, connect, disconnect, isChatVisible, isConnected, isConnecting]);

  // Return the WebSocket API
  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    sendChatHistory,
    messages,
    lastMessage,
    error,
    readyState
  };
};
