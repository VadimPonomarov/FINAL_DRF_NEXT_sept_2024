/**
 * Internationalization (i18n) Library
 * Provides translation, formatting, and locale management functionality
 */

import { translations, supportedLanguages, languageMetadata } from '@/locales';

// Debug: Проверяем что русские переводы загружены
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[I18n Init] Checking translations...');
  console.log('[I18n Init] Available locales:', Object.keys(translations));
  console.log('[I18n Init] RU autoria.title:', translations.ru?.autoria?.title);
  console.log('[I18n Init] RU common.continue:', translations.ru?.common?.continue);
  console.log('[I18n Init] EN autoria.title:', translations.en?.autoria?.title);
}

// ============================================================================
// Type Definitions
// ============================================================================

export type Locale = typeof supportedLanguages[number];

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export type TranslationFunction = (
  key: string,
  paramsOrFallback?: Record<string, any> | string
) => string;

type NestedObject = { [key: string]: any };

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_LOCALE: Locale = 'ru';
export const LOCALES = [...supportedLanguages] as Locale[];

const LOCALE_STORAGE_KEY = 'app-locale';

// ============================================================================
// Locale Configuration
// ============================================================================

/**
 * Get configuration for a specific locale
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  const metadata = languageMetadata[locale];
  return {
    code: locale,
    name: metadata.name,
    nativeName: metadata.nativeName,
    flag: metadata.flag,
    rtl: metadata.rtl,
  };
}

/**
 * Get all available locale configurations
 */
export function getAllLocaleConfigs(): LocaleConfig[] {
  return LOCALES.map(locale => getLocaleConfig(locale));
}

// ============================================================================
// Storage Management
// ============================================================================

/**
 * Get stored locale from localStorage
 */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && LOCALES.includes(stored as Locale)) {
      console.log(`[i18n] Using stored locale: ${stored}`);
      return stored as Locale;
    }
  } catch (error) {
    console.error('Error reading locale from storage:', error);
  }

  // Try to detect browser language (но только если это поддерживаемый язык)
  // Для русскоязычного региона используем русский по умолчанию
  const browserLang = navigator.language.split('-')[0];
  if (LOCALES.includes(browserLang as Locale)) {
    console.log(`[i18n] Using browser language: ${browserLang}`);
    return browserLang as Locale;
  }

  console.log(`[i18n] Using default locale: ${DEFAULT_LOCALE}`);
  return DEFAULT_LOCALE;
}

/**
 * Store locale to localStorage
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.error('Error storing locale:', error);
  }
}

// ============================================================================
// Translation Functions
// ============================================================================

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
function getNestedValue(obj: NestedObject, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

/**
 * Replace placeholders in translation string
 * Example: replacePlaceholders('Hello {name}!', { name: 'John' }) => 'Hello John!'
 */
function replacePlaceholders(text: string, params: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Get translation for a specific locale and key
 */
export function getTranslation(
  locale: Locale,
  key: string,
  paramsOrFallback?: Record<string, any> | string
): string {
  // Get translation object for locale
  const localeTranslations = translations[locale];
  if (!localeTranslations) {
    console.warn(`[I18n] Locale ${locale} not found, using default locale ${DEFAULT_LOCALE}`);
    return getTranslation(DEFAULT_LOCALE, key, paramsOrFallback);
  }

  // Get translation value
  let translation = getNestedValue(localeTranslations, key);

  // Debug log for specific keys
  if (key.startsWith('autoria.') && process.env.NODE_ENV === 'development') {
    console.log(`[I18n] Key: "${key}", Locale: "${locale}", Translation: "${translation}"`);
  }

  // If translation not found, try fallback locale
  if (translation === undefined && locale !== DEFAULT_LOCALE) {
    console.warn(`[I18n] Translation "${key}" not found in "${locale}", trying ${DEFAULT_LOCALE}`);
    translation = getNestedValue(translations[DEFAULT_LOCALE], key);
  }

  // If still not found, use fallback or key
  if (translation === undefined) {
    if (typeof paramsOrFallback === 'string') {
      return paramsOrFallback;
    }
    console.warn(`[I18n] Translation key "${key}" not found for locale "${locale}"`);
    return key;
  }

  // Convert to string
  translation = String(translation);

  // Replace placeholders if params provided
  if (paramsOrFallback && typeof paramsOrFallback === 'object') {
    translation = replacePlaceholders(translation, paramsOrFallback);
  }

  return translation;
}

/**
 * Create a translation function for a specific locale
 */
export function createTranslationFunction(locale: Locale): TranslationFunction {
  return (key: string, paramsOrFallback?: Record<string, any> | string) => {
    return getTranslation(locale, key, paramsOrFallback);
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format number according to locale
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(value);
  }
}

/**
 * Format date according to locale
 */
export function formatDate(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'EUR' | 'UAH',
  locale: Locale = DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount}`;
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 604800) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return String(date);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

/**
 * Get locale from URL or other sources
 */
export function detectLocale(): Locale {
  // First, check localStorage
  const stored = getStoredLocale();
  if (stored) {
    return stored;
  }

  // Then check browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    if (isLocaleSupported(browserLang)) {
      return browserLang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Constants
  DEFAULT_LOCALE,
  LOCALES,

  // Locale functions
  getLocaleConfig,
  getAllLocaleConfigs,
  getStoredLocale,
  setStoredLocale,
  isLocaleSupported,
  detectLocale,

  // Translation functions
  getTranslation,
  createTranslationFunction,

  // Formatting functions
  formatNumber,
  formatDate,
  formatCurrency,
  formatRelativeTime,
};

