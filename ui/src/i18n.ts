/**
 * i18n Configuration
 *
 * Configures react-i18next for internationalization.
 * Translations are loaded from the shared locales directory (internal/i18n/locales).
 *
 * Supported languages:
 * - English (en) - default
 * - Spanish (es)
 *
 * Usage in components:
 * ```tsx
 * import { useTranslation } from 'react-i18next';
 *
 * function MyComponent() {
 *   const { t } = useTranslation();
 *   return <button>{t('buttons.start')}</button>;
 * }
 * ```
 */

import enCli from '@locales/en/cli.json';
// Import English translations
import enCommon from '@locales/en/common.json';
import enErrors from '@locales/en/errors.json';
import enModules from '@locales/en/modules.json';
import enParams from '@locales/en/params.json';
import enSettings from '@locales/en/settings.json';
import esCli from '@locales/es/cli.json';
// Import Spanish translations
import esCommon from '@locales/es/common.json';
import esErrors from '@locales/es/errors.json';
import esModules from '@locales/es/modules.json';
import esParams from '@locales/es/params.json';
import esSettings from '@locales/es/settings.json';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Merge all translation files into single resource objects
const resources = {
  en: {
    translation: {
      ...enCommon,
      errors: enErrors,
      modules: enModules,
      settings: enSettings,
      cli: enCli,
      params: enParams,
    },
  },
  es: {
    translation: {
      ...esCommon,
      errors: esErrors,
      modules: esModules,
      settings: esSettings,
      cli: esCli,
      params: esParams,
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],

    // Detection options
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'stem-language',
    },

    interpolation: {
      // React already escapes values
      escapeValue: false,
    },

    // Debug mode in development
    debug: import.meta.env.DEV,
  });

export default i18n;

export type { TFunction } from 'i18next';
// Re-export for convenience
export { useTranslation } from 'react-i18next';
