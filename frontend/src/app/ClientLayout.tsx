"use client";

import React, { useEffect } from "react";
import {MenuMain} from "@/components/Menus/MenuMain/MenuMain";
import RootProvider from "@/shared/providers/RootProvider";
import {MagicBackButton} from "@/components/ui/magicBackButton";
import { ChatBotIcon } from "@/components/ChatBot/ChatBotIcon";
import { Toaster } from "@/components/ui/toaster";
import TopRightControls from "@/components/All/TopRightControls/TopRightControls";
import GlobalProviderToggle from "@/components/All/GlobalProviderToggle/GlobalProviderToggle";
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
        <div className="relative">
          {/* Desktop MagicBackButton */}
          <div className="absolute top-1/2 -translate-y-1/2 translate-y-1 left-[10px] z-[80] hidden md:block">
            <MagicBackButton variant="ghost" className="w-5 h-5" />
          </div>
          {/* Mobile MagicBackButton */}
          <div className="md:hidden fixed left-4 top-4 z-[80]">
            <MagicBackButton variant="ghost" className="w-8 h-8 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700" />
          </div>
          <MenuMain/>
        </div>
      </header>
      {/* Top Right Controls - Auth + Language */}
      <TopRightControls />
      {/* Global Provider Toggle - показывается на всех страницах для авторизованных пользователей */}
      <GlobalProviderToggle />
      <main className="w-full min-h-[calc(100vh-50px)] pt-[60px] pb-4">
        {children}
      </main>
      <ChatBotIcon />
      <Toaster />
    </RootProvider>
    </ErrorBoundary>
  );
}
