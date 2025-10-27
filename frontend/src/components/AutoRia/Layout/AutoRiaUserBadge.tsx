"use client";

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { User, Crown } from 'lucide-react';

/**
 * Бейдж с информацией о залогиненном пользователе AutoRia
 * Показывается после успешной авторизации в контексте AutoRia
 */
const AutoRiaUserBadge: React.FC = () => {
  const { user, isAuthenticated } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();

  // Если пользователь не авторизован, не показываем бейдж
  if (!isAuthenticated || !user) {
    return null;
  }

  // Определяем тип аккаунта
  const accountType = userProfileData?.account?.account_type?.toUpperCase() || 'BASIC';
  const isPremium = ['PREMIUM', 'VIP'].includes(accountType);
  
  // Имя пользователя или email
  const displayName = user.username || user.email || 'User';
  
  // Определяем полномочия пользователя
  const isSuperuser = user?.is_superuser || userProfileData?.user?.is_superuser || false;
  const isStaff = user?.is_staff || userProfileData?.user?.is_staff || false;
  const isModerator = userProfileData?.user?.groups?.some((g: any) => g.name === 'Moderators') || false;
  
  // Собираем список ролей
  const roles = [];
  if (isSuperuser) roles.push('Суперадміністратор');
  if (isStaff && !isSuperuser) roles.push('Співробітник');
  if (isModerator && !isSuperuser) roles.push('Модератор');
  if (isPremium) roles.push(`${accountType} акаунт`);
  if (roles.length === 0) roles.push('Користувач');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isPremium ? "default" : "secondary"}
            className={`cursor-pointer hover:shadow-md transition-all ${
              isPremium 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Link href="/autoria/profile" className="flex items-center gap-1.5 px-2 py-1">
              {isPremium ? (
                <Crown className="h-3.5 w-3.5" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">{displayName}</span>
            </Link>
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          align="end"
          className="max-w-[250px] p-3"
          sideOffset={5}
        >
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            
            <div className="border-t pt-2">
              <p className="text-xs font-medium mb-1">Полномочия:</p>
              <div className="flex flex-wrap gap-1">
                {roles.map((role, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      role.includes('Суперадміністратор')
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 font-bold'
                        : role.includes('Модератор')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : role.includes('Співробітник')
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                        : role.includes('PREMIUM') || role.includes('VIP')
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 font-bold'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground italic border-t pt-1">
              👉 Клік → Профіль
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AutoRiaUserBadge;

