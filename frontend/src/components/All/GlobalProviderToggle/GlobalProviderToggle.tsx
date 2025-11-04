"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/shared/constants/constants';

/**
 * Глобальный тоглер для переключения между провайдерами аутентификации
 * Показывается на всех страницах для авторизованных пользователей
 * Имеет максимальный z-index для отображения поверх всех элементов
 */
const GlobalProviderToggle: React.FC = () => {
  const { data: session, status } = useSession();
  const { provider, setProvider } = useAuthProvider();

  // Показываем только для авторизованных пользователей
  if (status !== 'authenticated' || !session) {
    return null;
  }

  const handleToggle = async () => {
    const newProvider = provider === AuthProvider.Dummy ? AuthProvider.MyBackendDocs : AuthProvider.Dummy;
    console.log('[GlobalProviderToggle] Switching provider from', provider, 'to', newProvider);
    await setProvider(newProvider);
    console.log('[GlobalProviderToggle] Provider switched successfully');
  };

  return (
    <div 
      className="fixed top-[5px] right-[5px] z-[999999]"
      style={{ zIndex: 999999 }}
    >
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all cursor-pointer"
        title={`Current: ${provider === AuthProvider.Dummy ? 'Dummy' : 'Backend'} | Click to switch to ${provider === AuthProvider.Dummy ? 'Backend' : 'Dummy'}`}
      >
        <span className={`text-[8px] font-medium transition-colors ${provider === AuthProvider.Dummy ? 'text-white' : 'text-white/60'}`}>
          D
        </span>
        <div
          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
            provider === AuthProvider.MyBackendDocs
              ? 'bg-blue-600'
              : 'bg-gray-400'
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 transform rounded-full bg-white transition-transform ${
              provider === AuthProvider.MyBackendDocs ? 'translate-x-2' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className={`text-[8px] font-medium transition-colors ${provider === AuthProvider.MyBackendDocs ? 'text-white' : 'text-white/60'}`}>
          B
        </span>
      </button>
    </div>
  );
};

export default GlobalProviderToggle;
