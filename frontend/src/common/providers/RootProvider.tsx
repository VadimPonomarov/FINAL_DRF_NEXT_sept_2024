"use client";
import React, { FC, useEffect } from "react";
import { SessionProvider, signOut } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthProviderProvider } from "@/contexts/AuthProviderContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { ChatContextProvider } from "@/components/ChatBot/providers/ChatContextProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { preloadCriticalReferenceData, fetchBrandsWithCache } from "@/utils/cachedFetch";
import { setupGlobalFetchErrorTracking, useApiErrorHandler } from "@/hooks/useApiErrorHandler";

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

const RootProvider: FC<IProps> = ({ children }) => {
  // Preload critical data on app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[RootProvider] 🚀 Starting app initialization...');

        // Preload critical data
        await Promise.all([
          preloadCriticalReferenceData(),
          fetchBrandsWithCache(),
        ]);

        console.log('[RootProvider] ✅ App initialization completed');
      } catch (error) {
        console.error('[RootProvider] ❌ App initialization failed:', error);
      }
    };

    initializeApp();
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
                      <GlobalApiErrorHandler />
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
