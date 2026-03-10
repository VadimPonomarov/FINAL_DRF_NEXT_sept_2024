"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'icon-only';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'default',
  showFlag = true,
  showNativeName = true,
  className = '',
}) => {
  const { locale, localeConfig, setLocale, availableLocales, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  // Компактный вариант (только флаг и код)
  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 px-3 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-all duration-200 hover:scale-105",
              className
            )}
          >
            <div className="flex items-center gap-2">
              {showFlag && (
                <span className="text-sm shadow-sm">{localeConfig.flag}</span>
              )}
              <span className="text-sm font-medium">{locale}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-background/95 backdrop-blur-md border-border/50 shadow-lg"
        >
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Мова / Language
            </p>
          </div>
          {availableLocales.map((localeOption) => (
            <DropdownMenuItem
              key={localeOption.code}
              onClick={() => localeOption.code && handleLocaleChange(localeOption.code as Locale)}
              className={cn(
                "flex items-center justify-between cursor-pointer py-2.5 px-3 transition-colors",
                locale === localeOption.code && "bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                {showFlag && (
                  <span className="text-base">{localeOption.flag}</span>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{localeOption.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{localeOption.name}</span>
                </div>
              </div>
              {locale === localeOption.code && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Только иконка
  if (variant === 'icon-only') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 p-0 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:scale-105",
              className
            )}
            title={t('common.select') + ' ' + t('navigation.language')}
          >
            {showFlag ? (
              <span className="text-lg shadow-sm">{localeConfig.flag}</span>
            ) : (
              <Globe2 className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-background/95 backdrop-blur-md border-border/50 shadow-lg"
        >
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Мова / Language
            </p>
          </div>
          {availableLocales.map((localeOption) => (
            <DropdownMenuItem
              key={localeOption.code}
              onClick={() => localeOption.code && handleLocaleChange(localeOption.code as Locale)}
              className={cn(
                "flex items-center justify-between cursor-pointer py-3 px-3 transition-colors",
                locale === localeOption.code && "bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{localeOption.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{localeOption.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{localeOption.name}</span>
                </div>
              </div>
              {locale === localeOption.code && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Полный вариант по умолчанию
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-3 h-10 px-4 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-all duration-200 hover:scale-105",
            className
          )}
        >
          <div className="flex items-center gap-3">
            {showFlag && (
              <span className="text-lg shadow-sm">{localeConfig.flag}</span>
            )}
            <div className="flex flex-col items-start">
              {showNativeName && (
                <span className="text-sm font-medium text-foreground">{localeConfig.nativeName}</span>
              )}
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{locale}</span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-background/95 backdrop-blur-md border-border/50 shadow-lg"
      >
        <div className="px-3 py-2 border-b border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Оберіть мову / Select language
          </p>
        </div>
        {availableLocales.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption.code}
            onClick={() => localeOption.code && handleLocaleChange(localeOption.code as Locale)}
            className={cn(
              "flex items-center justify-between cursor-pointer py-3 px-3 transition-colors",
              locale === localeOption.code && "bg-accent/50"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{localeOption.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{localeOption.nativeName}</span>
                <span className="text-xs text-muted-foreground">{localeOption.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {locale === localeOption.code && (
                <>
                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    Активний
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                </>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
