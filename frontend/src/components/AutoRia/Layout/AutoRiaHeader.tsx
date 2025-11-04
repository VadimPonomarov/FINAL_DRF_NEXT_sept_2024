"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Plus,
  Search,
  BarChart3,
  User,
  Home,
  Shield
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useRedisAuth } from '@/contexts/RedisAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface AutoRiaHeaderProps {
  currentPage?: string;
}

const AutoRiaHeader: React.FC<AutoRiaHeaderProps> = ({ currentPage }) => {
  const { t, locale, setLocale, availableLocales } = useI18n();

  // ╨Я╨╛╨╗╤Г╤З╨░╨╡╨╝ ╨┤╨░╨╜╨╜╤Л╨╡ ╨╕╨╖ Redis (╤В╨╛╤В ╨╢╨╡ ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║, ╤З╤В╨╛ ╨╕ ╨▒╨╡╨╣╨┤╨╢)
  const { redisAuth } = useRedisAuth();

  // ╨Ю╤В╨╗╨░╨┤╨╛╤З╨╜╨░╤П ╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П ╨┐╤А╨╕ ╨║╨░╨╢╨┤╨╛╨╝ ╤А╨╡╨╜╨┤╨╡╤А╨╡
  if (typeof window !== 'undefined') {
    window.console.log('[AutoRiaHeader] Component render:', {
      currentPage,
      redisAuth,
      user: redisAuth?.user,
      timestamp: new Date().toISOString()
    });
  }

  // ╨Э╨░╨╣╨┤╨╡╨╝ ╤В╨╡╨║╤Г╤Й╤Г╤О ╨╗╨╛╨║╨░╨╗╤М ╨┤╨╗╤П ╨╛╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П
  const currentLocale = availableLocales.find(l => l.code === locale);

  // ╨Я╤А╨╛╨▓╨╡╤А╤П╨╡╨╝, ╤П╨▓╨╗╤П╨╡╤В╤Б╤П ╨╗╨╕ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Б╤Г╨┐╨╡╤А╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╡╨╝ (╨╕╨╖ Redis, ╨║╨░╨║ ╨▓ ╨▒╨╡╨╣╨┤╨╢╨╡)
  const isSuperUser = React.useMemo(() => {
    const isSuper = redisAuth?.user?.is_superuser || false;

    // ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ ╨╛╤В╨╗╨░╨┤╨╛╤З╨╜╤Г╤О ╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤О
    if (typeof window !== 'undefined') {
      window.console.log('[AutoRiaHeader] Checking superuser status from Redis:', {
        redisAuth,
        user: redisAuth?.user,
        is_superuser: redisAuth?.user?.is_superuser,
        finalResult: isSuper
      });
    }

    return isSuper;
  }, [redisAuth]);

  // роверяем, является ли пользователь модератором
  const isModerator = React.useMemo(() => {
    // @ts-ignore
    const isMod = redisAuth?.user?.groups?.some((g: any) => g.name === 'Moderators') || false;
    if (typeof window !== 'undefined') {
      window.console.log('[AutoRiaHeader] isModerator:', isMod);
    }
    return isMod;
  }, [redisAuth]);

  // ╨Я╤А╨╛╨▓╨╡╤А╤П╨╡╨╝, ╤П╨▓╨╗╤П╨╡╤В╤Б╤П ╨╗╨╕ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨┐╤А╨╡╨╝╨╕╤Г╨╝ ╨╕╨╗╨╕ ╤Б╤Г╨┐╨╡╤А╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╡╨╝
  const isPremiumUser = React.useMemo(() => {
    // ╨б╤Г╨┐╨╡╤А╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╕ ╨╕╨╝╨╡╤О╤В ╨┤╨╛╤Б╤В╤Г╨┐ ╨║ ╨░╨╜╨░╨╗╨╕╤В╨╕╨║╨╡ ╨╜╨╡╨╖╨░╨▓╨╕╤Б╨╕╨╝╨╛ ╨╛╤В ╨░╨║╨║╨░╤Г╨╜╤В╨░
    if (isSuperUser) return true;

    // ╨Ф╨╗╤П ╨╛╨▒╤Л╤З╨╜╤Л╤Е ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╡╨╣ - ╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╤Б╤З╨╕╤В╨░╨╡╨╝ ╤З╤В╨╛ ╨▓╤Б╨╡ ╨┐╤А╨╡╨╝╨╕╤Г╨╝
    // TODO: ╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М ╨┐╤А╨╛╨▓╨╡╤А╨║╤Г ╤В╨╕╨┐╨░ ╨░╨║╨║╨░╤Г╨╜╤В╨░ ╨║╨╛╨│╨┤╨░ ╨▒╤Г╨┤╨╡╤В ╨┤╨╛╤Б╤В╤Г╨┐╨╜╨╛
    return true;
  }, [isSuperUser]);

  // ╨С╨░╨╖╨╛╨▓╤Л╨╡ ╨┐╤Г╨╜╨║╤В╤Л ╨╝╨╡╨╜╤О (╨┤╨╛╤Б╤В╤Г╨┐╨╜╤Л ╨▓╤Б╨╡╨╝)
  const baseNavigationItems = [
    {
      href: '/autoria',
      label: t('navigation.home'),
      icon: <Home className="h-4 w-4" />,
      id: 'home'
    },
    {
      href: '/autoria/search',
      label: t('navigation.search'),
      icon: <Search className="h-4 w-4" />,
      id: 'search'
    },
    {
      href: '/autoria/my-ads',
      label: t('navigation.myAds'),
      icon: <Car className="h-4 w-4" />,
      id: 'my-ads'
    }
  ];

  // ╨Я╤Г╨╜╨║╤В ╨░╨╜╨░╨╗╨╕╤В╨╕╨║╨╕ (╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨┐╤А╨╡╨╝╨╕╤Г╨╝ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╡╨╣)
  const analyticsItem = {
    href: '/autoria/analytics',
    label: t('navigation.analytics'),
    icon: <BarChart3 className="h-4 w-4" />,
    id: 'analytics',
    badge: <Badge variant="secondary" className="ml-1 text-xs premium-badge">{t('autoria.premium')}</Badge>
  };

  // ╨Я╤Г╨╜╨║╤В ╨╝╨╛╨┤╨╡╤А╨░╤Ж╨╕╨╕ (╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╤Б╤Г╨┐╨╡╤А╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╨╡╨╣ ╨╕ ╨╝╨╛╨┤╨╡╤А╨░╤В╨╛╤А╨╛╨▓)
  const moderationItem = {
    href: '/autoria/moderation',
    label: 'Модерація',
    icon: <Shield className="h-4 w-4" />,
    id: 'moderation',
    badge: <Badge variant="destructive" className="ml-1 text-xs">ADMIN</Badge>
  };

  // ╨Я╤Г╨╜╨║╤В ╨┐╤А╨╛╤Д╨╕╨╗╤П (╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜ ╨▓╤Б╨╡╨╝)
  const profileItem = {
    href: '/autoria/profile',
    label: t('navigation.profile'),
    icon: <User className="h-4 w-4" />,
    id: 'profile'
  };

  // ╨д╨╛╤А╨╝╨╕╤А╤Г╨╡╨╝ ╨╕╤В╨╛╨│╨╛╨▓╤Л╨╣ ╨╝╨░╤Б╤Б╨╕╨▓ ╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╨╕
  const navigationItems = [
    ...baseNavigationItems,
    analyticsItem, // ╨Т╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░ ╨▓╤Б╨╡╨╝
    ...(isSuperUser ? [moderationItem] : []), // ╨в╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╤Б╤Г╨┐╨╡╤А╤О╨╖╨╡╤А╨╛╨▓ ╨╕ ╨╝╨╛╨┤╨╡╤А╨░╤В╨╛╤А╨╛╨▓
    profileItem
  ];

  // ╨Ю╤В╨╗╨░╨┤╨╛╤З╨╜╨░╤П ╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П ╨┤╨╗╤П ╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╨╕
  console.log('[AutoRiaHeader] Navigation items:', {
    baseNavigationItems: baseNavigationItems.length,
    isPremiumUser,
    isSuperUser,
    hasAnalytics: isPremiumUser,
    hasModeration: isSuperUser,
    totalItems: navigationItems.length,
    navigationItems: navigationItems.map(item => ({ id: item.id, label: item.label }))
  });

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/autoria" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('autoria.title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 hidden sm:block">
                {t('autoria.subtitle')}
              </p>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={currentPage === item.id ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 relative overflow-visible px-4 py-2 rounded-md transition-all hover:scale-105"
                >
                  {item.icon}
                  <span className="hidden xl:inline">{item.label}</span>
                  {/* @ts-ignore */}
                  {item.badge}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Side - Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Mobile Language Selector */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs">{currentLocale?.flag || 'ЁЯМР'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableLocales.map((localeOption) => (
                    <DropdownMenuItem
                      key={localeOption.code}
                      onClick={() => setLocale(localeOption.code as any)}
                      className={locale === localeOption.code ? 'bg-accent' : ''}
                    >
                      {localeOption.flag} {localeOption.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button variant="outline" size="sm">
                <Car className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-slate-200 dark:border-gray-700 py-2">
          <div className="flex items-center justify-between overflow-x-auto">
            {navigationItems.slice(0, 4).map((item) => (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={currentPage === item.id ? "default" : "ghost"}
                  size="sm"
                  className="flex flex-col items-center gap-1 min-w-[60px] h-auto py-2 px-3 rounded-md transition-all"
                >
                  {item.icon}
                  <span className="text-xs">{item.label.split(' ')[0]}</span>
                  {/* @ts-ignore */}
                  {item.badge}
                </Button>
              </Link>
            ))}

            {/* Mobile Language Selector in Navigation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col items-center gap-1 min-w-[60px] h-auto py-2"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">{currentLocale?.flag || 'ЁЯМР'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableLocales.map((localeOption) => (
                  <DropdownMenuItem
                    key={localeOption.code}
                    onClick={() => setLocale(localeOption.code as any)}
                    className={locale === localeOption.code ? 'bg-accent' : ''}
                  >
                    {localeOption.flag} {localeOption.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AutoRiaHeader;
