"use client";

import React, { useEffect } from "react";
import {MenuMain} from "@/components/Menus/MenuMain/MenuMain";
import RootProvider from "@/shared/providers/RootProvider";
import { ChatBotIcon } from "@/components/ChatBot/ChatBotIcon";
import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logger } from "@/shared/utils/logger";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      logger.error('Global error:', event.error?.message || event.message);
      event.preventDefault();
      return true;
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
      return true;
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Something went wrong. Please refresh the page.</div>}>
      <RootProvider>
        <header className="header-container h-[50px]">
          <MenuMain/>
        </header>
        <main className="w-full min-h-[calc(100vh-50px)] pt-[60px] pb-4">
          {children}
        </main>
        <ChatBotIcon />
        <Toaster />
      </RootProvider>
    </ErrorBoundary>
  );
}
