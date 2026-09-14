import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptPT from '../locales/pt-PT.json';
import enGB from '../locales/en-GB.json';
import {
  SUPPORTED_LANGUAGES,
  detectInitialLanguage,
  readStoredLanguage,
  storeLanguage,
  type Language,
} from './language';

const namespaces = Object.keys(ptPT);

i18n.use(initReactI18next).init({
  resources: { 'pt-PT': ptPT, 'en-GB': enGB },
  lng: readStoredLanguage() ?? detectInitialLanguage(),
  fallbackLng: 'pt-PT',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: namespaces,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function syncHtmlLang(lng: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
}
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

/** Explicit user choice: always wins over browser detection on later visits. */
export function chooseLanguage(lng: Language) {
  storeLanguage(lng);
  void i18n.changeLanguage(lng);
}

export function currentLanguage(): Language {
  return i18n.language === 'en-GB' ? 'en-GB' : 'pt-PT';
}

export default i18n;
