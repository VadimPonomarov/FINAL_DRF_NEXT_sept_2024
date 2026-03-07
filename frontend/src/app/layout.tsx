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
  title: {
    default: 'AutoRia — Автомобільний маркетплейс',
    template: '%s | AutoRia',
  },
  description: 'Купівля та продаж автомобілів. Найбільший маркетплейс оголошень про авто в Україні.',
  keywords: ['автомобілі', 'авто', 'продаж авто', 'купити авто', 'маркетплейс', 'AutoRia'],
  authors: [{ name: 'AutoRia' }],
  creator: 'AutoRia',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://autoria-clone.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    url: process.env.NEXTAUTH_URL || 'https://autoria-clone.vercel.app',
    siteName: 'AutoRia',
    title: 'AutoRia — Автомобільний маркетплейс',
    description: 'Купівля та продаж автомобілів. Найбільший маркетплейс оголошень про авто.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoRia — Автомобільний маркетплейс',
    description: 'Купівля та продаж автомобілів.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
        {process.env.NEXT_PUBLIC_BACKEND_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_BACKEND_URL} />
          </>
        )}
        <link rel="preconnect" href="https://image.pollinations.ai" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.pollinations.ai" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}