"use client";

import { useCallback, useRef, useState } from 'react';
import { WebSocketMessage } from '@/modules/chatbot/chat/chatTypes';
import { MessageContext, ThreadInfo, MessageRelationship } from '@/modules/autoria/shared/types/messageContext';
import { wsLogger } from '@/modules/chatbot/chat/logger';

interface UseChatContextReturn {
  addMessage: (message: WebSocketMessage) => void;
  getMessageContext: (messageId: string) => MessageContext | null;
  getThreadInfo: (threadId: string) => ThreadInfo | null;
  getRelatedMessages: (messageId: string) => string[];
  getConversationThread: (threadId: string) => WebSocketMessage[];
  getContextWindow: (messageId: string, windowSize?: number) => WebSocketMessage[];
}

export const useChatContext = () => {
  // Store message contexts
  const messageContexts = useRef<Map<string, MessageContext>>(new Map());
  const threads = useRef<Map<string, ThreadInfo>>(new Map());
  const relationships = useRef<Map<string, MessageRelationship[]>>(new Map());
  const messages = useRef<Map<string, WebSocketMessage>>(new Map());

  // Add a new message and update context
  const addMessage = useCallback((message: WebSocketMessage) => {
    if (!message.id) {
      return;
    }    // Store the message
    messages.current.set(message.id, message);

    // Create context for the message
    const context: MessageContext = {
      messageId: message.id,
      timestamp: message.timestamp || new Date().toISOString(),
      references: message.references || [],
      referencedBy: [],
      conversationThread: message.thread || `thread_${message.id}`,

      // Handle image context
      imageContext: message.image_url ? {
        originalPrompt: message.content || message.message,
        sanitizedUrl: message.image_url,
        generationParams: {
          width: 1024,
          height: 1024,
          model: 'flux',
          seed: parseInt(new URL(message.image_url).searchParams.get('seed') || '0')
        }
      } : undefined,

      // Add semantic context
      semanticContext: {
        topics: [],
        entities: [],
        intent: message.role === 'user' ? 'query' : 'response'
      },

      // Initialize memory context
      memoryContext: {
        relatedFacts: [],
        previousInteractions: [],
        userPreferences: {}
      }
    };

    // Update relationships
    if (message.inReplyTo) {
      context.references.push(message.inReplyTo);
      const relationship: MessageRelationship = {
        sourceId: message.id,
        targetId: message.inReplyTo,
        type: 'reply'
      };
      const existingRelationships = relationships.current.get(message.id) || [];
      relationships.current.set(message.id, [...existingRelationships, relationship]);

      // Update the referenced message's context
      const referencedContext = messageContexts.current.get(message.inReplyTo);
      if (referencedContext) {
        referencedContext.referencedBy.push(message.id);
      }
    }

    // Update thread info
    const threadId = message.thread || `thread_${message.id}`;
    const threadInfo = threads.current.get(threadId);
    if (threadInfo) {
      threadInfo.lastUpdateTime = message.timestamp || new Date().toISOString();
      threadInfo.messageCount++;
    } else {
      threads.current.set(threadId, {
        threadId,
        title: `Thread starting with ${message.content?.substring(0, 30) || 'Message'}...`,
        startTime: message.timestamp || new Date().toISOString(),
        lastUpdateTime: message.timestamp || new Date().toISOString(),
        messageCount: 1,
        participantCount: 1
      });
    }

    messageContexts.current.set(message.id, context);
    wsLogger.debug('Added message context', { messageId: message.id, context });
  }, []);

  // Get context for a specific message
  const getMessageContext = useCallback((messageId: string): MessageContext | null => {
    if (!messageId || !messageContexts.current) return null;
    return messageContexts.current.get(messageId) || null;
  }, []);

  // Get thread information
  const getThreadInfo = useCallback((threadId: string): ThreadInfo | null => {
    if (!threadId || !threads.current) return null;
    return threads.current.get(threadId) || null;
  }, []);

  // Get all messages related to a specific message
  const getRelatedMessages = useCallback((messageId: string): string[] => {
    if (!messageId || !messageContexts.current) return [];
    const context = messageContexts.current.get(messageId);
    if (!context) return [];

    const related = new Set<string>();

    // Add referenced messages
    if (context.references) {
      context.references.forEach(id => related.add(id));
    }

    // Add messages that reference this one
    if (context.referencedBy) {
      context.referencedBy.forEach(id => related.add(id));
    }

    return Array.from(related);
  }, []);

  // Get all messages in a conversation thread
  const getConversationThread = useCallback((threadId: string): WebSocketMessage[] => {
    if (!threadId || !messageContexts.current || !messages.current) return [];
    const threadMessages: WebSocketMessage[] = [];

    messageContexts.current.forEach((context, messageId) => {
      if (context && context.conversationThread === threadId) {
        const message = messages.current.get(messageId);
        if (message) {
          threadMessages.push(message);
        }
      }
    });

    return threadMessages.sort((a, b) => {
      const timeA = a?.timestamp || '';
      const timeB = b?.timestamp || '';
      return timeA.localeCompare(timeB);
    });
  }, []);

  // Get context window for a message
  const getContextWindow = useCallback((messageId: string, windowSize: number = 5): WebSocketMessage[] => {
    if (!messageId || !messageContexts.current || !messages.current) return [];
    const context = messageContexts.current.get(messageId);
    if (!context) return [];

    const windowMessages = new Set<string>();
    const queue = [messageId];

    while (queue.length > 0 && windowMessages.size < windowSize) {
      const currentId = queue.shift()!;
      const currentContext = messageContexts.current.get(currentId);

      if (currentContext) {
        windowMessages.add(currentId);

        // Add references to queue if we haven't hit the limit
        if (currentContext.references) {
          currentContext.references.forEach(refId => {
            if (!windowMessages.has(refId)) {
              queue.push(refId);
            }
          });
        }
      }
    }

    // Get actual messages and sort by timestamp
    return Array.from(windowMessages)
      .map(id => messages.current.get(id))
      .filter((msg): msg is WebSocketMessage => msg !== undefined)
      .sort((a, b) => {
        const timeA = a?.timestamp || '';
        const timeB = b?.timestamp || '';
        return timeA.localeCompare(timeB);
      });
  }, []);

  return {
    addMessage,
    getMessageContext,
    getThreadInfo,
    getRelatedMessages,
    getConversationThread,
    getContextWindow,
  };
};
