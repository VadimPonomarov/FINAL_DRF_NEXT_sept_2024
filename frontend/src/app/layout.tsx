import "./globals.css";
import "./fonts.css";
import React from "react";
import type { Metadata } from 'next';
import ClientLayout from "./ClientLayout";

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}