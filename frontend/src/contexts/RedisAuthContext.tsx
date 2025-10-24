"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthProvider } from './AuthProviderContext';
import { AuthProvider as AuthProviderEnum } from '@/common/constants/constants';

interface RedisUser {
  id?: number | string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

interface RedisAuthData {
  user?: RedisUser;
  access?: string;
  refresh?: string;
}

interface RedisAuthContextType {
  redisAuth: RedisAuthData | null;
  isLoading: boolean;
  refreshRedisAuth: () => Promise<void>;
}

const RedisAuthContext = createContext<RedisAuthContextType | undefined>(undefined);

export const RedisAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { provider } = useAuthProvider();
  const [redisAuth, setRedisAuth] = useState<RedisAuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRedisAuth = async () => {
    try {
      setIsLoading(true);
      
      // Определяем правильный ключ в зависимости от провайдера
      const authKey = provider === AuthProviderEnum.Dummy ? 'dummy_auth' : 'backend_auth';
      console.log(`[RedisAuthContext] Fetching ${authKey} for provider: ${provider}`);

      const response = await fetch(`/api/redis?key=${authKey}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data?.value) {
          const parsed = typeof data.value === 'string' 
            ? JSON.parse(data.value) 
            : data.value;
          
          console.log(`[RedisAuthContext] Loaded user data:`, parsed?.user);
          setRedisAuth(parsed);
        } else {
          console.log(`[RedisAuthContext] No data in ${authKey}`);
          setRedisAuth(null);
        }
      } else {
        console.warn(`[RedisAuthContext] Failed to fetch ${authKey}`);
        setRedisAuth(null);
      }
    } catch (error) {
      console.error('[RedisAuthContext] Error fetching Redis auth:', error);
      setRedisAuth(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем данные при монтировании и смене провайдера
  useEffect(() => {
    console.log(`[RedisAuthContext] Provider changed to: ${provider}`);
    fetchRedisAuth();
  }, [provider]);

  // Слушаем события изменения данных аутентификации
  useEffect(() => {
    const handleAuthDataChange = () => {
      console.log('[RedisAuthContext] Auth data changed event received');
      fetchRedisAuth();
    };

    const handleAuthProviderChange = () => {
      console.log('[RedisAuthContext] Auth provider changed event received');
      fetchRedisAuth();
    };

    window.addEventListener('authDataChanged', handleAuthDataChange);
    window.addEventListener('authProviderChanged', handleAuthProviderChange);

    return () => {
      window.removeEventListener('authDataChanged', handleAuthDataChange);
      window.removeEventListener('authProviderChanged', handleAuthProviderChange);
    };
  }, []);

  return (
    <RedisAuthContext.Provider 
      value={{ 
        redisAuth, 
        isLoading,
        refreshRedisAuth: fetchRedisAuth 
      }}
    >
      {children}
    </RedisAuthContext.Provider>
  );
};

export const useRedisAuth = () => {
  const context = useContext(RedisAuthContext);
  if (context === undefined) {
    throw new Error('useRedisAuth must be used within a RedisAuthProvider');
  }
  return context;
};

