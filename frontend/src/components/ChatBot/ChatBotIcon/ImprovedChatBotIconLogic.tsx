"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { ChatBotIconProps } from './types';
import { getLastActiveChunk, saveLastActiveChunk } from '@/utils/chat/chatStorage';
import { AuthProvider } from '@/common/constants/constants';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { tokenRefreshManager } from '@/utils/auth/tokenRefreshManager';
import { useToast } from '@/hooks/use-toast';

// Hook для проверки гидратации
const useIsHydrated = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
};

// Контекст для сохранения состояния чата
interface ChatState {
  isOpen: boolean;
  size: { width: number; height: number };
  position: { x: number; y: number };
  isResizing: boolean;
  resizeTimeout: NodeJS.Timeout | null;
}

const useChatState = () => {
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    size: { width: 900, height: 700 },
    position: { x: 0, y: 0 },
    isResizing: false,
    resizeTimeout: null
  });

  // Загрузка сохраненного состояния при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('chat-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setChatState(prev => ({
            ...prev,
            size: parsed.size || prev.size,
            position: parsed.position || prev.position
          }));
        }
      } catch (error) {
        console.warn('Failed to load saved chat state:', error);
      }
    }
  }, []);

  // Сохранение состояния
  const saveState = (newState: Partial<ChatState>) => {
    setChatState(prev => {
      const updated = { ...prev, ...newState };
      
      // Сохраняем в localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat-state', JSON.stringify({
            size: updated.size,
            position: updated.position
          }));
        } catch (error) {
          console.warn('Failed to save chat state:', error);
        }
      }
      
      return updated;
    });
  };

  return { chatState, saveState };
};

export const useImprovedChatBotIconLogic = (
  _props: ChatBotIconProps
) => {
  const [isOpen, setIsOpen] = useState(false);
  const { provider } = useAuthProvider();
  const isHydrated = useIsHydrated();
  const { toast } = useToast();
  const { chatState, saveState } = useChatState();
  
  // Таймаут для предотвращения случайного закрытия
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const RESIZE_TIMEOUT = 2000; // 2 секунды таймаут

  // WebSocket хук для управления соединением
  const { disconnect } = useChatWebSocket({
    channelId: 'default',
    onAuthError: () => {
      console.log('WebSocket auth error in ChatBotIcon');
      setIsOpen(false);
    }
  });

  // Обработчик начала изменения размера
  const handleResizeStart = () => {
    saveState({ isResizing: true });
    
    // Очищаем предыдущий таймаут
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Обработчик окончания изменения размера
  const handleResizeEnd = (newSize: { width: number; height: number }) => {
    saveState({ 
      isResizing: false, 
      size: newSize 
    });
    
    // Устанавливаем таймаут для предотвращения случайного закрытия
    closeTimeoutRef.current = setTimeout(() => {
      // Таймаут истек, можно безопасно закрывать при клике вне окна
    }, RESIZE_TIMEOUT);
  };

  // Обработчик клика по фону с улучшенной логикой
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Не закрываем если идет изменение размера
    if (chatState.isResizing) {
      return;
    }

    // Не закрываем если таймаут еще не истек
    if (closeTimeoutRef.current) {
      return;
    }

    // Закрываем модальное окно только если клик был по самому фону
    if (e.target === e.currentTarget) {
      if (isHydrated) {
        const wrapper = document.querySelector('div[data-debug]');
        if (wrapper) {
          const width = (wrapper as HTMLElement).style.width || window.getComputedStyle(wrapper).width;
          const height = (wrapper as HTMLElement).style.height || window.getComputedStyle(wrapper).height;
          if (width && height) {
            const size = { width, height };
            saveState({ size });
            console.log(`Saved size on backdrop click: ${width} x ${height}`);
          }
        }
      }

      // Отключаем WebSocket при закрытии через backdrop
      console.log('Closing chat via backdrop click and disconnecting WebSocket');
      disconnect(true);
      setIsOpen(false);
    }
  };

  // Обработчик сохранения размеров перед закрытием
  const handleSaveSize = () => {
    if (isHydrated) {
      const wrapper = document.querySelector('div[data-debug]');
      if (wrapper) {
        const width = (wrapper as HTMLElement).style.width || window.getComputedStyle(wrapper).width;
        const height = (wrapper as HTMLElement).style.height || window.getComputedStyle(wrapper).height;
        if (width && height) {
          const size = { width, height };
          saveState({ size });
          console.log(`Saved size on close: ${width} x ${height}`);
        }
      }
    }

    // Отключаем WebSocket при закрытии
    console.log('Saving size and closing chat, disconnecting WebSocket');
    disconnect(true);
    setIsOpen(false);
  };

  // Обработчик ошибок аутентификации
  const handleAuthError = () => {
    console.log('Auth error detected, closing chat and disconnecting WebSocket');
    disconnect(true);
    setIsOpen(false);
  };

  // Обработчик открытия чата
  const handleOpenChat = async () => {
    console.log('[ChatBotIcon] Opening chat with smart token refresh...');

    try {
      const refreshResult = await tokenRefreshManager.smartRefresh({
        maxRetries: 2,
        showToast: true,
        onProgress: (attempt, maxAttempts) => {
          toast({
            title: "Підготовка до підключення",
            description: `Оновлення токенів... (${attempt}/${maxAttempts})`,
            duration: 2000,
          });
        },
        onSuccess: (result) => {
          if (result.tokensVerified) {
            toast({
              title: "✅ Готово до підключення",
              description: "Токени оновлені та перевірені",
              duration: 2000,
            });
          }
        },
        onError: (error) => {
          toast({
            title: "⚠️ Попередження",
            description: `Помилка оновлення токенів: ${error}. Спробуйте підключення продовжується...`,
            variant: "destructive",
            duration: 4000,
          });
        }
      });

      console.log('[ChatBotIcon] Token refresh result:', refreshResult);
    } catch (error) {
      console.error('[ChatBotIcon] Error during smart token refresh:', error);
    }

    setIsOpen(true);

    // Загружаем последний активный чат
    const lastActiveChunkId = getLastActiveChunk();
    if (lastActiveChunkId) {
      console.log(`Last active chunk found: ${lastActiveChunkId}`);
      window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
        detail: { chunkId: lastActiveChunkId }
      }));
    }
  };

  // Обработчик закрытия чата
  const handleCloseChat = () => {
    console.log('Closing chat and disconnecting WebSocket');
    disconnect(true);
    setIsOpen(false);

    if (isHydrated) {
      const currentChunkId = localStorage.getItem('current_chunk_id');
      if (currentChunkId) {
        console.log(`Saving last active chunk on close: ${currentChunkId}`);
        saveLastActiveChunk(currentChunkId);
      }
    }
  };

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Остальная логика остается такой же...
  const [hasBackendAuth, setHasBackendAuth] = useState(false);
  const [currentAuthProvider, setCurrentAuthProvider] = useState<string | null>(null);

  // Проверяем наличие backend_auth
  useEffect(() => {
    const checkBackendAuth = async () => {
      try {
        const response = await fetch('/api/redis?key=backend_auth');
        if (response.ok) {
          const data = await response.json();
          if (data && data.value) {
            console.log('Backend auth found in Redis');
            setHasBackendAuth(true);
            return;
          }
        }

        if (isHydrated) {
          const localData = localStorage.getItem('backend_auth');
          if (localData) {
            try {
              const parsedData = JSON.parse(localData);
              if (parsedData && (parsedData.access || parsedData.refresh)) {
                console.log('Backend auth found in localStorage');
                setHasBackendAuth(true);
                return;
              }
            } catch (e) {
              console.error('Error parsing backend_auth from localStorage:', e);
            }
          }
        }

        console.log('No backend auth found');
        setHasBackendAuth(false);
      } catch (error) {
        console.error('Error checking backend auth:', error);
        setHasBackendAuth(false);
      }
    };

    checkBackendAuth();
  }, [provider, isHydrated]);

  // Проверяем текущий провайдер аутентификации
  useEffect(() => {
    const checkAuthProvider = async () => {
      try {
        const response = await fetch('/api/redis?key=auth_provider');
        if (response.ok) {
          const data = await response.json();
          if (data && data.value) {
            console.log('Auth provider found in Redis:', data.value);
            setCurrentAuthProvider(data.value);
            return;
          }
        }

        console.log('No auth provider found in Redis');
        setCurrentAuthProvider(null);
      } catch (error) {
        console.error('Error checking auth provider:', error);
        setCurrentAuthProvider(null);
      }
    };

    checkAuthProvider();
  }, [provider]);

  // Логика показа кнопки чата
  const hasSelectedProvider = provider !== AuthProvider.Select;
  const isBackendProvider = provider === AuthProvider.MyBackendDocs;
  const shouldShowChat = isHydrated && hasSelectedProvider && isBackendProvider;

  console.log('[ChatBotIcon] Menu-based logic:', {
    provider,
    hasSelectedProvider,
    isBackendProvider,
    shouldShowChat,
    isHydrated,
    hasBackendAuth,
    currentAuthProvider
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
    chatState
  };
};
