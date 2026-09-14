export const SUPPORTED_LANGUAGES = ['pt-PT', 'en-GB'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'lang';

/**
 * First-visit language: pt-PT when the browser's main language is any
 * Portuguese variant (pt, pt-PT, pt-BR…), en-GB for everything else.
 */
export function detectInitialLanguage(languages?: readonly string[], language?: string): Language {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const main = (languages?.[0] ?? language ?? nav?.languages?.[0] ?? nav?.language ?? '').toLowerCase();
  return main === 'pt' || main.startsWith('pt-') || main.startsWith('pt_') ? 'pt-PT' : 'en-GB';
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function readStoredLanguage(): Language | null {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLanguage(lng: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
}

export function isEnglish(lng: string) {
  return lng.toLowerCase().startsWith('en');
}
