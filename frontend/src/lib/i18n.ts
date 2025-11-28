/**
 * Internationalization (i18n) Configuration
 * ========================================
 * Provides multi-language support for the application
 */

import { translations as localeTranslations } from '@/locales';

export type Locale = 'en' | 'uk' | 'ru';

export interface I18nConfig {
  defaultLocale: Locale;
  locales: Locale[];
  fallbackLocale: Locale;
}

export interface LocaleConfig {
  code?: string; // Optional code field for extended locale configs
  name: string;
  nativeName: string;
  flag: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  currencySymbol: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

export type TranslationFunction = (
  key: string,
  paramsOrFallback?: Record<string, any> | string,
) => string;

// Get supported locales in the current environment
function getSupportedLocales(): string[] {
  try {
    return Intl.getCanonicalLocales(['en', 'uk', 'ru']);
  } catch (error) {
    console.error('Error getting supported locales:', error);
    // Fallback to basic locales that should be supported everywhere
    return ['en', 'uk', 'ru'];
  }
}

// Filter locales to only include those supported by the environment
const allLocales = ['en', 'uk', 'ru'];
const supportedLocales = getSupportedLocales().filter(locale =>
  allLocales.includes(locale.split('-')[0])
);

// Ensure we have at least one valid locale
const finalLocales = supportedLocales.length > 0 ? supportedLocales : ['en'];
const finalDefaultLocale = finalLocales.includes('uk') ? 'uk' : finalLocales[0];

export const i18nConfig: I18nConfig = {
  defaultLocale: finalDefaultLocale as Locale,
  locales: finalLocales as Locale[],
  fallbackLocale: 'en',
};

// Constants for easier access
export const DEFAULT_LOCALE: Locale = i18nConfig.defaultLocale;
export const LOCALES: Locale[] = i18nConfig.locales;

// Use translations from locale files
const translations: Record<Locale, any> = localeTranslations as Record<Locale, any>;

/**
 * Get translation for a specific key and locale
 */
export function getTranslation(locale: Locale, key: string, paramsOrFallback?: any): string {
  const parts = key.split('.');
  const fallbackText: string | undefined = typeof paramsOrFallback === 'string' ? paramsOrFallback : undefined;
  const namedParams: Record<string, string | number> | undefined = paramsOrFallback && typeof paramsOrFallback === 'object' ? paramsOrFallback as Record<string, string | number> : undefined;

  const applyParams = (text: string): string => {
    if (!namedParams) return text;
    let out = text;
    for (const [paramKey, paramValue] of Object.entries(namedParams)) {
      out = out.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      out = out.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    }
    return out;
  };

  const traverse = (loc: Locale): string | undefined => {
    let cur: any = translations[loc];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        cur = undefined;
        break;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  };

  // 1) Nested path in current locale
  const nestedCurrent = traverse(locale);
  if (nestedCurrent) return applyParams(nestedCurrent);

  // 2) Direct dotted key in current locale (flat entries)
  const directCurrent = (translations[locale] as any)[key];
  if (typeof directCurrent === 'string') return applyParams(directCurrent);

  // 3) Nested path in fallback locale
  const nestedFallback = traverse(i18nConfig.fallbackLocale);
  if (nestedFallback) return applyParams(nestedFallback);

  // 4) Direct dotted key in fallback locale
  const directFallback = (translations[i18nConfig.fallbackLocale] as any)[key];
  if (typeof directFallback === 'string') return applyParams(directFallback);

  // 5) Fallback text or key
  return fallbackText ?? key;
}

/**
 * Translation hook-like function
 */
export function t(key: string, locale: Locale = i18nConfig.defaultLocale, params?: Record<string, string | number>): string {
  return getTranslation(locale, key, params);
}

/**
 * Get current locale from browser or default
 */
export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') {
    return i18nConfig.defaultLocale;
  }

  const stored = localStorage.getItem('locale');
  if (stored && isValidLocale(stored)) {
    return stored as Locale;
  }

  const browserLang = navigator.language.split('-')[0];
  if (isValidLocale(browserLang)) {
    return browserLang as Locale;
  }

  return i18nConfig.defaultLocale;
}

/**
 * Check if locale is valid
 */
export function isValidLocale(locale: string): boolean {
  return i18nConfig.locales.includes(locale as Locale);
}

/**
 * Get stored locale from localStorage
 */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return i18nConfig.defaultLocale;
  }

  const stored = localStorage.getItem('locale');
  return (stored && isValidLocale(stored)) ? stored as Locale : i18nConfig.defaultLocale;
}

/**
 * Set locale in localStorage
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

/**
 * Get locale configuration
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  const configs: Record<Locale, LocaleConfig> = {
    uk: {
      name: 'Ukrainian',
      nativeName: 'Українська',
      flag: '🇺🇦',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: 'HH:mm',
      currency: 'UAH',
      currencySymbol: '₴',
      numberFormat: {
        decimal: ',',
        thousands: ' ',
      },
    },
    en: {
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: 'h:mm a',
      currency: 'USD',
      currencySymbol: '$',
      numberFormat: {
        decimal: '.',
        thousands: ',',
      },
    },
    ru: {
      name: 'Russian',
      nativeName: 'Русский',
      flag: '🇷🇺',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: 'HH:mm',
      currency: 'RUB',
      currencySymbol: '₽',
      numberFormat: {
        decimal: ',',
        thousands: ' ',
      },
    },
  };

  return configs[locale];
}

/**
 * Format number according to locale
 */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date | string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(amount: number, currency: 'USD' | 'EUR' | 'UAH' | 'RUB', locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export default {
  config: i18nConfig,
  translations,
  getTranslation,
  t,
  getCurrentLocale,
  isValidLocale,
  getStoredLocale,
  setStoredLocale,
  getLocaleConfig,
  formatNumber,
  formatDate,
  formatCurrency,
  DEFAULT_LOCALE,
  LOCALES,
};
