"use client";

import { useCallback, useRef } from 'react';
import { Message, WebSocketMessage } from '@/modules/chatbot/chat/chatTypes';
import { generateId } from '@/modules/chatbot/chat/chatStorage';
import { chatLogger } from '@/modules/chatbot/chat/logger';

/**
 * Hook for processing chat messages
 */
export const useChatMessageProcessor = () => {
  // Set to track processed message IDs
  const processedMessages = useRef(new Set<string>());

  // Function to check if a message has been processed
  const isProcessed = useCallback((message: Message): boolean => {
    if (!message.id) return false;
    return processedMessages.current.has(message.id);
  }, []);

  // Function to mark a message as processed
  const markAsProcessed = useCallback((message: Message): void => {
    if (message.id) {
      processedMessages.current.add(message.id);
    }
  }, []);

  // Function to clear processed messages
  const clearProcessedMessages = useCallback((): void => {
    processedMessages.current.clear();
  }, []);

  // Function to process a WebSocket message
  const processMessage = useCallback((wsMessage: WebSocketMessage, chunkId?: string): Message | null => {
    try {
      // Skip response_end messages
      if (wsMessage.type === 'response_end') {
        return null;
      }

      // Ensure the message has a valid role
      const validRole: 'user' | 'assistant' | 'system' =
        (wsMessage.role === 'user' || wsMessage.role === 'assistant' || wsMessage.role === 'system')
          ? wsMessage.role
          : 'assistant';

      // Create a message object
      const message: Message = {
        role: validRole,
        content: wsMessage.content || wsMessage.message || "",
        message: wsMessage.message || wsMessage.content || "", // For compatibility
        image_url: wsMessage.image_url,
        type: wsMessage.type,
        timestamp: wsMessage.timestamp || new Date().toISOString(),
        user_name: wsMessage.role === 'user' ? 'User' : 'AI Assistant',
        id: wsMessage.id || generateId(),
        chunk_id: chunkId,
        // Add file-related fields
        files: wsMessage.files || [],
        result_file_url: wsMessage.result_file_url,
        // Add table and chart fields
        table_html: wsMessage.table_html,
        table_data: wsMessage.table_data,
        chart_base64: wsMessage.chart_base64
      };

      // Log file processing for debugging
      if (wsMessage.files && wsMessage.files.length > 0) {
        chatLogger.info("Processing message with files", {
          fileCount: wsMessage.files.length,
          files: wsMessage.files.map(f => ({ name: f.file_name, type: f.file_type, size: f.file_size }))
        });
      }

      if (wsMessage.result_file_url) {
        chatLogger.info("Processing message with result file", {
          resultFileUrl: wsMessage.result_file_url
        });
      }

      if (wsMessage.chart_base64) {
        chatLogger.info("Processing message with chart", {
          chartLength: wsMessage.chart_base64.length
        });
      }

      if (wsMessage.table_html) {
        chatLogger.info("Processing message with table HTML", {
          tableLength: wsMessage.table_html.length
        });
      }

      return message;
    } catch (error) {
      chatLogger.error("Error processing WebSocket message", { error });
      return null;
    }
  }, []);

  // Function to process multiple messages
  const processMessages = useCallback((messages: Message[], chunkId?: string): Message[] => {
    return messages.map(msg => ({
      ...msg,
      id: msg.id || generateId(),
      chunk_id: chunkId || msg.chunk_id
    }));
  }, []);

  // Function to filter messages by chunk ID
  const filterMessages = useCallback((messages: Message[], chunkId?: string): Message[] => {
    if (!chunkId) return messages;
    return messages.filter(msg => !msg.chunk_id || msg.chunk_id === chunkId);
  }, []);

  // Function to create a user message
  const createUserMessage = useCallback((content: string, chunkId?: string): Message => {
    return {
      role: 'user',
      content,
      message: content, // For compatibility
      timestamp: new Date().toISOString(),
      type: 'chat_message',
      user_name: 'User',
      id: generateId(),
      chunk_id: chunkId
    };
  }, []);

  // Function to create a system message
  const createSystemMessage = useCallback((content: string, chunkId?: string): Message => {
    return {
      role: 'system',
      content,
      message: content, // For compatibility
      timestamp: new Date().toISOString(),
      type: 'system_message',
      id: generateId(),
      chunk_id: chunkId
    };
  }, []);

  return {
    processMessage,
    processMessages,
    filterMessages,
    createUserMessage,
    createSystemMessage,
    isProcessed,
    markAsProcessed,
    clearProcessedMessages
  };
};
