// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Session used by the mock: the read-only "team" profile, unless a test logs out.
vi.mock('../lib/supabase', async () => {
  const mock = await import('./supabaseMock');
  return mock.createSupabaseMock(mock.TEAM_SESSION);
});

const { renderRoute } = await import('./render');
const { LANGUAGE_STORAGE_KEY } = await import('../lib/language');

beforeAll(() => vi.setSystemTime(new Date('2026-09-11T10:00:00Z')));
afterAll(() => vi.useRealTimers());

let screen: Awaited<ReturnType<typeof renderRoute>> | null = null;
const open = async (path: string, language?: 'pt-PT' | 'en-GB') => {
  screen = await renderRoute(path, language);
  return screen;
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  screen?.cleanup();
  screen = null;
});

describe('team profile (read only)', () => {
  it('reads everything', async () => {
    const view = await open('/');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Fundo do jantar');
    expect(text).toContain('Caloteiro-mor');
    expect(text).toContain('Pódio das multas');
  });

  it('shows no admin affordances', async () => {
    const view = await open('/fines');
    const text = view.text();
    expect(text).not.toContain('Administração'); // admin is not in the menu
    expect(text).not.toContain('Atribuir multa');
    // Fines are not clickable for the team profile (no edit/pay sheet).
    const openFine = [...view.container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('Abrir multa'));
    expect(openFine).toBeUndefined();
  });

  it('cannot reach the admin screens by URL', async () => {
    const view = await open('/admin/history');
    // RequireAdmin sends it back to the dashboard.
    expect(window.location.pathname).toBe('/');
    expect(view.text()).not.toContain('Multa de Tiago Gouveia');
  });

  it('sees only the day and month of a birth date', async () => {
    const view = await open('/team/m1');
    const text = view.text();
    expect(text).toContain('8 de setembro'); // day and month
    expect(text).not.toContain('08/09/1995'); // never the year
    expect(text).not.toContain('1995');
  });

  it('can still share on WhatsApp', async () => {
    const view = await open('/team/m1');
    expect([...view.container.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === 'Partilhar')).toBe(true);
  });
});

describe('language', () => {
  it('keeps the chosen language on the device', async () => {
    const view = await open('/');
    await view.click('Inglês');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-GB');
    expect(view.text()).toContain('Home');
    expect(view.text()).toContain('Dinner fund');

    await view.click('Portuguese'); // the label is in English now
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-PT');
    expect(view.text()).toContain('Início');
  });

  it('translates the cake states and the ranking labels', async () => {
    const view = await open('/rankings?tab=dodgers', 'en-GB');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Top Dodger');
    expect(text).toContain('2 fines unpaid');
    expect(text).toContain('Every unpaid euro is one less plate at dinner.');
  });
});

describe('sharing', () => {
  it('previews the message and switches between PT, EN and both', async () => {
    const view = await open('/dinners'); // only the dinner fund card shares here
    await view.click('Partilhar');
    let text = view.text();
    expect(text).toContain('Partilhar no WhatsApp');
    expect(text).toContain('Fundo do jantar:');
    expect(text).toContain('Nada é enviado automaticamente');

    await view.click('PT + EN');
    text = view.text();
    expect(text).toContain('Fundo do jantar:');
    expect(text).toContain('Dinner fund:');

    await view.click('EN');
    text = view.text();
    expect(text).toContain('Dinner fund:');
    expect(text).not.toContain('Fundo do jantar:');
    expect(localStorage.getItem('shareLang')).toBe('en-GB');
  });

  it('copies the text to the clipboard', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const view = await open('/dinners');
    await view.click('Partilhar');
    await view.click('Copiar texto');
    expect(writeText).toHaveBeenCalledOnce();
    const copied = writeText.mock.calls[0]?.[0] ?? '';
    expect(copied).toContain('Fundo do jantar:');
    expect(copied).toContain('https://balneario.example'); // app link at the end
    expect(view.text()).toContain('Copiado!');
  });
});
