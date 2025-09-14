"use client";

import React from 'react';
import { ChatBotIconView } from './ChatBotIconView';
import { useChatBotIconLogic } from './ChatBotIconLogic';
import { ChatBotIconProps } from './types';

export const ChatBotIcon: React.FC<ChatBotIconProps> = (props) => {
  const {
    isOpen,
    shouldShowChat,
    handleOpenChat,
    handleCloseChat,
    handleBackdropClick,
    handleSaveSize,
    handleAuthError
  } = useChatBotIconLogic(props);

  if (!shouldShowChat) {
    return null;
  }

  return (
    <ChatBotIconView
      isOpen={isOpen}
      onOpenChat={handleOpenChat}
      onCloseChat={handleCloseChat}
      onBackdropClick={handleBackdropClick}
      onSaveSize={handleSaveSize}
      onAuthError={handleAuthError}
    />
  );
};

export * from './types';
