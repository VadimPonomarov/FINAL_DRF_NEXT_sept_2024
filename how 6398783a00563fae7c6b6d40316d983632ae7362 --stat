"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/common/constants/constants';

const FixedLanguageSwitch: React.FC = () => {
  const { locale, setLocale, availableLocales, t } = useI18n();
  const { provider } = useAuthProvider();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentLocale = availableLocales.find(l => l.code === locale);

  // Скрываем переключатель языка для Dummy провайдера
  if (provider === AuthProvider.Dummy) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-4 z-[9999]">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden transition-all duration-300">
        {isExpanded ? (
          // Развернутый вид - компактный
          <div className="p-1.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                {t('Language')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-4 w-4 p-0"
              >
                <ChevronDown className="h-2.5 w-2.5" />
              </Button>
            </div>
            <div className="flex flex-col gap-0.5">
              {availableLocales.map((localeOption) => (
                <Button
                  key={localeOption.code}
                  variant={locale === localeOption.code ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setLocale(localeOption.code);
                    setIsExpanded(false);
                  }}
                  className={`h-6 px-2 justify-start text-[10px] font-medium transition-all duration-200 ${
                    locale === localeOption.code
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-1.5 text-xs">{localeOption.flag}</span>
                  <span className="mr-1.5">{localeOption.code.toUpperCase()}</span>
                  <span className="text-[9px] opacity-75">{localeOption.nativeName}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          // Свернутый вид - компактный
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="h-6 px-2 flex items-center gap-1.5 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-gray-700 dark:hover:text-gray-100 text-[10px] transition-all duration-200"
            title={`${t('Language')}: ${currentLocale?.nativeName}`}
          >
            <span className="text-xs">{currentLocale?.flag}</span>
            <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {locale.toUpperCase()}
            </span>
            <ChevronUp className="h-2.5 w-2.5 text-slate-400" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FixedLanguageSwitch;
