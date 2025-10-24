import React, { useRef, useCallback, useState } from 'react';
import { CurrencyExchangeDisplay } from './CurrencyExchangeDisplay';
import { Message } from '../hooks/useChat';
import { ChatMessageView } from './ChatMessageView';
import { EnhancedChatMessage } from './EnhancedChatMessage';

interface ChatMessageProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  messageContext?: any;
  onThreadClick?: (threadId: string | null) => void;
  showContext?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onDelete,
  messageContext,
  onThreadClick,
  showContext = false
}) => {
  // Используем улучшенную версию ChatMessage с сохранением состояния
  return (
    <EnhancedChatMessage
      message={message}
      onDelete={onDelete}
      messageContext={messageContext}
      onThreadClick={onThreadClick}
      showContext={showContext}
    />
  );
};