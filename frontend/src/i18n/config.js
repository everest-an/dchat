/**
 * i18n Configuration
 * 
 * Configures i18next for multi-language support in the dchat.pro frontend.
 * Supports 8 major languages with automatic detection and fallback.
 * 
 * Supported Languages:
 * - English (en)
 * - Chinese Simplified (zh-CN)
 * - Chinese Traditional (zh-TW)
 * - Spanish (es)
 * - Arabic (ar) - RTL support
 * - Russian (ru)
 * - Japanese (ja)
 * - Korean (ko)
 * 
 * Author: Manus AI
 * Date: 2024-11-05
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enTranslation from './locales/en/translation.json';
import zhCNTranslation from './locales/zh-CN/translation.json';
import zhTWTranslation from './locales/zh-TW/translation.json';
import esTranslation from './locales/es/translation.json';
import arTranslation from './locales/ar/translation.json';
import ruTranslation from './locales/ru/translation.json';
import jaTranslation from './locales/ja/translation.json';
import koTranslation from './locales/ko/translation.json';

// Language configurations
export const languages = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  'zh-CN': { name: 'Chinese Simplified', nativeName: '简体中文', dir: 'ltr' },
  'zh-TW': { name: 'Chinese Traditional', nativeName: '繁體中文', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
};

// Get default language from browser or localStorage
const getDefaultLanguage = () => {
  // Check localStorage first
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && languages[savedLanguage]) {
    return savedLanguage;
  }

  // Check browser language
  const browserLanguage = navigator.language || navigator.userLanguage;
  
  // Try exact match
  if (languages[browserLanguage]) {
    return browserLanguage;
  }

  // Try language code only (e.g., 'zh' from 'zh-CN')
  const languageCode = browserLanguage.split('-')[0];
  const matchingLanguage = Object.keys(languages).find(
    (lang) => lang.startsWith(languageCode)
  );

  return matchingLanguage || 'en'; // Fallback to English
};

// Initialize i18next
i18n
  // Load translation using http backend
  // .use(Backend) // Uncomment if loading translations from server
  
  // Detect user language
  .use(LanguageDetector)
  
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  
  // Initialize i18next
  .init({
    // Resources (translations)
    resources: {
      en: { translation: enTranslation },
      'zh-CN': { translation: zhCNTranslation },
      'zh-TW': { translation: zhTWTranslation },
      es: { translation: esTranslation },
      ar: { translation: arTranslation },
      ru: { translation: ruTranslation },
      ja: { translation: jaTranslation },
      ko: { translation: koTranslation },
    },

    // Default language
    lng: getDefaultLanguage(),

    // Fallback language
    fallbackLng: 'en',

    // Debug mode (disable in production)
    debug: import.meta.env.DEV,

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache user language
      caches: ['localStorage'],
      
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
    },

    // React options
    react: {
      // Wait for translations to load before rendering
      useSuspense: true,
      
      // Bind i18n to React component lifecycle
      bindI18n: 'languageChanged loaded',
      
      // Bind i18n store to React component lifecycle
      bindI18nStore: 'added removed',
      
      // Use <Trans> component for complex translations
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    // Namespace options
    ns: ['translation'], // Default namespace
    defaultNS: 'translation',

    // Key separator (use '.' for nested keys)
    keySeparator: '.',

    // Context separator
    contextSeparator: '_',

    // Plural separator
    pluralSeparator: '_',
  });

// Set HTML dir attribute based on language
i18n.on('languageChanged', (lng) => {
  const dir = languages[lng]?.dir || 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
});

// Set initial dir attribute
const initialDir = languages[i18n.language]?.dir || 'ltr';
document.documentElement.setAttribute('dir', initialDir);
document.documentElement.setAttribute('lang', i18n.language);

export default i18n;
