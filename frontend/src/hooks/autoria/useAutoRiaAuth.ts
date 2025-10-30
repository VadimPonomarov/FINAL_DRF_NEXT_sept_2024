"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
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
 */
export const useAutoRiaAuth = (): AutoRiaAuthState & AutoRiaAuthActions => {
  const { data: session, status } = useSession();
  const { provider } = useAuthProvider();
  
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
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const token = await getToken();
      
      if (!token) {
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false,
          isLoading: false,
          token: null,
          user: null
        }));
        return false;
      }

      // Получаем информацию о пользователе
      let user = null;
      if (session?.user) {
        user = session.user;
      } else if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('backend_auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          user = authData?.user;
        }
      }

      console.log('[useAutoRiaAuth] ✅ Token present and user data loaded');
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
  }, [getToken, session]);

  // Выход из системы
  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
      error: null
    });

    // Очищаем localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('backend_auth');
    }
  }, []);

  // Инициализация при монтировании компонента
  useEffect(() => {
    if (status !== 'loading') {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, provider]);

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
