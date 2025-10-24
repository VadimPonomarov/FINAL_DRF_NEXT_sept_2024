"use client";

import { useState, useEffect } from 'react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/common/constants/constants';

/**
 * Hook для управления аутентификацией чат-бота
 * Проверяет наличие backend_auth и текущего провайдера
 */
export const useChatBotAuth = () => {
  const { provider } = useAuthProvider();
  const [hasBackendAuth, setHasBackendAuth] = useState(false);
  const [currentAuthProvider, setCurrentAuthProvider] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Гидратация
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Проверка backend_auth
  const checkBackendAuth = async () => {
    try {
      // Пытаемся получить данные из Redis
      const response = await fetch('/api/redis?key=backend_auth');
      if (response.ok) {
        const data = await response.json();
        if (data && data.value) {
          console.log('[useChatBotAuth] Backend auth found in Redis');
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
              console.log('[useChatBotAuth] Backend auth found in localStorage');
              setHasBackendAuth(true);
              return;
            }
          } catch (e) {
            console.error('[useChatBotAuth] Error parsing backend_auth:', e);
          }
        }
      }

      console.log('[useChatBotAuth] No backend auth found');
      setHasBackendAuth(false);
    } catch (error) {
      console.error('[useChatBotAuth] Error checking backend auth:', error);
      setHasBackendAuth(false);
    }
  };

  // Проверка текущего провайдера
  const checkAuthProvider = async () => {
    try {
      const response = await fetch('/api/redis?key=auth_provider');
      if (response.ok) {
        const data = await response.json();
        if (data && data.value) {
          console.log('[useChatBotAuth] Auth provider found in Redis:', data.value);
          setCurrentAuthProvider(data.value);
          return;
        }
      }

      console.log('[useChatBotAuth] No auth provider found in Redis');
      setCurrentAuthProvider(null);
    } catch (error) {
      console.error('[useChatBotAuth] Error checking auth provider:', error);
      setCurrentAuthProvider(null);
    }
  };

  // Обработчик изменения провайдера
  const handleAuthProviderChange = (event?: Event) => {
    const customEvent = event as CustomEvent<{ provider: string }>;
    if (customEvent && customEvent.detail && customEvent.detail.provider) {
      console.log('[useChatBotAuth] Auth provider changed to:', customEvent.detail.provider);
      setCurrentAuthProvider(customEvent.detail.provider);
    } else {
      checkAuthProvider();
    }
  };

  // Обработчик изменения данных аутентификации
  const handleAuthDataChange = () => {
    checkBackendAuth();
  };

  // Обработчик ошибок аутентификации
  const handleAuthError = () => {
    console.log('[useChatBotAuth] Auth error detected');
    setHasBackendAuth(false);
  };

  // Проверяем backend_auth при монтировании и изменении провайдера
  useEffect(() => {
    checkBackendAuth();
  }, [provider, isHydrated]);

  // Проверяем провайдер при монтировании и изменении
  useEffect(() => {
    checkAuthProvider();
  }, [provider]);

  // События изменения аутентификации
  useEffect(() => {
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

  // Логика показа чата: только для MyBackendDocs
  const hasSelectedProvider = provider !== AuthProvider.Select;
  const isBackendProvider = provider === AuthProvider.MyBackendDocs;
  const shouldShowChat = isHydrated && hasSelectedProvider && isBackendProvider;

  console.log('[useChatBotAuth] Auth state:', {
    provider,
    hasSelectedProvider,
    isBackendProvider,
    shouldShowChat,
    isHydrated,
    hasBackendAuth,
    currentAuthProvider
  });

  return {
    hasBackendAuth,
    currentAuthProvider,
    shouldShowChat,
    isHydrated,
    handleAuthError
  };
};

