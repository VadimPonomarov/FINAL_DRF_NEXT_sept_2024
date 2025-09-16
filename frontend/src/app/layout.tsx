import "./globals.css";
import "./fonts.css";
import React from "react";
import {PageTracker} from "react-page-tracker";
import type { Metadata } from 'next';

// Render PageTracker only in production (or explicitly enabled)
const SHOW_PAGE_TRACKER = false; // Отключено по запросу пользователя
import {MenuMain} from "@/components/Menus/MenuMain/MenuMain";
import RootProvider from "@/common/providers/RootProvider";
import {MagicBackButton} from "@/components/ui/magicBackButton";

import { ChatBotIcon } from "@/components/ChatBot/ChatBotIcon";
import { ThemeControls } from "@/components/ui/theme-controls.tsx";
import { Toaster } from "@/components/ui/toaster";
import TopRightControls from "@/components/All/TopRightControls/TopRightControls";

import {geistMono, geistSans} from "./constants";

export const metadata: Metadata = {
  title: 'Автомобильная площадка',
  description: 'Покупка и продажа автомобилей',
  icons: {
    icon: '/icon',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RootProvider>
          <header className="header-container h-[50px]">
            <div className="relative">
              {SHOW_PAGE_TRACKER && <PageTracker/>}
              <div className="absolute top-1/2 -translate-y-1/2 translate-y-1 left-[10px] z-[1001] hidden md:block">
                <MagicBackButton variant="ghost" className="w-5 h-5 z-[1001]" />
              </div>
              <MenuMain/>
            </div>
          </header>
          {/* Top Right Controls - Auth + Language */}
          <TopRightControls />
          <main className="w-full min-h-[calc(100vh-50px)] pt-[60px] pb-4">
            {children}
          </main>
          <Toaster />
          <ChatBotIcon />
        </RootProvider>
      </body>
    </html>
  );
}