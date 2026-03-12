"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { getAuthTokens, refreshAccessToken } from '@/services/auth/tokenService';
import { AuthProvider } from '@/shared/constants/constants';

function isTokenExpiredLocal(token: string, bufferSeconds = 60): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Math.floor(Date.now() / 1000) + bufferSeconds;
  } catch {
    return true;
  }
}

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

  // Проверка авторизации — работает для cookie-based backend auth без NextAuth сессии
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (provider !== AuthProvider.MyBackendDocs) {
        setState(prev => ({ ...prev, isAuthenticated: false, isLoading: false, hasBackendTokens: false }));
        return false;
      }

      const response = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        setState(prev => ({ ...prev, isAuthenticated: false, isLoading: false, token: null, user: null, hasBackendTokens: false }));
        return false;
      }

      const data = await response.json();
      let token: string | null = data.access || null;
      let user = data.user || null;

      if (!token) {
        console.log('[useAutoRiaAuth] No access token in cookies');
        setState(prev => ({ ...prev, isAuthenticated: false, isLoading: false, token: null, user: null, hasBackendTokens: false }));
        return false;
      }

      // Auto-refresh if token is expired
      if (isTokenExpiredLocal(token)) {
        console.log('[useAutoRiaAuth] Token expired — refreshing...');
        const refreshResp = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store', credentials: 'include' });
        if (refreshResp.ok) {
          const refreshData = await refreshResp.json();
          token = refreshData.access || null;
          console.log('[useAutoRiaAuth] ✅ Token refreshed');
        } else {
          console.warn('[useAutoRiaAuth] Refresh failed:', refreshResp.status);
          token = null;
        }
      }

      if (!token) {
        setState(prev => ({ ...prev, isAuthenticated: false, isLoading: false, token: null, user: null, hasBackendTokens: false }));
        return false;
      }

      // If no NextAuth session user, fetch from backend profile to get is_superuser, email etc.
      if (!user) {
        try {
          const profileResp = await fetch('/api/user/profile', { cache: 'no-store', credentials: 'include' });
          if (profileResp.ok) {
            const profileData = await profileResp.json();
            user = {
              id: profileData.id,
              email: profileData.email,
              is_superuser: profileData.is_superuser,
              is_staff: profileData.is_staff,
            };
            console.log('[useAutoRiaAuth] ✅ User data from backend profile:', user.email, 'superuser:', user.is_superuser);
          }
        } catch (profileErr) {
          console.warn('[useAutoRiaAuth] Could not fetch profile data:', profileErr);
        }
      }

      console.log('[useAutoRiaAuth] ✅ Authenticated via cookies');
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        token,
        user,
        error: null,
        hasBackendTokens: true,
      }));
      return true;
    } catch (error) {
      console.error('[useAutoRiaAuth] Error checking auth:', error);
      setState(prev => ({ ...prev, isAuthenticated: false, isLoading: false, error: 'Authentication check failed', hasBackendTokens: false }));
      return false;
    }
  }, [provider]);

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

  // Инициализация и реактивная проверка: всегда проверяем cookies, сессия NextAuth не обязательна
  useEffect(() => {
    if (status === 'loading') return;
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

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
