"use client";
import React, { FC, useEffect } from "react";
import { SessionProvider, signOut } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthProviderProvider } from "@/contexts/AuthProviderContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { ChatContextProvider } from "@/components/ChatBot/providers/ChatContextProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { preloadCriticalReferenceData, fetchBrandsWithCache } from "@/utils/cachedFetch";

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

const RootProvider: FC<IProps> = ({ children }) => {
  // Clear session and preload data on app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Версия деплоя - измените это значение при каждом деплое
        const DEPLOY_VERSION = '2024-09-15-v1';
        const LAST_SIGNOUT_KEY = 'last_signout_version';

        const lastSignoutVersion = localStorage.getItem(LAST_SIGNOUT_KEY);

        // Если версия изменилась или signOut еще не был выполнен
        if (lastSignoutVersion !== DEPLOY_VERSION) {
          console.log('[RootProvider] 🧹 New deploy detected, clearing session...');

          // Очищаем NextAuth сессию
          await signOut({ redirect: false });

          // Очищаем Redis состояние
          try {
            await fetch('/api/redis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'backend_auth', value: null })
            });

            await fetch('/api/redis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'auth_provider', value: 'dummy' })
            });

            console.log('[RootProvider] ✅ Session and Redis state cleared');
          } catch (redisError) {
            console.warn('[RootProvider] ⚠️ Failed to clear Redis state:', redisError);
          }

          // Сохраняем версию, чтобы не повторять signOut
          localStorage.setItem(LAST_SIGNOUT_KEY, DEPLOY_VERSION);
        } else {
          console.log('[RootProvider] ✅ Session already cleared for this deploy version');
        }

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
          <AuthProvider>
            <NotificationProvider>
              <AuthProviderProvider>
                <ChatProvider>
                  <ChatContextProvider>
                    {children}
                  </ChatContextProvider>
                </ChatProvider>
              </AuthProviderProvider>
            </NotificationProvider>
          </AuthProvider>
        </I18nProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default RootProvider;
