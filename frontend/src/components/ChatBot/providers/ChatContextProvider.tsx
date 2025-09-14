"use client";

import React, { createContext, useContext } from 'react';
import { useChatContext as useOriginalChatContext } from '../hooks/useChatContext';
import { WebSocketMessage } from '@/utils/chat/chatTypes';
import { MessageContext, ThreadInfo } from '@/types/messageContext';

// Create a context with the return type of useChatContext
interface ChatContextType {
  addMessage: (message: WebSocketMessage) => void;
  getMessageContext: (messageId: string) => MessageContext | null;
  getThreadInfo: (threadId: string) => ThreadInfo | null;
  getRelatedMessages: (messageId: string) => string[];
  getConversationThread: (threadId: string) => WebSocketMessage[];
  getContextWindow: (messageId: string, windowSize?: number) => WebSocketMessage[];
}

// Create the context with a default undefined value
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  // Use the original hook
  const chatContext = useOriginalChatContext();

  return (
    <ChatContext.Provider value={chatContext}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the context
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatContextProvider');
  }
  return context;
}
