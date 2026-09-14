// @vitest-environment jsdom
import { act } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi, type Mock } from 'vitest';

// No session: the app must show the login screen.
vi.mock('../lib/supabase', async () => {
  const mock = await import('./supabaseMock');
  return mock.createSupabaseMock(null);
});

const { renderRoute } = await import('./render');
const { supabase, PROFILE_EMAILS } = await import('../lib/supabase');

beforeAll(() => vi.setSystemTime(new Date('2026-09-11T10:00:00Z')));
afterAll(() => vi.useRealTimers());

let screen: Awaited<ReturnType<typeof renderRoute>> | null = null;
afterEach(() => {
  screen?.cleanup();
  screen = null;
  vi.mocked(supabase.auth.signInWithPassword).mockClear();
});

const typePin = async (pin: string) => {
  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setValue.call(input, pin);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('login', () => {
  it('is the only thing a visitor without a session sees', async () => {
    screen = await renderRoute('/');
    const text = screen.text();
    expect(window.location.pathname).toBe('/login');
    expect(text).toContain('PIN');
    expect(text).toContain('Equipa');
    expect(text).toContain('Administrador');
    expect(text).toContain('6 dígitos');
    // Nothing from the dashboard leaks through.
    expect(text).not.toContain('Caloteiro-mor');
    expect(text).not.toContain('Chinedu');
  });

  it('never shows the account emails', async () => {
    screen = await renderRoute('/login');
    expect(screen.text()).not.toContain('@');
    expect(screen.container.innerHTML).not.toContain(PROFILE_EMAILS.admin);
    expect(screen.container.innerHTML).not.toContain(PROFILE_EMAILS.team);
  });

  it('uses a numeric keypad and 6 digits', async () => {
    screen = await renderRoute('/login');
    const input = screen.container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input.inputMode).toBe('numeric');
    expect(input.maxLength).toBe(6);
  });

  it('submits by itself on the sixth digit, with the email of the chosen profile', async () => {
    screen = await renderRoute('/login');
    await screen.click('Administrador');
    await typePin('123456');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: PROFILE_EMAILS.admin, password: '123456' });
  });

  it('does not submit before the sixth digit', async () => {
    screen = await renderRoute('/login');
    await typePin('12345');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('ignores anything that is not a digit', async () => {
    screen = await renderRoute('/login');
    await typePin('12a34b56');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: PROFILE_EMAILS.team, password: '123456' });
  });

  it('uses the team email by default', async () => {
    screen = await renderRoute('/login');
    await typePin('654321');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: PROFILE_EMAILS.team, password: '654321' });
  });

  it('shows a friendly message on a wrong PIN and clears the boxes', async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { status: 400, message: 'Invalid login credentials' },
    });
    screen = await renderRoute('/login');
    await typePin('000000');
    expect(screen.text()).toContain('PIN errado. Estás a tentar fugir às multas?');
    expect((screen.container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('');
  });

  it('translates the wrong-PIN message', async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { status: 400, message: 'Invalid login credentials' },
    });
    screen = await renderRoute('/login', 'en-GB');
    await typePin('000000');
    expect(screen.text()).toContain('Wrong PIN. Trying to dodge your fines?');
  });

  it('warns when the rate limit kicks in', async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { status: 429, message: 'Too many requests' },
    });
    screen = await renderRoute('/login');
    await typePin('111111');
    expect(screen.text()).toContain('Demasiadas tentativas');
  });

  it('switches language on the login screen', async () => {
    screen = await renderRoute('/login');
    await screen.click('Inglês');
    expect(screen.text()).toContain('6 digits');
    expect(screen.text()).toContain('Admin');
  });
});
