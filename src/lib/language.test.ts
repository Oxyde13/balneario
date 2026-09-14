import { describe, expect, it } from 'vitest';
import { detectInitialLanguage, isLanguage } from './language';

describe('detectInitialLanguage', () => {
  it('opens in pt-PT for any Portuguese browser', () => {
    expect(detectInitialLanguage(['pt-PT'])).toBe('pt-PT');
    expect(detectInitialLanguage(['pt-BR', 'en-US'])).toBe('pt-PT');
    expect(detectInitialLanguage(['pt'])).toBe('pt-PT');
    expect(detectInitialLanguage(['PT-pt'])).toBe('pt-PT');
  });

  it('opens in en-GB for every other language', () => {
    expect(detectInitialLanguage(['en-US'])).toBe('en-GB');
    expect(detectInitialLanguage(['ig-NG', 'pt-PT'])).toBe('en-GB'); // only the main language counts
    expect(detectInitialLanguage(['fr-FR'])).toBe('en-GB');
    expect(detectInitialLanguage([])).toBe('en-GB');
  });

  it('falls back to navigator.language when the list is empty', () => {
    expect(detectInitialLanguage(undefined, 'pt-PT')).toBe('pt-PT');
    expect(detectInitialLanguage(undefined, 'de-DE')).toBe('en-GB');
    expect(detectInitialLanguage(undefined, undefined)).toBe('en-GB');
  });

  it('never accepts anything but the two supported languages', () => {
    expect(isLanguage('pt-BR')).toBe(false);
    expect(isLanguage('en-GB')).toBe(true);
  });
});
