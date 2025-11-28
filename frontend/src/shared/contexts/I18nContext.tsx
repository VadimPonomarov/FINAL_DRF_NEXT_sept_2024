"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Locale,
  LocaleConfig,
  TranslationFunction,
  DEFAULT_LOCALE,
  getTranslation,
  getLocaleConfig,
  getStoredLocale,
  setStoredLocale,
  formatNumber,
  formatDate,
  formatCurrency,
  LOCALES
} from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  localeConfig: LocaleConfig;
  setLocale: (locale: Locale) => void;
  t: TranslationFunction;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency: 'USD' | 'EUR' | 'UAH') => string;
  availableLocales: LocaleConfig[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLocale
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализация языка при монтировании
  useEffect(() => {
    try {
      if (!initialLocale) {
        const storedLocale = getStoredLocale();
        setLocaleState(storedLocale);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing I18n:', error);
      // Fallback to default locale
      setLocaleState(DEFAULT_LOCALE);
      setIsInitialized(true);
    }
  }, [initialLocale]);

  // Функция для изменения языка
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
    
    // Обновляем атрибут lang в HTML
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  };

  // Функция перевода
  // Accept either a params object or a fallback string as the second argument
  const t: any = (key: string, paramsOrFallback?: any) => {
    try {
      return getTranslation(locale, key, paramsOrFallback);
    } catch (error) {
      console.error('Error in translation function:', error, 'key:', key, 'locale:', locale);
      return typeof paramsOrFallback === 'string' ? paramsOrFallback : key; // Fallback to provided text or key
    }
  };

  // Локализованные функции форматирования
  const localizedFormatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return formatNumber(value, locale, options);
  };

  const localizedFormatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    return formatDate(date, locale, options);
  };

  const localizedFormatCurrency = (amount: number, currency: 'USD' | 'EUR' | 'UAH') => {
    return formatCurrency(amount, currency, locale);
  };

  // Получение конфигурации текущего языка
  const localeConfig = getLocaleConfig(locale);

  // Список доступных языков с их конфигурациями
  const availableLocales = LOCALES.map(locale => ({
    code: locale,
    ...getLocaleConfig(locale)
  }));

  // Показываем загрузку до инициализации
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  let contextValue: I18nContextType;
  try {
    contextValue = {
      locale,
      localeConfig,
      setLocale,
      t,
      formatNumber: localizedFormatNumber,
      formatDate: localizedFormatDate,
      formatCurrency: localizedFormatCurrency,
      availableLocales,
    };
  } catch (error) {
    console.error('Error creating I18n context value:', error);
    // Create a minimal fallback context
    contextValue = {
      locale: DEFAULT_LOCALE,
      localeConfig: getLocaleConfig(DEFAULT_LOCALE),
      setLocale: () => {},
      t: (key: string) => key,
      formatNumber: (value: number) => value.toString(),
      formatDate: (date: Date | string) => date.toString(),
      formatCurrency: (amount: number, currency: string) => `${currency}${amount}`,
      availableLocales: LOCALES.map(locale => ({
        code: locale,
        ...getLocaleConfig(locale)
      })),
    };
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// Хук для использования контекста
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Хук только для функции перевода (для удобства)
export const useTranslation = (): TranslationFunction => {
  const { t } = useI18n();
  return t;
};

// Хук для форматирования
export const useFormatting = () => {
  const { formatNumber, formatDate, formatCurrency, locale } = useI18n();
  return { formatNumber, formatDate, formatCurrency, locale };
};
