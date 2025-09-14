import { Inter } from "next/font/google";

export const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

// Используем системные моноширинные шрифты вместо Geist Mono
export const geistMono = {
  variable: "--font-geist-mono",
  style: {
    fontFamily: "'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace",
  },
};
