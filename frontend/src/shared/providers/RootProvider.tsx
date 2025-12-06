"use client";
import React, { FC, useEffect, useState } from "react";
import { SessionProvider, signOut } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthProviderProvider } from "@/contexts/AuthProviderContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { ChatContextProvider } from "@/components/ChatBot/providers/ChatContextProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { setupGlobalFetchErrorTracking, useApiErrorHandler } from "@/modules/autoria/shared/hooks/useApiErrorHandler";

import { IProps } from ".";

// Global React Query client with conservative refetching and long-lived cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid noisy refetches that trigger re-renders
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      // Reasonable defaults; reference data relies on cachedFetch anyway
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000,   // 30 min
    },
    mutations: {
      retry: 0,
    },
  },
});

// Компонент для глобального отслеживания API ошибок
const GlobalApiErrorHandler: FC = () => {
  const { trackError } = useApiErrorHandler({
    enableAutoRedirect: false, // Отключаем автоматический редирект - пользователь должен оставаться на странице
    criticalErrorThreshold: 10, // Увеличиваем порог до 10 ошибок (только серверные 500+ и network errors)
    onCriticalError: () => {
      console.log('[RootProvider] Critical API errors detected globally - NOT redirecting, user stays on page');
    },
    onBackendUnavailable: () => {
      console.warn('[RootProvider] Backend appears to be unavailable globally - user can continue working');
    }
  });

  useEffect(() => {
    console.log('[RootProvider] 🛡️ Setting up global API error tracking...');
    setupGlobalFetchErrorTracking(trackError);

    return () => {
      console.log('[RootProvider] 🧹 Cleaning up global API error tracking...');
    };
  }, [trackError]);

  return null; // Этот компонент не рендерит UI
};

// Компонент для очистки React Query кеша при signout
const CacheCleanupHandler: FC = () => {
  useEffect(() => {
    const handleSignout = (event: CustomEvent) => {
      console.log('[RootProvider] 🧹 Clearing React Query cache on signout...');
      // Очищаем все запросы связанные с пользователем
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.removeQueries({ queryKey: ['userProfile'] });
      queryClient.clear(); // Полная очистка кеша
      console.log('[RootProvider] ✅ React Query cache cleared');
    };

    window.addEventListener('auth:signout', handleSignout as EventListener);

    return () => {
      window.removeEventListener('auth:signout', handleSignout as EventListener);
    };
  }, []);

  return null;
};

const RootProvider: FC<IProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount before rendering components with useRouter
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <I18nProvider>
          <CurrencyProvider>
            <AuthProvider>
              <NotificationProvider>
                <AuthProviderProvider>
                  <ChatProvider>
                  <ChatContextProvider>
                    {mounted && <GlobalApiErrorHandler />}
                    <CacheCleanupHandler />
                    {children}
                  </ChatContextProvider>
                  </ChatProvider>
                </AuthProviderProvider>
              </NotificationProvider>
            </AuthProvider>
          </CurrencyProvider>
        </I18nProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default RootProvider;
