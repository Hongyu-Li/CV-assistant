import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import zh from './locales/zh.json'

// Ensure we initialize exactly once
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh }
  },
  lng: 'en', // Default, will be overridden by SettingsContext
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false // React already escapes by default
  }
})

export default i18n
