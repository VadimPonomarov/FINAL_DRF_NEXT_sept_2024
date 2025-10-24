"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Crown } from "lucide-react";
import { ISession } from "@/common/interfaces/session.interfaces";

interface BackendUser {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  id?: number;
}

/**
 * AuthBadge - компактное отображение информации о пользователе из сессии
 * Уменьшенная версия в 2 раза
 */
const AuthBadge: React.FC = () => {
  const { data: session, status } = useSession();
  const sessionData = session as unknown as ISession;
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);

  useEffect(() => {
    const fetchBackendUser = async () => {
      try {
        const response = await fetch('/api/redis?key=backend_auth');
        if (response.ok) {
          const data = await response.json();
          if (data?.value) {
            const parsed = typeof data.value === 'string' 
              ? JSON.parse(data.value) 
              : data.value;
            if (parsed?.user) {
              setBackendUser(parsed.user);
            }
          }
        }
      } catch (error) {
        console.error('[AuthBadge] Error fetching backend user:', error);
      }
    };

    fetchBackendUser();

    const handleAuthDataChange = () => {
      fetchBackendUser();
    };

    window.addEventListener('authDataChanged', handleAuthDataChange);
    
    return () => {
      window.removeEventListener('authDataChanged', handleAuthDataChange);
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded border border-purple-200 dark:border-purple-700 transition-all duration-300">
        <User className="h-3 w-3 text-purple-400 animate-pulse" />
        <span className="text-[10px] font-medium text-purple-500 dark:text-purple-400">...</span>
      </div>
    );
  }

  const displayName = backendUser?.email 
    || backendUser?.username 
    || sessionData?.email 
    || "Guest";

  const userDetails = backendUser?.first_name && backendUser?.last_name
    ? `${backendUser.first_name} ${backendUser.last_name}`
    : displayName;

  const isAuthenticated = status === 'authenticated' || !!backendUser;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/profile">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all duration-300 hover:shadow-md cursor-pointer group ${
              isAuthenticated 
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700' 
                : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700'
            }`}>
              {isAuthenticated ? (
                <Crown className="h-3 w-3 text-purple-500 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
              ) : (
                <User className="h-3 w-3 text-gray-400 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-semibold truncate block ${
                  isAuthenticated 
                    ? 'text-purple-700 dark:text-purple-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {displayName}
                </span>
              </div>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl z-[9999999]">
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-1.5 flex items-center gap-1.5">
              <Crown className="h-3 w-3 text-purple-500" />
              <span>Session</span>
            </div>
            
            <div className="flex justify-between items-start gap-3">
              <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Display:</span>
              <span className="text-gray-900 dark:text-gray-100 text-right break-all text-[10px]">{userDetails}</span>
            </div>
            
            {backendUser?.email && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Email:</span>
                <span className="text-gray-900 dark:text-gray-100 text-right break-all text-[10px]">{backendUser.email}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center gap-3">
              <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Status:</span>
              <span className={`text-[9px] font-semibold ${
                isAuthenticated 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {isAuthenticated ? 'Authenticated' : 'Guest'}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AuthBadge;
