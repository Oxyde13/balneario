import type { Language } from './language';

export type ShareLanguageChoice = 'pt-PT' | 'en-GB' | 'both';

export const SHARE_LANG_STORAGE_KEY = 'shareLang';

export function readShareLanguage(fallback: Language): ShareLanguageChoice {
  try {
    const value = localStorage.getItem(SHARE_LANG_STORAGE_KEY);
    if (value === 'pt-PT' || value === 'en-GB' || value === 'both') return value;
  } catch {
    // ignore
  }
  return fallback;
}

export function storeShareLanguage(choice: ShareLanguageChoice) {
  try {
    localStorage.setItem(SHARE_LANG_STORAGE_KEY, choice);
  } catch {
    // ignore
  }
}

/**
 * Final message: one or both language versions (separated by a blank line)
 * and the app link at the end.
 */
export function composeShareText(
  build: (lng: Language) => string,
  choice: ShareLanguageChoice,
  appUrl: string,
): string {
  const body = choice === 'both' ? `${build('pt-PT').trim()}\n\n${build('en-GB').trim()}` : build(choice).trim();
  return appUrl ? `${body}\n\n${appUrl}` : body;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Native share sheet on phones; wa.me elsewhere (desktop). */
export function canUseNativeShare(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches === true
  );
}

export type ShareOutcome = 'shared' | 'cancelled' | 'opened';

export async function shareText(text: string): Promise<ShareOutcome> {
  if (canUseNativeShare()) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
      // Some browsers expose share() but refuse it: fall back to wa.me.
    }
  }
  window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer');
  return 'opened';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure context fallback.
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}
