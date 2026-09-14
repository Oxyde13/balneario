// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canUseNativeShare, copyText, shareText, whatsappUrl } from './share';

const setPointer = (coarse: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: query.includes('coarse') ? coarse : false, media: query }),
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
});

describe('canUseNativeShare', () => {
  it('is true on a touch device that supports the Web Share API', () => {
    setPointer(true);
    Object.assign(navigator, { share: vi.fn() });
    expect(canUseNativeShare()).toBe(true);
  });

  it('is false on desktop, even when navigator.share exists', () => {
    setPointer(false);
    Object.assign(navigator, { share: vi.fn() });
    expect(canUseNativeShare()).toBe(false);
  });

  it('is false without the Web Share API', () => {
    setPointer(true);
    expect(canUseNativeShare()).toBe(false);
  });
});

describe('shareText', () => {
  it('opens the native share sheet on a phone', async () => {
    setPointer(true);
    const share = vi.fn(async () => undefined);
    Object.assign(navigator, { share });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    expect(await shareText('Olá')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Olá' });
    expect(open).not.toHaveBeenCalled(); // no external request, no wa.me
  });

  it('does nothing when the person cancels the share sheet', async () => {
    setPointer(true);
    Object.assign(navigator, {
      share: vi.fn(async () => {
        throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
      }),
    });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    expect(await shareText('Olá')).toBe('cancelled');
    expect(open).not.toHaveBeenCalled();
  });

  it('opens wa.me with the text pre-filled on desktop', async () => {
    setPointer(false);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    expect(await shareText('Multa! 2,00 €')).toBe('opened');
    expect(open).toHaveBeenCalledWith(whatsappUrl('Multa! 2,00 €'), '_blank', 'noopener,noreferrer');
  });

  it('falls back to wa.me when the browser refuses to share', async () => {
    setPointer(true);
    Object.assign(navigator, { share: vi.fn(async () => { throw new Error('not allowed'); }) });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    expect(await shareText('Olá')).toBe('opened');
    expect(open).toHaveBeenCalled();
  });
});

describe('copyText', () => {
  it('uses the clipboard API', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    expect(await copyText('Olá')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Olá');
  });

  it('falls back to execCommand when the clipboard is blocked', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    Object.assign(document, { execCommand: vi.fn(() => true) });
    expect(await copyText('Olá')).toBe(true);
  });
});
