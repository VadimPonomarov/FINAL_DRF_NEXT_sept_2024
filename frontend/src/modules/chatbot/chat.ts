// Types for chat messages and WebSocket communication

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType = 'chat_message' | 'system_message' | 'error_message' | 'response_end';

export interface BaseMessage {
  id?: string;
  type: MessageType;
  timestamp: string;
  chunk_id?: string;
  content?: string;
}

export interface ChatMessage extends BaseMessage {
  type: 'chat_message';
  message: string;
  role: MessageRole;
  user_name: string;
  image_url?: string;
}

export interface SystemMessage extends BaseMessage {
  type: 'system_message';
  message: string;
  role?: MessageRole;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error_message';
  message: string;
  user_name: string;
}

export interface ResponseEndMessage extends BaseMessage {
  type: 'response_end';
}

export type WebSocketMessage = ChatMessage | SystemMessage | ErrorMessage | ResponseEndMessage;

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
