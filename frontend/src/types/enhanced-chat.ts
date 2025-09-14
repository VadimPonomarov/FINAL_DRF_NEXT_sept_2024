/**
 * Enhanced chat types compatible with the new LangGraph-based backend
 */

// Base types
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';

// Intent types (matching backend)
export type Intent = 
  | 'general_chat'
  | 'text_generation'
  | 'image_generation'
  | 'factual_search'
  | 'web_crawling'
  | 'code_execution'
  | 'data_analysis'
  | 'file_read'
  | 'file_write'
  | 'file_analysis'
  | 'datetime';

export type DataMode = 'historical' | 'realtime';

// WebSocket message types (incoming from backend)
export type WebSocketMessageType = 
  | 'welcome'
  | 'message'
  | 'user_message'
  | 'error'
  | 'pong'
  | 'chat_history'
  | 'history_cleared'
  | 'response_metadata';

// WebSocket message types (outgoing to backend)
export type OutgoingMessageType = 
  | 'chat'
  | 'ping'
  | 'chat_history'
  | 'clear_history';

// Message metadata from backend
export interface MessageMetadata {
  intent?: Intent;
  data_mode?: DataMode;
  confidence?: number;
  reasoning?: string;
  processing_time?: number;
  session_id?: string;
  has_images?: boolean;
  has_files?: boolean;
  error?: boolean;
  image_url?: string;
}

// Enhanced message interface
export interface EnhancedMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  metadata?: MessageMetadata;
  
  // Optional fields for different message types
  images?: string[];
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  
  // Context information
  context?: {
    thread_id?: string;
    parent_message_id?: string;
    related_messages?: string[];
  };
}

// WebSocket message interfaces (incoming)
export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  session_id?: string;
}

// Основные типы сообщений (используются в проекте)
export type IncomingWebSocketMessage = BaseWebSocketMessage;

// WebSocket message interfaces (outgoing)
export interface BaseChatRequest {
  type: OutgoingMessageType;
}

export interface ChatRequest extends BaseChatRequest {
  type: 'chat';
  message: string;
  echo?: boolean;
  context?: {
    debug_mode?: boolean;
    max_search_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
    file_path?: string;
    file_content?: string;
    directory?: string;
    max_file_length?: number;
    image_style?: string;
    additional_context?: string;
  };
}

// Удалены неиспользуемые типы запросов

export type OutgoingWebSocketMessage = 
  | ChatRequest
  | PingRequest
  | ChatHistoryRequest
  | ClearHistoryRequest;

// Chat state interfaces
export interface ChatState {
  messages: EnhancedMessage[];
  isConnected: boolean;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  sessionId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastActivity: Date | null;
}

// Chat storage interfaces
export interface ChatChunk {
  id: string;
  name: string;
  messages: EnhancedMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatDate {
  date: string; // YYYY-MM-DD format
  chunks: ChatChunk[];
}

export interface ChatStorage {
  dates: ChatDate[];
  currentDate: string;
  currentChunkId: string | null;
  settings: {
    maxMessagesPerChunk: number;
    maxChunksPerDate: number;
    autoCreateChunks: boolean;
  };
}

// Hook interfaces
export interface UseChatOptions {
  autoConnect?: boolean;
  onAuthError?: () => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export interface UseChatReturn {
  // State
  messages: EnhancedMessage[];
  isConnected: boolean;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  sessionId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Actions
  sendMessage: (message: string, options?: Partial<ChatRequest['context']>) => Promise<void>;
  clearHistory: () => Promise<void>;
  requestHistory: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  retry: () => void;
  
  // Storage actions
  createNewChunk: () => void;
  switchChunk: (chunkId: string) => void;
  deleteChunk: (chunkId: string) => void;
  switchDate: (date: string) => void;
  
  // Utility
  getMessageById: (id: string) => EnhancedMessage | undefined;
  getMessagesByIntent: (intent: Intent) => EnhancedMessage[];
  getConversationContext: (messageId: string) => EnhancedMessage[];
}

// Component prop interfaces
export interface ChatMessageProps {
  message: EnhancedMessage;
  isLast?: boolean;
  onRetry?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface ChatHeaderProps {
  isConnected: boolean;
  sessionId: string | null;
  messageCount: number;
  onClearHistory: () => void;
  onToggleConnection: () => void;
}

// Error types
export class ChatError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export class WebSocketError extends ChatError {
  constructor(message: string, public event?: Event) {
    super(message, 'WEBSOCKET_ERROR');
    this.name = 'WebSocketError';
  }
}

export class AuthenticationError extends ChatError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}
