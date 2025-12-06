/**
 * Translation types for the application
 * Basic type definitions for translation keys
 */

export interface TranslationKeys {
  // Basic navigation
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.edit': string;
  'common.create': string;
  'common.search': string;
  'common.filter': string;
  
  // AutoRia specific
  'autoria.title': string;
  'autoria.createAd': string;
  'autoria.editAd': string;
  'autoria.myAds': string;
  'autoria.search': string;
  'autoria.favorites': string;
  'autoria.profile': string;
  'autoria.analytics': string;
  'autoria.moderation': string;
  
  // Auth
  'auth.login': string;
  'auth.logout': string;
  'auth.signin': string;
  'auth.register': string;
  
  // Navigation
  'nav.home': string;
  'nav.dashboard': string;
  'nav.profile': string;
  'nav.settings': string;
  
  // Add more as needed
  [key: string]: string;
}
