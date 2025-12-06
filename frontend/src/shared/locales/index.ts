/**
 * Locales index file
 * Exports all translation files for easy importing
 */

import en from './en';
import ru from './ru';
import uk from './uk';

// Export individual translations
export { en, ru, uk };

// Export all translations as an object
export const translations = {
  en,
  ru,
  uk
};

// Export supported language codes
export const supportedLanguages = ['en', 'ru', 'uk'] as const;

// Export language metadata
export const languageMetadata = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  },
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false
  },
  uk: {
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    rtl: false
  }
} as const;

// Type definitions
export type SupportedLanguage = typeof supportedLanguages[number];
export type TranslationKeys = keyof typeof en;
export type Translations = typeof translations;
