"use client";

import React, { createContext, useContext } from 'react';
import { useAutoRiaAuth } from '@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/modules/autoria/shared/hooks/useUserProfileData';

interface RedisAuthContextType {
  redisAuth: {
    user: any | null;
    isAuthenticated: boolean;
  } | null;
}

const RedisAuthContext = createContext<RedisAuthContextType>({ redisAuth: null });

/**
 * Compatibility wrapper для старого кода, использующего RedisAuth
 * Использует современные useAutoRiaAuth и useUserProfileData внутри
 */
export const RedisAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();

  // Объединяем данные пользователя из обоих источников
  const combinedUser = user || userProfileData?.user 
    ? {
        ...user,
        ...userProfileData?.user,
        // Приоритет для is_superuser и is_staff из обоих источников
        is_superuser: user?.is_superuser || userProfileData?.user?.is_superuser || false,
        is_staff: user?.is_staff || userProfileData?.user?.is_staff || false,
      }
    : null;

  const redisAuth = {
    user: combinedUser,
    isAuthenticated,
  };

  // Отладочный вывод только при изменениях (убрано для производительности)
  // if (typeof window !== 'undefined' && combinedUser) {
  //   console.log('[RedisAuthContext] User data:', combinedUser);
  // }

  return (
    <RedisAuthContext.Provider value={{ redisAuth }}>
      {children}
    </RedisAuthContext.Provider>
  );
};

export const useRedisAuth = () => {
  return useContext(RedisAuthContext);
};

