"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Search,
  BarChart3,
  User,
  Home,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  Globe2
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useRedisAuth } from '@/contexts/RedisAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AutoRiaHeaderProps {
  currentPage?: string;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  id: string;
  priority: number;
  badge?: React.ReactNode;
}

const AutoRiaHeader: React.FC<AutoRiaHeaderProps> = ({ currentPage }) => {
  const { t, locale, setLocale, availableLocales } = useI18n();
  const { redisAuth } = useRedisAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // User permissions
  const isSuperUser = redisAuth?.user?.is_superuser || false;
  const isModerator = redisAuth?.user?.groups?.some((g: any) => g.name === 'Moderators') || false;
  const isPremiumUser = isSuperUser || true; // Temporary: all users are premium

  // Current locale
  const currentLocale = availableLocales.find(l => l.code === locale);

  // Core navigation items
  const coreNavigation: NavigationItem[] = [
    {
      href: '/autoria',
      label: t('navigation.home'),
      icon: <Home className="h-5 w-5" />,
      id: 'home',
      priority: 1
    },
    {
      href: '/autoria/search',
      label: t('navigation.search'),
      icon: <Search className="h-5 w-5" />,
      id: 'search',
      priority: 2
    },
    {
      href: '/autoria/my-ads',
      label: t('navigation.myAds'),
      icon: <Car className="h-5 w-5" />,
      id: 'my-ads',
      priority: 3
    }
  ];

  // Premium features
  const premiumNavigation: NavigationItem[] = [
    {
      href: '/autoria/analytics',
      label: t('navigation.analytics'),
      icon: <BarChart3 className="h-5 w-5" />,
      id: 'analytics',
      priority: 4,
      badge: <Badge variant="secondary" className="ml-2 text-xs font-medium">PRO</Badge>
    }
  ];

  // Admin features
  const adminNavigation: NavigationItem[] = [
    {
      href: '/autoria/moderation',
      label: 'Модерація',
      icon: <Shield className="h-5 w-5" />,
      id: 'moderation',
      priority: 5,
      badge: <Badge variant="destructive" className="ml-2 text-xs font-medium">ADMIN</Badge>
    }
  ];

  // Combine navigation based on permissions
  const allNavigation: NavigationItem[] = [
    ...coreNavigation,
    ...(isPremiumUser ? premiumNavigation : []),
    ...(isSuperUser ? adminNavigation : []),
    {
      href: '/autoria/profile',
      label: t('navigation.profile'),
      icon: <User className="h-5 w-5" />,
      id: 'profile',
      priority: 6
    }
  ].sort((a, b) => a.priority - b.priority);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <Link href="/autoria" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                <Car className="h-8 w-8 text-foreground drop-shadow-sm" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {t('autoria.title')}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t('autoria.subtitle')}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {allNavigation.map((item) => (
            <Link key={item.id} href={item.href}>
              <Button
                variant={currentPage === item.id ? "default" : "ghost"}
                size="sm"
                className="relative h-9 items-center gap-2 rounded-lg px-3 font-medium transition-all duration-200 hover:bg-accent/50"
              >
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
                {item.badge}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right Section - Language Selector */}
        <div className="flex items-center gap-2">
          {/* Language Selector - Desktop and Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg p-0">
                <Globe2 className="h-4 w-4" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {availableLocales.map((localeOption) => (
                <DropdownMenuItem
                  key={localeOption.code}
                  onClick={() => setLocale(localeOption.code as any)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2",
                    locale === localeOption.code && "bg-accent"
                  )}
                >
                  <span className="text-sm">{localeOption.flag}</span>
                  <span className="text-sm font-medium">{localeOption.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu - Desktop Only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:flex h-9 rounded-lg px-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden lg:block text-sm font-medium">
                    {redisAuth?.user?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem asChild>
                <Link href="/autoria/profile" className="flex cursor-pointer items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/autoria/settings" className="flex cursor-pointer items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex cursor-pointer items-center gap-2 text-red-600">
                <X className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="md:hidden h-9 w-9 rounded-lg p-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur md:hidden">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="grid gap-1 py-4">
              {allNavigation.map((item) => (
                <Link key={item.id} href={item.href} onClick={toggleMobileMenu}>
                  <Button
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start gap-3 h-12 rounded-lg px-3"
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                    {item.badge}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default AutoRiaHeader;
