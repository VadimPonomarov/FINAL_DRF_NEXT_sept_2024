"use client";
import React, { FC, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
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
  // Preload heavy reference lists into browser cache once on mount
  useEffect(() => {
    Promise.all([
      preloadCriticalReferenceData(),
      fetchBrandsWithCache(),
    ]).catch(() => {});
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
