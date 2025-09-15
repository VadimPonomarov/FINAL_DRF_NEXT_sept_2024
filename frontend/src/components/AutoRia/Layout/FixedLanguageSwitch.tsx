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
    <div className="fixed top-[110px] right-2 z-[9999] hidden md:block">
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {isExpanded ? (
          // Развернутый вид
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600 font-medium">
                {t('Language')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              {availableLocales.map((localeOption) => (
                <Button
                  key={localeOption.code}
                  variant={locale === localeOption.code ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setLocale(localeOption.code);
                    setIsExpanded(false);
                  }}
                  className={`h-8 px-3 justify-start text-xs font-medium transition-all duration-200 ${
                    locale === localeOption.code
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{localeOption.flag}</span>
                  <span className="mr-2">{localeOption.code.toUpperCase()}</span>
                  <span className="text-xs opacity-75">{localeOption.nativeName}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          // Свернутый вид
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="h-10 px-3 flex items-center gap-2 hover:bg-slate-50 text-xs"
            title={`${t('Language')}: ${currentLocale?.nativeName}`}
          >
            <span className="text-base">{currentLocale?.flag}</span>
            <span className="text-xs font-medium text-slate-700">
              {locale.toUpperCase()}
            </span>
            <ChevronUp className="h-3 w-3 text-slate-400" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FixedLanguageSwitch;
