"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import { Locale } from '@/lib/i18n';

export const QuickLanguageSwitch: React.FC = () => {
  const { locale, setLocale, availableLocales } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {availableLocales.map((localeOption) => (
        <Button
          key={localeOption.code}
          variant={locale === localeOption.code ? "default" : "ghost"}
          size="sm"
          onClick={() => setLocale(localeOption.code)}
          className={`h-8 px-2 text-xs font-medium ${
            locale === localeOption.code 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="mr-1">{localeOption.flag}</span>
          {localeOption.code.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

export default QuickLanguageSwitch;
