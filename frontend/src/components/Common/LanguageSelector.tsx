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
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Locale } from '@/lib/i18n';

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
            className={`h-8 px-2 ${className}`}
          >
            {showFlag && <span className="mr-1">{localeConfig.flag}</span>}
            <span className="text-xs font-medium uppercase">{locale}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {availableLocales.map((localeOption) => (
            <DropdownMenuItem
              key={localeOption.code}
              onClick={() => handleLocaleChange(localeOption.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center">
                {showFlag && <span className="mr-2">{localeOption.flag}</span>}
                <span className="text-sm">{localeOption.nativeName}</span>
              </div>
              {locale === localeOption.code && (
                <Check className="h-4 w-4 text-green-600" />
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
            className={`h-8 w-8 p-0 ${className}`}
            title={t('common.select') + ' ' + t('navigation.language')}
          >
            {showFlag ? (
              <span className="text-lg">{localeConfig.flag}</span>
            ) : (
              <Globe className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableLocales.map((localeOption) => (
            <DropdownMenuItem
              key={localeOption.code}
              onClick={() => handleLocaleChange(localeOption.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center">
                <span className="mr-3 text-lg">{localeOption.flag}</span>
                <div>
                  <div className="text-sm font-medium">{localeOption.nativeName}</div>
                  <div className="text-xs text-slate-500">{localeOption.name}</div>
                </div>
              </div>
              {locale === localeOption.code && (
                <Check className="h-4 w-4 text-green-600" />
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
          className={`flex items-center gap-2 ${className}`}
        >
          {showFlag && <span>{localeConfig.flag}</span>}
          <div className="flex flex-col items-start">
            {showNativeName && (
              <span className="text-sm font-medium">{localeConfig.nativeName}</span>
            )}
            <span className="text-xs text-slate-500 uppercase">{locale}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
          {t('common.select')} язык
        </div>
        {availableLocales.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption.code}
            onClick={() => handleLocaleChange(localeOption.code)}
            className="flex items-center justify-between cursor-pointer py-2"
          >
            <div className="flex items-center">
              <span className="mr-3 text-lg">{localeOption.flag}</span>
              <div>
                <div className="text-sm font-medium">{localeOption.nativeName}</div>
                <div className="text-xs text-slate-500">{localeOption.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {locale === localeOption.code && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    Активный
                  </Badge>
                  <Check className="h-4 w-4 text-green-600" />
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
