"use client";

import { usePathname } from 'next/navigation';
import type { CurrentAutoRiaPage } from './layout.types';

export const useCurrentPage = (): CurrentAutoRiaPage => {
  const pathname = usePathname();

  if (pathname === '/autoria') return 'home';
  if (pathname.includes('/search')) return 'search';
  if (pathname.includes('/create-ad')) return 'create-ad';
  if (pathname.includes('/favorites')) return 'favorites';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/moderation')) return 'moderation';
  if (pathname.includes('/profile')) return 'profile';
  return undefined;
};
