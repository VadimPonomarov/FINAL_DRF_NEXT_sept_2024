import "./globals.css";
import "./fonts.css";
import React from "react";
import type { Metadata } from 'next';
import {MenuMain} from "@/components/Menus/MenuMain/MenuMain";
import RootProvider from "@/common/providers/RootProvider";
import {MagicBackButton} from "@/components/ui/magicBackButton";

import { ChatBotIcon } from "@/components/ChatBot/ChatBotIcon";
import { ThemeControls } from "@/components/ui/theme-controls.tsx";
import { ToastProvider } from "@/components/ui/toast-provider";
import TopRightControls from "@/components/All/TopRightControls/TopRightControls";
import GlobalProviderToggle from "@/components/All/GlobalProviderToggle/GlobalProviderToggle";

import { Geist, Geist_Mono } from "next/font/google";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

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
      <head>
        {/* Performance: preconnect/dns-prefetch to backend and image CDN */}
        <link rel="preconnect" href="http://localhost:8000" />
        <link rel="dns-prefetch" href="http://localhost:8000" />
        <link rel="preconnect" href="https://image.pollinations.ai" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.pollinations.ai" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RootProvider>
          <ToastProvider>
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
          </ToastProvider>
        </RootProvider>
      </body>
    </html>
  );
}