"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useI18n } from '@/contexts/I18nContext';
import { User, Crown, X } from 'lucide-react';
import { cleanupBackendTokens } from '@/lib/auth/cleanupAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Бейдж з інформацією про залогіненого користувача AutoRia
 * Показується після успішної авторизації в контексті AutoRia
 * ВАЖЛИВО: Потрібна NextAuth сессія + backend токени
 */
const AutoRiaUserBadge: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const { user, isAuthenticated, hasBackendTokens, logout } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();
  const { toast } = useToast();

  // Відладка тільки при зміні статусу авторизації
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('[AutoRiaUserBadge] User authenticated:', {
        hasUser: !!user,
        hasProfileData: !!userProfileData,
        sessionStatus: status,
        hasBackendTokens,
      });
    }
  }, [isAuthenticated, status, hasBackendTokens]); // Тільки при зміні isAuthenticated!

  // КРИТИЧНО: Не показуємо бейдж якщо немає NextAuth сессії
  // Неможливо мати backend токени без NextAuth сессії
  if (status === 'loading') {
    return null; // Ще завантажується
  }
  
  // Если сессии нет или статус unauthenticated - скрываем бейдж
  if (status === 'unauthenticated' || !session) {
    return null; // Немає NextAuth сессії - не може бути backend токенів
  }

  // Показуємо бейдж ТІЛЬКИ якщо є backend токени
  // Проверяем что hasBackendTokens точно true
  if (hasBackendTokens !== true) {
    return null;
  }

  // Отримуємо дані користувача з доступних джерел
  const actualUser = user || userProfileData?.user;
  if (!actualUser) {
    return null;
  }

  // Визначаємо тип акаунту
  const accountType = userProfileData?.account?.account_type?.toUpperCase() || 'BASIC';
  const isPremium = ['PREMIUM', 'VIP'].includes(accountType);
  
  // Ім'я користувача - НЕ показуємо email (він вже в AuthBadge)
  const displayName = actualUser.username || 
                      (actualUser.first_name && actualUser.last_name 
                        ? `${actualUser.first_name} ${actualUser.last_name}` 
                        : actualUser.first_name || 'AutoRia');
  
  // Визначаємо повноваження користувача
  const isSuperuser = actualUser?.is_superuser || false;
  const isStaff = actualUser?.is_staff || false;
  const isModerator = actualUser?.groups?.some((g: any) => g.name === 'Moderators') || false;
  
  // Збираємо список ролей
  const roles = [];
  if (isSuperuser) roles.push('Суперадміністратор');
  if (isStaff && !isSuperuser) roles.push('Співробітник');
  if (isModerator && !isSuperuser) roles.push('Модератор');
  if (isPremium) roles.push(`${accountType} акаунт`);
  if (roles.length === 0) roles.push('Користувач');

  // Обробник LOGOUT (очистка Redis + localStorage, БЕЗ NextAuth сессії)
  const handleClearTokens = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      toast({
        title: `👋 ${t('common.success')}`,
        description: t('auth.loggingOut'),
        duration: 2000,
      });

      // LOGOUT: очищаємо лише Redis / backend токени (NextAuth сесія залишається)
      await cleanupBackendTokens();

      // Немедленно скрываем бейдж локально
      logout();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:signout', { detail: { clearCache: true } }));
      }

      // Короткая пауза для отображения тоста и редирект на /login
      const callbackUrl = '/login?message=' + encodeURIComponent(t('auth.tokensClearedPleaseLogin'));
      setTimeout(() => {
        router.push(callbackUrl);
      }, 400);
    } catch (error) {
      console.error('[AutoRiaUserBadge] Error during logout:', error);
      toast({
        title: `❌ ${t('common.error')}`,
        description: t('auth.failedToClearTokens'),
        variant: 'destructive',
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-pointer transition-all shadow-sm text-xs py-0.5 px-2 ${
              isPremium 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-yellow-600 hover:from-amber-500 hover:to-yellow-600 font-semibold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {/* Backend-tokens badge: do NOT redirect to profile on click */}
            <span className="flex items-center gap-1.5" role="button" tabIndex={0}>
              {isPremium ? (
                <Crown className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="text-xs">{displayName}</span>
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="end"
          className="max-w-[280px] p-3 z-[10000000] data-[align=end]:-translate-x-32"
          sideOffset={8}
          alignOffset={-130}
          avoidCollisions
          collisionPadding={{ top: 16, right: 24, bottom: 16, left: 16 }}
        >
          <div className="space-y-2">
            <div>
              <button
                type="button"
                onClick={() => router.push('/autoria/profile')}
                className="text-left w-full"
              >
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{actualUser.email}</p>
              </button>
            </div>
            
            <div className="border-t pt-2">
              <p className="text-xs font-medium mb-1">Повноваження:</p>
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
            
            {/* LOGOUT - очистка Redis токенів (NextAuth сессія залишається) */}
            <div className="border-t pt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Logout (Redis)</p>
              <button
                onClick={handleClearTokens}
                className="group p-1 hover:bg-red-500 dark:hover:bg-red-600 rounded transition-colors"
                title="Logout: очистити токени Redis (NextAuth сессія збережеться)"
              >
                <X className="h-4 w-4 text-red-600 dark:text-red-400 group-hover:text-white transition-colors" />
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground italic border-t pt-1">
              👉 Клік на бейдж → Профіль
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AutoRiaUserBadge;
