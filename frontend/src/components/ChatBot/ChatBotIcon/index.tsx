"use client";

import React from 'react';
import { ChatBotIconView } from './ChatBotIconView';
import { useChatBotIconLogic } from './ChatBotIconLogic';
import { ChatBotIconProps } from './types';

export const ChatBotIcon: React.FC<ChatBotIconProps> = (props) => {
  console.log('[ChatBotIcon] Component rendering...');

  const {
    isOpen,
    shouldShowChat,
    handleOpenChat,
    handleCloseChat,
    handleBackdropClick,
    handleSaveSize,
    handleAuthError
  } = useChatBotIconLogic(props);

  console.log('[ChatBotIcon] shouldShowChat:', shouldShowChat);

  if (!shouldShowChat) {
    console.log('[ChatBotIcon] Not showing chat - shouldShowChat is false');
    return null;
  }

  console.log('[ChatBotIcon] Rendering chat button');

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
