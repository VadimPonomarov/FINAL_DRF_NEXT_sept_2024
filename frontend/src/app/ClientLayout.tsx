"use client";

import React, { Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import {MenuMain} from "@/components/Menus/MenuMain/MenuMain";
import RootProvider from "@/shared/providers/RootProvider";
import {MagicBackButton} from "@/components/ui/magicBackButton";
import { Toaster } from "@/components/ui/toaster";
import TopRightControls from "@/components/All/TopRightControls/TopRightControls";
import GlobalProviderToggle from "@/components/All/GlobalProviderToggle/GlobalProviderToggle";

// Lazy load ChatBotIcon - not critical for initial render
const ChatBotIcon = dynamic(
  () => import("@/components/ChatBot/ChatBotIcon").then(mod => ({ default: mod.ChatBotIcon })),
  { ssr: false, loading: () => null }
);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider>
      <header className="header-container h-[50px]">
        <div className="relative">
          <div className="absolute top-1/2 -translate-y-1/2 translate-y-1 left-[10px] z-[1001] hidden md:block">
            <MagicBackButton variant="ghost" className="w-5 h-5 z-[1001]" />
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
  );
}
