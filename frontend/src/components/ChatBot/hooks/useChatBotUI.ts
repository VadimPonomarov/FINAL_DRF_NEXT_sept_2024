"use client";

import { useState } from 'react';
import { tokenRefreshManager } from '@/utils/auth/tokenRefreshManager';
import { useToast } from '@/hooks/use-toast';
import { useChatBotStorage } from './useChatBotStorage';

/**
 * Hook для управления UI чат-бота
 * Управляет состоянием открыто/закрыто, размером окна, и взаимодействием с пользователем
 */
export const useChatBotUI = (
  isHydrated: boolean,
  disconnect: (explicit?: boolean) => void
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resizeTimeout, setResizeTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { loadLastActiveChunk, saveCurrentChunk, saveDialogSize } = useChatBotStorage(isHydrated);

  const RESIZE_TIMEOUT = 2000; // 2 секунды

  // Открытие чата с умным рефрешем токенов
  const handleOpenChat = async () => {
    console.log('[useChatBotUI] Opening chat with smart token refresh...');

    try {
      const refreshResult = await tokenRefreshManager.smartRefresh({
        maxRetries: 2,
        showToast: true,
        onProgress: (attempt, maxAttempts) => {
          toast({
            title: "Подготовка к подключению",
            description: `Обновление токенов... (${attempt}/${maxAttempts})`,
            duration: 2000,
          });
        },
        onSuccess: (result) => {
          if (result.tokensVerified) {
            toast({
              title: "✅ Готово к подключению",
              description: "Токены обновлены и проверены",
              duration: 2000,
            });
          }
        },
        onError: (error) => {
          toast({
            title: "⚠️ Предупреждение",
            description: `Ошибка обновления токенов: ${error}. Попытка подключения продолжается...`,
            variant: "destructive",
            duration: 4000,
          });
        }
      });

      console.log('[useChatBotUI] Token refresh result:', refreshResult);
    } catch (error) {
      console.error('[useChatBotUI] Error during smart token refresh:', error);
    }

    setIsOpen(true);
    loadLastActiveChunk();
  };

  // Закрытие чата
  const handleCloseChat = () => {
    console.log('[useChatBotUI] Closing chat and disconnecting WebSocket');
    disconnect(true);
    setIsOpen(false);
    saveCurrentChunk();
  };

  // Клик по фону
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (resizeTimeout) {
      console.log('[useChatBotUI] Resize timeout active, not closing chat');
      return;
    }

    if (isDragging) {
      console.log('[useChatBotUI] Drag operation active, not closing chat');
      return;
    }

    if (typeof window !== 'undefined' && window.isResizing) {
      console.log('[useChatBotUI] Global resize operation active, not closing chat');
      return;
    }

    if (e.target === e.currentTarget) {
      saveDialogSize();
      console.log('[useChatBotUI] Closing chat via backdrop click');
      disconnect(true);
      setIsOpen(false);
    }
  };

  // Начало изменения размера
  const handleResizeStart = () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    const timeout = setTimeout(() => {
      setResizeTimeout(null);
    }, RESIZE_TIMEOUT);
    
    setResizeTimeout(timeout);
    console.log('[useChatBotUI] Resize started, timeout set');
  };

  // Окончание изменения размера
  const handleResizeEnd = (newSize: { width: number; height: number }) => {
    if (isHydrated) {
      localStorage.setItem('chatDialogSize', JSON.stringify(newSize));
      console.log(`[useChatBotUI] Saved size on resize end: ${newSize.width} x ${newSize.height}`);
    }
    
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      setResizeTimeout(null);
    }
    
    console.log('[useChatBotUI] Resize ended, timeout cleared');
  };

  // Изменение состояния drag
  const handleDragStateChange = (dragging: boolean) => {
    setIsDragging(dragging);
    console.log('[useChatBotUI] Drag state changed:', dragging);
  };

  // Сохранение размера перед закрытием
  const handleSaveSize = () => {
    saveDialogSize();
    console.log('[useChatBotUI] Saving size and closing chat');
    disconnect(true);
    setIsOpen(false);
  };

  return {
    isOpen,
    handleOpenChat,
    handleCloseChat,
    handleBackdropClick,
    handleResizeStart,
    handleResizeEnd,
    handleDragStateChange,
    handleSaveSize,
    resizeTimeout
  };
};

