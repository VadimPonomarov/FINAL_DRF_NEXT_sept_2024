"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { useRedisAuth } from '@/contexts/RedisAuthContext';
import { getAuthTokens, refreshAccessToken } from '@/services/auth/tokenService';
import { AuthProvider } from '@/common/constants/constants';

export interface AutoRiaAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: any | null;
  error: string | null;
}

export interface AutoRiaAuthActions {
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

/**
 * Хук для работы с авторизацией в AutoRia
 * Интегрируется с существующей системой токенов и Redis
 * Использует RedisAuthContext для получения данных пользователя
 */
export const useAutoRiaAuth = (): AutoRiaAuthState & AutoRiaAuthActions => {
  const { data: session, status } = useSession();
  const { provider } = useAuthProvider();
  const { redisAuth, isLoading: redisLoading } = useRedisAuth();
  
  const [state, setState] = useState<AutoRiaAuthState>({
    isAuthenticated: false,
    isLoading: true,
    token: null,
    user: null,
    error: null
  });

  // Получение токена из различных источников
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      // Если используется backend провайдер, получаем токены из Redis
      if (provider === AuthProvider.MyBackendDocs) {
        const tokens = await getAuthTokens();
        if (tokens?.access) {
          return tokens.access;
        }
      }

      // Если используется NextAuth сессия
      if (session?.user) {
        // Проверяем, есть ли токен в сессии
        const sessionToken = (session as any)?.accessToken;
        if (sessionToken) {
          return sessionToken;
        }
      }

      return null;
    } catch (error) {
      console.error('[useAutoRiaAuth] Error getting token:', error);
      setState(prev => ({ ...prev, error: 'Failed to get authentication token' }));
      return null;
    }
  }, [provider, session]);

  // Обновление токена
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (provider === AuthProvider.MyBackendDocs) {
        const refreshResult = await refreshAccessToken();
        if (refreshResult?.access) {
          setState(prev => ({ 
            ...prev, 
            token: refreshResult.access,
            isLoading: false 
          }));
          return refreshResult.access;
        }
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to refresh token'
      }));
      return null;
    } catch (error) {
      console.error('[useAutoRiaAuth] Error refreshing token:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to refresh authentication token'
      }));
      return null;
    }
  }, [provider]);

  // Проверка авторизации
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[useAutoRiaAuth] Checking auth...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const token = await getToken();
      
      if (!token) {
        console.log('[useAutoRiaAuth] No token found');
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false,
          isLoading: false,
          token: null,
          user: null
        }));
        return false;
      }

      // Получаем информацию о пользователе из Redis через RedisAuthContext
      let user = null;
      if (redisAuth?.user) {
        user = redisAuth.user;
        console.log('[useAutoRiaAuth] User from Redis:', user);
      } else if (session?.user) {
        user = session.user;
        console.log('[useAutoRiaAuth] User from session:', user);
      }

      console.log('[useAutoRiaAuth] Final user:', user);

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        token,
        user,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('[useAutoRiaAuth] Error checking auth:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
        error: 'Authentication check failed'
      }));
      return false;
    }
  }, [getToken, session, redisAuth]);

  // Выход из системы
  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
      error: null
    });
  }, []);

  // Инициализация при монтировании компонента
  useEffect(() => {
    // Ждем пока загрузятся и NextAuth, и Redis
    if (status !== 'loading' && !redisLoading) {
      console.log('[useAutoRiaAuth] Status ready, checking auth...', { status, redisLoading, redisUser: redisAuth?.user });
      checkAuth();
    }
  }, [status, provider, session, redisAuth, redisLoading, checkAuth]);

  // Автоматическое обновление токена при изменении провайдера
  useEffect(() => {
    if (provider === AuthProvider.MyBackendDocs && state.isAuthenticated && !state.token) {
      getToken().then(token => {
        if (token) {
          setState(prev => ({ ...prev, token }));
        }
      });
    }
  }, [provider, state.isAuthenticated, state.token, getToken]);

  return {
    ...state,
    getToken,
    refreshToken,
    logout,
    checkAuth
  };
};

export default useAutoRiaAuth;
