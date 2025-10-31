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
  hasBackendTokens: boolean;
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
    error: null,
    hasBackendTokens: false
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

      // Не считаем сессионный токен признаком backend-авторизации

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
      // Если нет сессии, не проверяем токены
      if (status === 'unauthenticated' || !session) {
        console.log('[useAutoRiaAuth] No session, clearing auth state');
        setState({
          isAuthenticated: false,
          isLoading: false,
          token: null,
          user: null,
          error: null,
          hasBackendTokens: false
        });
        return false;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Проверяем наличие backend токенов напрямую
      let token: string | null = null;
      let hasBackendTokens = false;
      if (provider === AuthProvider.MyBackendDocs) {
        const tokens = await getAuthTokens();
        token = tokens?.access || null;
        hasBackendTokens = !!tokens?.access;
      }

      if (!token || !hasBackendTokens) {
        console.log('[useAutoRiaAuth] No backend tokens found');
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false,
          isLoading: false,
          token: null,
          user: null,
          hasBackendTokens: false
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
          try {
            const authData = JSON.parse(storedAuth);
            user = authData?.user;
          } catch (e) {
            console.warn('[useAutoRiaAuth] Failed to parse stored auth data');
          }
        }
      }

      console.log('[useAutoRiaAuth] ✅ Token present and user data loaded');
      setState(prev => ({
        ...prev,
        isAuthenticated: hasBackendTokens,
        isLoading: false,
        token,
        user,
        error: null,
        hasBackendTokens
      }));

      return hasBackendTokens;
    } catch (error) {
      console.error('[useAutoRiaAuth] Error checking auth:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
        error: 'Authentication check failed',
        hasBackendTokens: false
      }));
      return false;
    }
  }, [getToken, session, status, provider]);

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

  // Инициализация при монтировании компонента и при изменении сессии
  useEffect(() => {
    if (status === 'loading') {
      return; // Ждем загрузки сессии
    }

    // Если сессии нет, сразу очищаем состояние
    if (status === 'unauthenticated' || !session) {
      console.log('[useAutoRiaAuth] No session, clearing state');
      setState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
        error: null,
        hasBackendTokens: false
      });
      return;
    }

    // Если сессия есть, проверяем токены
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, provider]);

  // Дополнительная очистка при signout событии
  useEffect(() => {
    const handleSignout = (event: CustomEvent) => {
      console.log('[useAutoRiaAuth] Signout event received, clearing auth state');
      setState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
        error: null,
        hasBackendTokens: false
      });
    };

    window.addEventListener('auth:signout', handleSignout as EventListener);

    return () => {
      window.removeEventListener('auth:signout', handleSignout as EventListener);
    };
  }, []);

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
