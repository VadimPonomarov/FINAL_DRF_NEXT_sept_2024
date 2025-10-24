"use client";

import { ChatBotIconProps } from './types';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useChatBotAuth } from '../hooks/useChatBotAuth';
import { useChatBotUI } from '../hooks/useChatBotUI';

/**
 * Рефакторированный хук для ChatBotIcon
 * Логика разделена на специализированные хуки:
 * - useChatBotAuth: управление аутентификацией
 * - useChatBotUI: управление UI (открытие/закрытие/resize)
 * - useChatWebSocket: управление WebSocket соединением
 */
export const useChatBotIconLogic = (/* eslint-disable-line @typescript-eslint/no-unused-vars */
  _props: ChatBotIconProps
) => {
  // === 1. АУТЕНТИФИКАЦИЯ ===
  const {
    shouldShowChat,
    isHydrated,
    handleAuthError: authErrorHandler
  } = useChatBotAuth();

  // === 2. WEBSOCKET ===
  const { disconnect } = useChatWebSocket({
    channelId: 'default',
    onAuthError: () => {
      console.log('[ChatBotIconLogic] WebSocket auth error');
      authErrorHandler();
      setIsOpenCallback(false);
    }
  });

  // === 3. UI ===
  const {
    isOpen,
    handleOpenChat,
    handleCloseChat,
    handleBackdropClick,
    handleResizeStart,
    handleResizeEnd,
    handleSaveSize,
    resizeTimeout
  } = useChatBotUI(isHydrated, disconnect);

  // Callback для установки isOpen из WebSocket хука
  const setIsOpenCallback = (value: boolean) => {
    if (!value && isOpen) {
      handleCloseChat();
    }
  };

  // Обработчик ошибок аутентификации (объединенный)
  const handleAuthError = () => {
    console.log('[ChatBotIconLogic] Auth error detected, closing chat');
    disconnect(true);
    authErrorHandler();
    setIsOpenCallback(false);
  };

  console.log('[ChatBotIconLogic] State:', {
    isOpen,
    shouldShowChat,
    isHydrated
  });

  return {
    isOpen,
    shouldShowChat,
    handleOpenChat,
    handleCloseChat,
    handleBackdropClick,
    handleSaveSize,
    handleAuthError,
    handleResizeStart,
    handleResizeEnd,
    resizeTimeout
  };
};
