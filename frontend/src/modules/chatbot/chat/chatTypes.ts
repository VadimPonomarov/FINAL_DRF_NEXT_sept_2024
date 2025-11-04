/**
 * Types for chat messages and WebSocket communication
 */
import React from 'react';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType = 'chat_message' | 'system_message' | 'error_message' | 'response_end' | 'file_message';

export interface FileAttachment {
  file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

export interface Message {
  id?: string;
  role: MessageRole;
  content?: string;
  message?: string;
  image_url?: string;
  imageUrl?: string; // For compatibility
  type?: MessageType;
  timestamp?: string;
  user_name?: string;
  chunk_id?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  files?: FileAttachment[];
  result_file_url?: string;
  resultFileUrl?: string; // For compatibility
  // Поля для отображения таблиц и графиков
  table_html?: string;
  tableHtml?: string; // For compatibility
  table_data?: Array<Record<string, any>>;
  tableData?: Array<Record<string, any>>; // For compatibility
  chart_base64?: string;
  chartBase64?: string; // For compatibility
  sender?: 'user' | 'assistant' | 'system'; // For compatibility
}

export interface ChatChunk {
  id: string;
  title: string;
  date: string;
  lastUpdated: string;
  messages: Message[];
  preview?: string;
}

export interface DateEntry {
  date: string;
  label: string;
  chunks?: string[];
}

export interface WebSocketMessage {
  id?: string;
  type: MessageType;
  message?: string;
  content?: string;
  role?: MessageRole;
  user_name?: string;
  timestamp?: string;
  image_url?: string;
  chunk_id?: string;
  files?: FileAttachment[];
  result_file_url?: string;
  // Поля для отображения таблиц и графиков
  table_html?: string;
  table_data?: Array<Record<string, any>>;
  chart_base64?: string;

  // New context fields
  inReplyTo?: string;  // ID of the message this is replying to
  references?: string[];  // IDs of messages referenced
  thread?: string;  // Conversation thread ID
  contextWindow?: string[];  // IDs of messages providing context
  causedBy?: string;  // ID of message that triggered this response
}

export interface SendChatHistoryOptions {
  is_new_chat?: boolean;
  chunk_id?: string;
  is_existing_chat?: boolean;
  sendGreeting?: boolean;
}

export interface UseChatProps {
  onAuthError?: () => void;
  autoConnect?: boolean;
}

export interface UseChatReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isWaitingForResponse: boolean;
  isWaitingForAssistantResponse: boolean;
  isSkeletonHiding: boolean;
  connectionError: string | null;
  sendMessage: (message: string) => Promise<void>;
  sendSystemMessage: (message: Message) => void;
  sendFiles: (files: File[], message?: string) => Promise<void>;
  getCurrentChunkMessages: () => Message[];
  cancelCurrentTask: () => void;
  markMessageAsRendering: (messageId: string) => void;
  markMessageAsRendered: (messageId: string) => void;
  isMessageRendering: (messageId: string) => boolean;
  shouldHideSkeletonBasedOnHistory: () => boolean;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  availableDates: string[];
  currentDate: string;
  availableChunks: ChatChunk[];
  currentChunk: ChatChunk | null;
  changeDate: (date: string) => void;
  formatDate: (date: string) => string;
  createChunk: () => void;
  startNewChat: () => Promise<boolean>;
  selectChunk: (chunkId: string) => void;
  deleteCurrentChunk: () => void;
  deleteMessage: (messageId: string) => void;
  deleteAllChunksForCurrentDate: () => void;
  deleteAllHistory: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  createSystemMessage: (message: string) => void;
  deleteChunk: (chunkId: string) => void;
  deleteAllChunks: (date: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
}

export interface ImageGenerationParams {
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  sampler: string;
  seed?: number;
  negative_prompt?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  sampler: string;
  negative_prompt?: string;
  seed?: number;
}

export interface ImageGenerationResponse {
  image_url?: string;
  model_used: string;
  parameters: Record<string, unknown>;
  error?: string;
}
