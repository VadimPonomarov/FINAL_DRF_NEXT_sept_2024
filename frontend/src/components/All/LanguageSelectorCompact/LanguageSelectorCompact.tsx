"use client";

import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/common/constants/constants';

/**
 * Компактный селектор языков в стиле бейджей
 * Интегрируется в карточку с AuthBadge и RedisUserBadge
 */
const LanguageSelectorCompact: React.FC = () => {
  const { locale, setLocale, availableLocales, t } = useI18n();
  const { provider } = useAuthProvider();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = availableLocales.find(l => l.code === locale);

  // Скрываем переключатель языка для Dummy провайдера
  if (provider === AuthProvider.Dummy) {
    return null;
  }

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-md border border-cyan-200 dark:border-cyan-700 transition-all duration-300 hover:shadow-md cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            {/* Иконка */}
            <Globe className="h-4 w-4 text-cyan-500 group-hover:scale-110 transition-transform duration-200" />
            
            {/* Информация о языке */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{currentLocale?.flag}</span>
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 truncate">
                  {currentLocale?.nativeName}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Language
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className="max-w-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl z-[9999999] p-0"
          sideOffset={8}
        >
          <div className="p-3">
            <div className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-500" />
              <span>{t('Language')}</span>
            </div>
            
            <div className="space-y-1">
              {availableLocales.map((localeOption) => (
                <button
                  key={localeOption.code}
                  onClick={() => handleLocaleChange(localeOption.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                    locale === localeOption.code
                      ? 'bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-lg">{localeOption.flag}</span>
                  <div className="flex-1 text-left">
                    <div className={`text-xs font-semibold ${
                      locale === localeOption.code
                        ? 'text-cyan-700 dark:text-cyan-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {localeOption.nativeName}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {localeOption.code.toUpperCase()}
                    </div>
                  </div>
                  {locale === localeOption.code && (
                    <Check className="h-4 w-4 text-cyan-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LanguageSelectorCompact;

