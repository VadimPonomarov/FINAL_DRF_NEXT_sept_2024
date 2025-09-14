/**
 * Enhanced chat state management hook
 */

import { useCallback, useReducer, useRef } from 'react';
import { 
  EnhancedMessage, 
  ChatState, 
  MessageRole, 
  MessageStatus,
  MessageMetadata 
} from '@/types/enhanced-chat';

// Action types
type ChatAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: ChatState['connectionStatus'] }
  | { type: 'ADD_MESSAGE'; payload: EnhancedMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<EnhancedMessage> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_MESSAGES'; payload: EnhancedMessage[] }
  | { type: 'UPDATE_LAST_ACTIVITY' };

// Initial state
const initialState: ChatState = {
  messages: [],
  isConnected: false,
  isLoading: false,
  isTyping: false,
  error: null,
  sessionId: null,
  connectionStatus: 'disconnected',
  lastActivity: null
};

// Reducer
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
        connectionStatus: action.payload ? 'connected' : 'disconnected',
        error: action.payload ? null : state.error
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };

    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload,
        connectionStatus: action.payload ? 'error' : state.connectionStatus
      };

    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        lastActivity: new Date()
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
        lastActivity: new Date()
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload)
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        lastActivity: new Date()
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
        lastActivity: new Date()
      };

    case 'UPDATE_LAST_ACTIVITY':
      return {
        ...state,
        lastActivity: new Date()
      };

    default:
      return state;
  }
};

interface UseEnhancedChatStateReturn {
  // State
  state: ChatState;
  
  // Connection actions
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: ChatState['connectionStatus']) => void;
  setSessionId: (sessionId: string | null) => void;
  
  // Loading and error actions
  setLoading: (loading: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Message actions
  addMessage: (message: Omit<EnhancedMessage, 'id' | 'timestamp'>) => EnhancedMessage;
  updateMessage: (id: string, updates: Partial<EnhancedMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setMessages: (messages: EnhancedMessage[]) => void;
  
  // Utility actions
  updateLastActivity: () => void;
  
  // Message utilities
  getMessageById: (id: string) => EnhancedMessage | undefined;
  getMessagesByRole: (role: MessageRole) => EnhancedMessage[];
  getMessagesByStatus: (status: MessageStatus) => EnhancedMessage[];
  getLastMessage: () => EnhancedMessage | undefined;
  getLastUserMessage: () => EnhancedMessage | undefined;
  getLastAssistantMessage: () => EnhancedMessage | undefined;
  
  // Message creation helpers
  createUserMessage: (content: string, metadata?: MessageMetadata) => EnhancedMessage;
  createAssistantMessage: (content: string, metadata?: MessageMetadata) => EnhancedMessage;
  createSystemMessage: (content: string, metadata?: MessageMetadata) => EnhancedMessage;
}

export const useEnhancedChatState = (): UseEnhancedChatStateReturn => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const messageIdCounter = useRef(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${++messageIdCounter.current}`;
  }, []);

  // Connection actions
  const setConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, []);

  const setConnectionStatus = useCallback((status: ChatState['connectionStatus']) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setSessionId = useCallback((sessionId: string | null) => {
    dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
  }, []);

  // Loading and error actions
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setTyping = useCallback((typing: boolean) => {
    dispatch({ type: 'SET_TYPING', payload: typing });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // Message actions
  const addMessage = useCallback((message: Omit<EnhancedMessage, 'id' | 'timestamp'>) => {
    const enhancedMessage: EnhancedMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date()
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: enhancedMessage });
    return enhancedMessage;
  }, [generateMessageId]);

  const updateMessage = useCallback((id: string, updates: Partial<EnhancedMessage>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const setMessages = useCallback((messages: EnhancedMessage[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  }, []);

  // Utility actions
  const updateLastActivity = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
  }, []);

  // Message utilities
  const getMessageById = useCallback((id: string) => {
    return state.messages.find(msg => msg.id === id);
  }, [state.messages]);

  const getMessagesByRole = useCallback((role: MessageRole) => {
    return state.messages.filter(msg => msg.role === role);
  }, [state.messages]);

  const getMessagesByStatus = useCallback((status: MessageStatus) => {
    return state.messages.filter(msg => msg.status === status);
  }, [state.messages]);

  const getLastMessage = useCallback(() => {
    return state.messages[state.messages.length - 1];
  }, [state.messages]);

  const getLastUserMessage = useCallback(() => {
    const userMessages = getMessagesByRole('user');
    return userMessages[userMessages.length - 1];
  }, [getMessagesByRole]);

  const getLastAssistantMessage = useCallback(() => {
    const assistantMessages = getMessagesByRole('assistant');
    return assistantMessages[assistantMessages.length - 1];
  }, [getMessagesByRole]);

  // Message creation helpers
  const createUserMessage = useCallback((content: string, metadata?: MessageMetadata) => {
    return addMessage({
      role: 'user',
      content,
      status: 'sending',
      metadata
    });
  }, [addMessage]);

  const createAssistantMessage = useCallback((content: string, metadata?: MessageMetadata) => {
    return addMessage({
      role: 'assistant',
      content,
      status: 'delivered',
      metadata
    });
  }, [addMessage]);

  const createSystemMessage = useCallback((content: string, metadata?: MessageMetadata) => {
    return addMessage({
      role: 'system',
      content,
      status: 'delivered',
      metadata
    });
  }, [addMessage]);

  return {
    // State
    state,
    
    // Connection actions
    setConnected,
    setConnectionStatus,
    setSessionId,
    
    // Loading and error actions
    setLoading,
    setTyping,
    setError,
    
    // Message actions
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setMessages,
    
    // Utility actions
    updateLastActivity,
    
    // Message utilities
    getMessageById,
    getMessagesByRole,
    getMessagesByStatus,
    getLastMessage,
    getLastUserMessage,
    getLastAssistantMessage,
    
    // Message creation helpers
    createUserMessage,
    createAssistantMessage,
    createSystemMessage
  };
};
