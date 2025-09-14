"use client";

import React from 'react';
import { ChatMessagesView } from './ChatMessagesView';
import { useChatMessagesLogic } from './ChatMessagesLogic';
import { ChatMessagesProps } from './types';

export const ChatMessages: React.FC<ChatMessagesProps> = (props) => {
  const {
    filteredMessages,
    messagesEndRef,
    isThinking,
    messageContexts,
    handleThreadClick,
    activeThread
  } = useChatMessagesLogic(props);

  return (
    <ChatMessagesView
      messages={filteredMessages}
      isWaitingForResponse={isThinking}
      onCancel={props.onCancel}
      onDeleteMessage={props.onDeleteMessage}
      messagesEndRef={messagesEndRef}
      messageContexts={messageContexts}
      onThreadClick={handleThreadClick}
      activeThread={activeThread}
    />
  );
};

export * from './types';
