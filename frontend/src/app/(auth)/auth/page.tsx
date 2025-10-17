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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Перенаправление на страницу авторизации...</p>
      </div>
    </div>
  );
}
