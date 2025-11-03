"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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

      // Проверяем наличие backend токенов и получаем user data из Redis
      let token: string | null = null;
      let hasBackendTokens = false;
      let user = null;
      
      if (provider === AuthProvider.MyBackendDocs) {
        try {
          // Получаем токены и user data из /api/auth/token (который читает Redis)
          const response = await fetch('/api/auth/token');
          if (response.ok) {
            const data = await response.json();
            token = data.access || null;
            hasBackendTokens = !!data.access;
            user = data.user || null;
            
            console.log('[useAutoRiaAuth] Token data from Redis:', {
              hasToken: !!token,
              hasUser: !!user,
              userEmail: user?.email,
              isSuperuser: user?.is_superuser
            });
          } else {
            console.log('[useAutoRiaAuth] No tokens in Redis');
          }
        } catch (error) {
          console.error('[useAutoRiaAuth] Error fetching tokens:', error);
        }
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

      console.log('[useAutoRiaAuth] ✅ Token present and user data loaded from Redis');
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
      error: null,
      hasBackendTokens: false
    });

    // Очищаем localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('backend_auth');
    }
  }, []);

  // Инициализация: выполняем проверку авторизации ОДИН раз
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    // Ждем, пока NextAuth закончит загрузку состояния
    if (status === 'loading') return;

    if (hasCheckedRef.current) return; // уже проверяли, не повторяем
    hasCheckedRef.current = true;

    if (status === 'unauthenticated' || !session) {
      // Нет сессии — очищаем состояние и не дергаем проверку лишний раз
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

    // Есть сессия — разово проверяем наличие backend-токенов
    void checkAuth();
    // Пустой список зависимостей: сработает только на первом монтировании после стабилизации статуса
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  // Опционально: единичная попытка добрать токен, если он отсутствует, но авторизация есть
  const triedFillToken = useRef(false);
  useEffect(() => {
    if (triedFillToken.current) return;
    if (provider === AuthProvider.MyBackendDocs && state.isAuthenticated && !state.token) {
      triedFillToken.current = true;
      getToken().then(token => {
        if (token) {
          setState(prev => ({ ...prev, token }));
        }
      }).finally(() => {
        triedFillToken.current = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated]);

  return {
    ...state,
    getToken,
    refreshToken,
    logout,
    checkAuth
  };
};

export default useAutoRiaAuth;
