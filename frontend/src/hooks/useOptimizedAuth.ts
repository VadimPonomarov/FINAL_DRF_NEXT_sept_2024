'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { optimizedAuthCheck, clearAuthCache, type OptimizedTokenResult } from '@/shared/utils/auth/optimizedAuth';

/**
 * Оптимізований хук для авторизації з кешуванням
 * Мінімізує кількість запитів до API
 */
export function useOptimizedAuth() {
  const { data: session, status } = useSession();
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    fromCache: boolean;
  }>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    fromCache: false,
  });

  const checkAuth = useCallback(async (force = false) => {
    if (force) {
      clearAuthCache();
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Швидка перевірка NextAuth
      if (status === 'unauthenticated') {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          fromCache: false,
        });
        return;
      }

      if (status === 'authenticated' && session?.user?.email) {
        // Для простих сторінок NextAuth достатньо
        const result = await optimizedAuthCheck();
        
        setAuthState({
          isAuthenticated: result.isValid,
          isLoading: false,
          error: result.message || null,
          fromCache: result.fromCache || false,
        });
      }
    } catch (error) {
      console.error('[useOptimizedAuth] Error:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Auth check failed',
        fromCache: false,
      });
    }
  }, [session, status]);

  useEffect(() => {
    if (status !== 'loading') {
      checkAuth();
    }
  }, [checkAuth, status]);

  const refreshAuth = useCallback(() => {
    return checkAuth(true);
  }, [checkAuth]);

  return {
    ...authState,
    session,
    refreshAuth,
    hasNextAuthSession: status === 'authenticated',
  };
}
