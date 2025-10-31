"use client";

import { useState, useEffect } from 'react';
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

export const useChatBotIconLogic = (/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _props: ChatBotIconProps
) => {
  const [isOpen, setIsOpen] = useState(false);
  const { provider } = useAuthProvider();
  const isHydrated = useIsHydrated();
  const { toast } = useToast();

  // WebSocket хук для управления соединением
  const { disconnect } = useChatWebSocket({
    channelId: 'default',
    onAuthError: () => {
      console.log('WebSocket auth error in ChatBotIcon');
      setIsOpen(false);
    }
  });

  useEffect(() => {
    const handleAuthProviderChange = (event?: Event) => {
      setIsOpen(false); // Закрываем чат при смене провайдера

      // Если есть данные о новом провайдере в событии, обновляем состояние
      const customEvent = event as CustomEvent<{ provider: string }>;
      if (customEvent && customEvent.detail && customEvent.detail.provider) {
        console.log('Auth provider changed to:', customEvent.detail.provider);
        setCurrentAuthProvider(customEvent.detail.provider);
      } else {
        // Иначе запрашиваем данные из Redis
        const checkAuthProvider = async () => {
          try {
            const response = await fetch('/api/redis?key=auth_provider');
            if (response.ok) {
              const data = await response.json();
              if (data && data.value) {
                console.log('Auth provider found in Redis after change:', data.value);
                setCurrentAuthProvider(data.value);
                return;
              }
            }

            console.log('No auth provider found in Redis after change');
            setCurrentAuthProvider(null);
          } catch (error) {
            console.error('Error checking auth provider after change:', error);
            setCurrentAuthProvider(null);
          }
        };

        checkAuthProvider();
      }
    };

    const handleAuthDataChange = (_event?: Event) => {
      // Проверяем наличие backend_auth при изменении данных аутентификации
      const checkBackendAuth = async () => {
        try {
          // Пытаемся получить данные из Redis
          const response = await fetch('/api/redis?key=backend_auth');
          if (response.ok) {
            const data = await response.json();
            if (data && data.value) {
              console.log('Backend auth found in Redis after auth data change');
              setHasBackendAuth(true);
              return;
            }
          }

          // Если в Redis нет данных, проверяем localStorage (только после гидратации)
          if (isHydrated) {
            const localData = localStorage.getItem('backend_auth');
            if (localData) {
              try {
                const parsedData = JSON.parse(localData);
                if (parsedData && (parsedData.access || parsedData.refresh)) {
                  console.log('Backend auth found in localStorage after auth data change');
                  setHasBackendAuth(true);
                  return;
                }
              } catch (e) {
                console.error('Error parsing backend_auth from localStorage:', e);
              }
            }
          }

          // Если нигде не нашли данных, устанавливаем false
          console.log('No backend auth found after auth data change');
          setHasBackendAuth(false);
        } catch (error) {
          console.error('Error checking backend auth after auth data change:', error);
          setHasBackendAuth(false);
        }
      };

      checkBackendAuth();
    };

    // Обработчик события storage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'backend_auth') {
        handleAuthDataChange();
      }
    };

    window.addEventListener('authProviderChanged', handleAuthProviderChange);
    window.addEventListener('authDataChanged', handleAuthDataChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('authProviderChanged', handleAuthProviderChange);
      window.removeEventListener('authDataChanged', handleAuthDataChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Обработчик ошибок аутентификации
  const handleAuthError = () => {
    console.log('Auth error detected, closing chat and disconnecting WebSocket');
    disconnect(true); // Отключаем WebSocket при ошибке аутентификации
    setIsOpen(false); // Закрываем чат при ошибке аутентификации
    setHasBackendAuth(false); // Сбрасываем состояние backend_auth
  };

  // Обработчик открытия чата с умным рефрешем токенов
  const handleOpenChat = async () => {
    console.log('[ChatBotIcon] Opening chat with smart token refresh...');

    try {
      // Используем умный рефреш - обновляем токены только если нужно
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

      console.log('[ChatBotIcon] Token refresh result:', refreshResult);
      
      // Если refresh вернул ошибку с 404 - токены не найдены, нужно залогиниться
      if (!refreshResult.success && refreshResult.error?.includes('not found')) {
        console.error('[ChatBotIcon] Tokens not found (404), checking NextAuth session and redirecting');
        const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
        const currentPath = window.location.pathname + window.location.search;
        redirectToAuth(currentPath, 'tokens_not_found');
        return; // Прекращаем открытие чата, если нужен логин
      }
    } catch (error) {
      console.error('[ChatBotIcon] Error during smart token refresh:', error);
      // Если ошибка связана с отсутствием токенов - редиректим с учетом многоуровневой системы
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
        const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
        const currentPath = window.location.pathname + window.location.search;
        redirectToAuth(currentPath, 'tokens_not_found');
        return;
      }
      // Продолжаем открытие чата только если это не критическая ошибка
    }

    // Открываем чат - последний активный чат будет загружен автоматически
    // благодаря useEffect в useChatStorage
    setIsOpen(true);

    // Для надежности также диспетчеризуем событие загрузки последнего активного чата
    const lastActiveChunkId = getLastActiveChunk();
    if (lastActiveChunkId) {
      console.log(`Last active chunk found: ${lastActiveChunkId}`);
      // Создаем и диспетчеризуем событие для загрузки последнего активного чата
      window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
        detail: { chunkId: lastActiveChunkId }
      }));
    } else {
      console.log('No last active chunk found');
    }
  };

  // Обработчик закрытия чата
  const handleCloseChat = () => {
    // Отключаем WebSocket соединение
    console.log('Closing chat and disconnecting WebSocket');
    disconnect(true); // explicit disconnect

    // Закрываем чат
    setIsOpen(false);

    // Сохраняем информацию о последнем активном чате (только после гидратации)
    // Это дополнительная мера для надежности, так как основное сохранение происходит в selectChunk
    if (isHydrated) {
      const currentChunkId = localStorage.getItem('current_chunk_id');
      if (currentChunkId) {
        console.log(`Saving last active chunk on close: ${currentChunkId}`);
        saveLastActiveChunk(currentChunkId);
      }
    }
  };

  // Обработчик клика по фону
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Закрываем модальное окно только если клик был по самому фону
    if (e.target === e.currentTarget) {
      if (isHydrated) {
        const wrapper = document.querySelector('div[data-debug]');
        if (wrapper) {
          const width = (wrapper as HTMLElement).style.width || window.getComputedStyle(wrapper).width;
          const height = (wrapper as HTMLElement).style.height || window.getComputedStyle(wrapper).height;
          if (width && height) {
            const size = { width, height };
            localStorage.setItem('chatDialogSize', JSON.stringify(size));
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
          localStorage.setItem('chatDialogSize', JSON.stringify(size));
          console.log(`Saved size on close: ${width} x ${height}`);
        }
      }
    }

    // Отключаем WebSocket при закрытии
    console.log('Saving size and closing chat, disconnecting WebSocket');
    disconnect(true);
    setIsOpen(false);
  };

  // Проверяем наличие backend_auth в localStorage или Redis
  const [hasBackendAuth, setHasBackendAuth] = useState(false);

  // Проверяем наличие backend_auth при монтировании компонента и при изменении провайдера
  useEffect(() => {
    const checkBackendAuth = async () => {
      try {
        // Проверяем только Redis - токены НЕ хранятся в localStorage
        const response = await fetch('/api/redis?key=backend_auth');
        if (response.ok) {
          const data = await response.json();
          if (data && data.value) {
            console.log('Backend auth found in Redis');
            setHasBackendAuth(true);
            return;
          }
        }

        // Если в Redis нет данных, устанавливаем false
        console.log('No backend auth found in Redis');
        setHasBackendAuth(false);
      } catch (error) {
        console.error('Error checking backend auth:', error);
        setHasBackendAuth(false);
      }
    };

    checkBackendAuth();
  }, [provider, isHydrated]);

  // Получаем текущий провайдер аутентификации из Redis
  const [currentAuthProvider, setCurrentAuthProvider] = useState<string | null>(null);

  // Проверяем текущий провайдер аутентификации при монтировании компонента и при изменении провайдера
  useEffect(() => {
    const checkAuthProvider = async () => {
      try {
        // Пытаемся получить данные из Redis
        const response = await fetch('/api/redis?key=auth_provider');
        if (response.ok) {
          const data = await response.json();
          if (data && data.value) {
            console.log('Auth provider found in Redis:', data.value);
            setCurrentAuthProvider(data.value);
            return;
          }
        }

        // Если в Redis нет данных, устанавливаем null
        console.log('No auth provider found in Redis');
        setCurrentAuthProvider(null);
      } catch (error) {
        console.error('Error checking auth provider:', error);
        setCurrentAuthProvider(null);
      }
    };

    checkAuthProvider();
  }, [provider]);

  // Логика показа кнопки чата привязана к логике меню:
  // Показываем чат ТОЛЬКО для провайдера MyBackendDocs (backend)
  // Используем ту же логику, что и в MenuMain.tsx
  const hasSelectedProvider = provider !== AuthProvider.Select;
  const isBackendProvider = provider === AuthProvider.MyBackendDocs;

  const shouldShowChat = isHydrated && hasSelectedProvider && isBackendProvider;

  // Отладочная информация (синхронизирована с логикой меню)
  console.log('[ChatBotIcon] Menu-based logic:', {
    provider,
    hasSelectedProvider,
    isBackendProvider,
    shouldShowChat,
    isHydrated,
    // Дополнительная информация
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
    handleAuthError
  };
};
