"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Database, CheckCircle2 } from 'lucide-react';
import { useRedisAuth } from '@/contexts/RedisAuthContext';
import { useAuthProvider } from '@/contexts/AuthProviderContext';

/**
 * Компактный компонент отображения пользователя из Redis
 * Уменьшенная версия в 2 раза
 */
export const RedisUserBadge = () => {
  const { redisAuth, isLoading } = useRedisAuth();
  const { provider } = useAuthProvider();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded border border-blue-200 dark:border-blue-800 transition-all duration-300">
        <Database className="h-3 w-3 text-blue-500 animate-pulse" />
        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">...</span>
      </div>
    );
  }

  if (!redisAuth?.user) {
    return null;
  }

  const user = redisAuth.user;
  const hasTokens = !!(redisAuth.access && redisAuth.refresh);
  
  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.username || user.email || 'Unknown';

  const getRoleBadge = () => {
    if (user.is_superuser) {
      return {
        icon: <Shield className="h-2.5 w-2.5" />,
        label: 'Superuser',
        gradient: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
        border: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-400',
        iconColor: 'text-red-500'
      };
    }
    if (user.is_staff) {
      return {
        icon: <Shield className="h-2.5 w-2.5" />,
        label: 'Staff',
        gradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-700 dark:text-orange-400',
        iconColor: 'text-orange-500'
      };
    }
    return {
      icon: null,
      label: 'User',
      gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      iconColor: 'text-emerald-500'
    };
  };

  const roleBadge = getRoleBadge();
  const providerName = provider === 'dummy' ? 'Dummy' : 'Backend';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r ${roleBadge.gradient} rounded border ${roleBadge.border} transition-all duration-300 hover:shadow-md cursor-pointer group`}>
            <Database className={`h-3 w-3 ${roleBadge.iconColor} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {roleBadge.icon && (
                  <span className={roleBadge.iconColor}>{roleBadge.icon}</span>
                )}
                <span className={`text-[10px] font-semibold ${roleBadge.textColor} truncate`}>
                  {displayName}
                </span>
                {hasTokens && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl z-[9999999]">
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-1.5 flex items-center gap-1.5">
              <Database className="h-3 w-3 text-blue-500" />
              <span>Redis ({providerName})</span>
            </div>
            
            {user.email && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Email:</span>
                <span className="text-gray-900 dark:text-gray-100 text-right break-all text-[10px]">{user.email}</span>
              </div>
            )}
            
            {user.username && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Username:</span>
                <span className="text-gray-900 dark:text-gray-100 text-right text-[10px]">{user.username}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center gap-3">
              <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Role:</span>
              <div className="flex items-center gap-1">
                {roleBadge.icon}
                <span className={`text-[9px] font-semibold ${roleBadge.textColor}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-3">
              <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px]">Tokens:</span>
              <span className={`text-[9px] font-semibold ${
                hasTokens ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {hasTokens ? '✓ Active' : '✗ Missing'}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
