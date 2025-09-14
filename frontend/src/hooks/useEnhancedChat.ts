/**
 * Enhanced chat hook that combines WebSocket, state management, and storage
 */

import { useCallback, useEffect, useRef } from 'react';
import { useEnhancedWebSocket } from './useEnhancedWebSocket';
import { useEnhancedChatState } from './useEnhancedChatState';
import { 
  UseChatOptions, 
  UseChatReturn, 
  IncomingWebSocketMessage,
  ChatRequest,
  EnhancedMessage,
  Intent,
  WebSocketError,
  AuthenticationError
} from '@/types/enhanced-chat';

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/chat/general/';

/**
 * Check if welcome message should be shown
 * Only show if it's not already the last message in the chat
 */
const checkShouldShowWelcomeMessage = (
  welcomeMessage: string,
  messages: EnhancedMessage[]
): boolean => {
  // If no messages, always show welcome
  if (messages.length === 0) {
    return true;
  }

  // Don't show if there are any system messages with welcome-like content
  const hasWelcomeMessage = messages.some(msg =>
    msg.role === 'system' &&
    (msg.content.includes('👋 Hello,') ||
     msg.content.includes('I\'m ready to help') ||
     msg.content === welcomeMessage)
  );

  return !hasWelcomeMessage;
};

/**
 * Remove duplicate welcome messages, keeping only the last one if it's the final message
 */
const removeDuplicateWelcomeMessages = (messages: EnhancedMessage[]): EnhancedMessage[] => {
  if (messages.length === 0) return messages;

  // Find all welcome messages with more specific criteria
  const welcomeIndices: number[] = [];
  messages.forEach((msg, index) => {
    if (msg.role === 'system' &&
        (msg.content.includes('👋 Hello,') ||
         msg.content.includes('I\'m ready to help') ||
         (msg.content.includes('Hello,') && msg.content.includes('ready to help')))) {
      welcomeIndices.push(index);
    }
  });

  // If no welcome messages or only one, return as is
  if (welcomeIndices.length <= 1) return messages;

  // Check if the last message is a welcome message
  const lastMessageIndex = messages.length - 1;
  const lastIsWelcome = welcomeIndices.includes(lastMessageIndex);

  // Remove all welcome messages except the last one if it's the final message
  const filteredMessages = messages.filter((msg, index) => {
    const isWelcomeMessage = welcomeIndices.includes(index);
    if (!isWelcomeMessage) return true;

    // Keep the welcome message only if it's the last message in the chat
    return lastIsWelcome && index === lastMessageIndex;
  });

  return filteredMessages;
};

export const useEnhancedChat = (options: UseChatOptions = {}): UseChatReturn => {
  const {
    autoConnect = true,
    onAuthError,
    onConnectionChange,
    onError,
    maxRetries = 5,
    retryDelay = 1000
  } = options;

  // State management
  const {
    state,
    setConnected,
    setConnectionStatus,
    setSessionId,
    setLoading,
    setTyping,
    setError,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setMessages,
    updateLastActivity,
    getMessageById,
    getMessagesByRole,
    createUserMessage,
    createAssistantMessage,
    createSystemMessage
  } = useEnhancedChatState();

  // Refs for tracking state
  const pendingMessages = useRef<Map<string, EnhancedMessage>>(new Map());
  const retryCount = useRef(0);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: IncomingWebSocketMessage) => {
    console.log('[Chat] Received message:', message);
    updateLastActivity();

    switch (message.type) {
      case 'welcome':
        setSessionId(message.session_id || null);

        // Check if we should show the welcome message
        const shouldShowWelcome = checkShouldShowWelcomeMessage(message.message, state.messages);
        if (shouldShowWelcome) {
          createSystemMessage(message.message, {
            session_id: message.session_id
          });
        }
        break;

      case 'message':
        // Create assistant message
        createAssistantMessage(message.message, message.metadata);
        setTyping(false);
        setLoading(false);
        break;

      case 'user_message':
        // Echo of user message (if enabled)
        break;

      case 'error':
        setError(message.message);
        setTyping(false);
        setLoading(false);
        
        // Mark pending messages as error
        pendingMessages.current.forEach((msg) => {
          updateMessage(msg.id, { status: 'error' });
        });
        pendingMessages.current.clear();
        break;

      case 'chat_history':
        // Load chat history from server
        const historyMessages: EnhancedMessage[] = message.history.map((msg, index) => ({
          id: `history_${index}_${Date.now()}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          status: 'delivered' as const,
          metadata: msg.metadata
        }));

        // Remove duplicate welcome messages before setting
        const cleanedMessages = removeDuplicateWelcomeMessages(historyMessages);
        setMessages(cleanedMessages);
        break;

      case 'history_cleared':
        clearMessages();
        createSystemMessage('Chat history has been cleared.');
        break;

      case 'response_metadata':
        // Handle response metadata if needed
        console.log('[Chat] Response metadata:', message.metadata);
        break;

      case 'message':
        // Handle regular chat messages from backend
        const chatMessage: EnhancedMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: (message.role as 'user' | 'assistant' | 'system') || 'assistant',
          content: message.message || message.content || '',
          timestamp: new Date(message.timestamp || Date.now()),
          status: 'delivered' as const,
          metadata: message.metadata || {}
        };

        setMessages(prev => [...prev, chatMessage]);
        break;

      case 'file_message':
        // Handle file analysis messages from backend
        const fileMessage: EnhancedMessage = {
          id: `file_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: (message.role as 'user' | 'assistant' | 'system') || 'assistant',
          content: message.message || message.content || '',
          timestamp: new Date(message.timestamp || Date.now()),
          status: 'delivered' as const,
          metadata: {
            ...message.metadata,
            messageType: 'file_analysis',
            files: message.files || []
          }
        };

        setMessages(prev => [...prev, fileMessage]);
        break;

      case 'pong':
        // Handled by WebSocket hook
        break;

      default:
        console.warn('[Chat] Unknown message type:', message.type, message);
    }
  }, [
    updateLastActivity,
    setSessionId,
    createSystemMessage,
    createAssistantMessage,
    setTyping,
    setLoading,
    setError,
    updateMessage,
    setMessages,
    clearMessages
  ]);

  // Handle WebSocket connection
  const handleConnect = useCallback(() => {
    console.log('[Chat] Connected to WebSocket');
    setConnected(true);
    setConnectionStatus('connected');
    setError(null);
    retryCount.current = 0;
    onConnectionChange?.(true);
  }, [setConnected, setConnectionStatus, setError, onConnectionChange]);

  // Handle WebSocket disconnection
  const handleDisconnect = useCallback((code: number, reason: string) => {
    console.log(`[Chat] Disconnected: ${code} - ${reason}`);
    setConnected(false);
    setConnectionStatus('disconnected');
    setTyping(false);
    setLoading(false);
    onConnectionChange?.(false);
  }, [setConnected, setConnectionStatus, setTyping, setLoading, onConnectionChange]);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: WebSocketError) => {
    console.error('[Chat] WebSocket error:', error);
    
    if (error instanceof AuthenticationError) {
      setError('Authentication required. Please log in.');
      onAuthError?.();
    } else {
      setError(error.message);
    }
    
    setConnectionStatus('error');
    onError?.(error.message);
  }, [setError, setConnectionStatus, onAuthError, onError]);

  // WebSocket hook
  const {
    isConnected: wsConnected,
    isConnecting,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage: wsSendMessage
  } = useEnhancedWebSocket({
    url: DEFAULT_WS_URL,
    onMessage: handleWebSocketMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleWebSocketError,
    onAuthError,
    autoReconnect: true,
    maxReconnectAttempts: maxRetries,
    reconnectDelay: retryDelay,
    heartbeatInterval: 30000
  });

  // Update connection status based on WebSocket state
  useEffect(() => {
    if (isConnecting) {
      setConnectionStatus('connecting');
    }
  }, [isConnecting, setConnectionStatus]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !wsConnected && !isConnecting) {
      wsConnect();
    }
  }, [autoConnect, wsConnected, isConnecting, wsConnect]);

  // Send message function
  const sendMessage = useCallback(async (
    message: string, 
    options: Partial<ChatRequest['context']> = {}
  ): Promise<void> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    if (!wsConnected) {
      throw new Error('Not connected to chat server');
    }

    // Create user message
    const userMessage = createUserMessage(message.trim());
    pendingMessages.current.set(userMessage.id, userMessage);

    // Set loading state
    setLoading(true);
    setTyping(true);
    setError(null);

    // Send message via WebSocket
    const chatRequest: ChatRequest = {
      type: 'chat',
      message: message.trim(),
      echo: false,
      context: options
    };

    const sent = wsSendMessage(chatRequest);
    
    if (sent) {
      // Mark user message as sent
      updateMessage(userMessage.id, { status: 'sent' });
      pendingMessages.current.delete(userMessage.id);
    } else {
      // Mark as error if failed to send
      updateMessage(userMessage.id, { status: 'error' });
      pendingMessages.current.delete(userMessage.id);
      setLoading(false);
      setTyping(false);
      throw new Error('Failed to send message');
    }
  }, [wsConnected, createUserMessage, setLoading, setTyping, setError, wsSendMessage, updateMessage]);

  // Clear history function
  const clearHistory = useCallback(async (): Promise<void> => {
    if (!wsConnected) {
      throw new Error('Not connected to chat server');
    }

    const success = wsSendMessage({ type: 'clear_history' });
    if (!success) {
      throw new Error('Failed to clear history');
    }
  }, [wsConnected, wsSendMessage]);

  // Request history function
  const requestHistory = useCallback(async (): Promise<void> => {
    if (!wsConnected) {
      throw new Error('Not connected to chat server');
    }

    const success = wsSendMessage({ type: 'chat_history' });
    if (!success) {
      throw new Error('Failed to request history');
    }
  }, [wsConnected, wsSendMessage]);

  // Connect function
  const connect = useCallback(() => {
    wsConnect();
  }, [wsConnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    wsDisconnect();
  }, [wsDisconnect]);

  // Retry function
  const retry = useCallback(() => {
    if (retryCount.current < maxRetries) {
      retryCount.current++;
      setError(null);
      wsConnect();
    } else {
      setError('Maximum retry attempts reached');
    }
  }, [maxRetries, setError, wsConnect]);

  // Storage functions (placeholder for now)
  const createNewChunk = useCallback(() => {
    // TODO: Implement chunk creation
    console.log('[Chat] Create new chunk - not implemented');
  }, []);

  const switchChunk = useCallback((chunkId: string) => {
    // TODO: Implement chunk switching
    console.log('[Chat] Switch chunk - not implemented:', chunkId);
  }, []);

  const deleteChunk = useCallback((chunkId: string) => {
    // TODO: Implement chunk deletion
    console.log('[Chat] Delete chunk - not implemented:', chunkId);
  }, []);

  const switchDate = useCallback((date: string) => {
    // TODO: Implement date switching
    console.log('[Chat] Switch date - not implemented:', date);
  }, []);

  // Utility functions
  const getMessagesByIntent = useCallback((intent: Intent) => {
    return state.messages.filter(msg => msg.metadata?.intent === intent);
  }, [state.messages]);

  const getConversationContext = useCallback((messageId: string) => {
    // TODO: Implement conversation context
    const message = getMessageById(messageId);
    if (!message) return [];
    
    // For now, return surrounding messages
    const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
    const start = Math.max(0, messageIndex - 5);
    const end = Math.min(state.messages.length, messageIndex + 6);
    
    return state.messages.slice(start, end);
  }, [state.messages, getMessageById]);

  return {
    // State
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    error: state.error,
    sessionId: state.sessionId,
    connectionStatus: state.connectionStatus,
    
    // Actions
    sendMessage,
    clearHistory,
    requestHistory,
    connect,
    disconnect,
    retry,
    
    // Storage actions (placeholder)
    createNewChunk,
    switchChunk,
    deleteChunk,
    switchDate,
    
    // Utility
    getMessageById,
    getMessagesByIntent,
    getConversationContext
  };
};
