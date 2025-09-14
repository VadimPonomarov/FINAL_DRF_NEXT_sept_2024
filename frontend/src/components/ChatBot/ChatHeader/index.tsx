"use client";

import React from 'react';
import { ChatHeaderView } from './ChatHeaderView';
import { ChatHeaderProps } from './types';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isConnected,
  isConnecting = false,
  onConnect,
  onRefreshToken,
  title = 'AI Assistant',
  onNewChat,
  onDeleteHistory
}) => {
  const handleRefreshToken = async () => {
    try {
      await onRefreshToken();
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  };

  return (
    <ChatHeaderView
      isConnected={isConnected}
      isConnecting={isConnecting}
      title={title}
      onConnect={onConnect}
      onRefreshToken={handleRefreshToken}
      onNewChat={onNewChat}
      onDeleteHistory={onDeleteHistory}
    />
  );
};

export * from './types';
