"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Получаем callbackUrl из параметров запроса
    const callbackUrl = searchParams.get('callbackUrl');

    if (callbackUrl) {
      // Если есть callbackUrl, перенаправляем на встроенную страницу NextAuth signin с этим параметром
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else {
      // Если нет callbackUrl, перенаправляем на встроенную страницу NextAuth signin
      router.push('/api/auth/signin');
    }
  }, [router, searchParams]);

  return null; // or a loading spinner
}
