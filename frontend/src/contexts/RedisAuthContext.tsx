"use client";

import React, { createContext, useContext } from 'react';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';

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

  const redisAuth = {
    user: user || userProfileData?.user || null,
    isAuthenticated,
  };

  return (
    <RedisAuthContext.Provider value={{ redisAuth }}>
      {children}
    </RedisAuthContext.Provider>
  );
};

export const useRedisAuth = () => {
  return useContext(RedisAuthContext);
};

