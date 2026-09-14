// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const mock = await import('./supabaseMock');
  return mock.createSupabaseMock(mock.ADMIN_SESSION);
});

const { renderRoute } = await import('./render');

// The fixtures are written as if today were 11 September 2026 (season 2026/2027).
beforeAll(() => vi.setSystemTime(new Date('2026-09-11T10:00:00Z')));
afterAll(() => vi.useRealTimers());

let screen: Awaited<ReturnType<typeof renderRoute>> | null = null;
const open = async (path: string, language?: 'pt-PT' | 'en-GB') => {
  screen = await renderRoute(path, language);
  return screen;
};
afterEach(() => {
  screen?.cleanup();
  screen = null;
});

describe('dashboard', () => {
  it('shows the dinner fund, the top dodger and the fines podium', async () => {
    const view = await open('/');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Início');
    expect(text).toContain('Fundo do jantar');
    expect(text).toContain('Já temos');
    expect(text).toContain('6,00 €'); // paid after the last dinner: 3 + 2 + 1
    expect(text).toContain('Faltam cobrar');
    expect(text).toContain('17,00 €'); // unpaid: 2 + 5 + 10
    expect(text).toContain('Caloteiro-mor');
    expect(text).toContain('Chinedu Okafor');
    expect(text).toContain('12,00 €'); // 2 recent + 10 still unpaid from before
    expect(text).toContain('Pódio das multas');
  });

  it('shows the September birthdays and the cakes still owed', async () => {
    const view = await open('/');
    const text = view.text();
    expect(text).toContain('Aniversários de Setembro');
    expect(text).toContain('Rúben Teixeira');
    expect(text).toContain('faz 31 anos');
    expect(text).toContain('Bolos em falta');
    expect(text).toContain('Sem data'); // Chinedu, born 15 July
  });

  it('shows the cake awards, with a marker on every podium place', async () => {
    const view = await open('/');
    const text = view.text();
    expect(text).toContain('Prémios do bolo');
    expect(text).toContain('Bolo de mel da avó.');
    expect(text).toContain('Bolos para esquecer');

    // Both podiums use medals; the label says which podium the place belongs to.
    const markers = [...view.container.querySelectorAll('[role="img"]')].map((el) => el.getAttribute('aria-label'));
    expect(markers).toContain('🥇 Melhores bolos · 1.º lugar');
    expect(markers).toContain('🥈 Melhores bolos · 2.º lugar');
    expect(markers).toContain('Bolos para esquecer · 1.º lugar');
    const worst = [...view.container.querySelectorAll('[role="img"]')].find(
      (el) => el.getAttribute('aria-label') === 'Bolos para esquecer · 1.º lugar',
    );
    expect(worst?.textContent).toBe('🥇'); // medals on both podiums
  });
});

describe('birthdays screen', () => {
  it('groups by month and keeps summer birthdays apart', async () => {
    const view = await open('/birthdays');
    const text = view.text();
    expect(text).toContain('Setembro 2026');
    expect(text).toContain('Fevereiro 2027');
    expect(text).toContain('Aniversários no verão');
    expect(text).toContain('28 de fevereiro'); // 29 February resolved for a non-leap year
    expect(text).toContain('À espera de data alternativa');
    expect(text).toContain('Trouxe');
  });
});

describe('fines screen', () => {
  it('shows the totals and the dinner lock', async () => {
    const view = await open('/fines');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('25,00 €'); // every fine: 2+5+3+2+1+10+2
    expect(text).toContain('Por pagar');
    expect(text).toContain('Incluída no jantar de 30/05/2026'); // locked payment
  });
});

describe('rankings', () => {
  it('lists the dodgers, with the unpaid count', async () => {
    const view = await open('/rankings?tab=dodgers');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Caloteiro-mor');
    expect(text).toContain('Chinedu Okafor');
    expect(text).toContain('2 multas por pagar');
    expect(text).toContain('Cada euro por pagar é menos um prato no jantar.');
  });

  it('lists only members with everything paid under "most reliable"', async () => {
    const view = await open('/rankings?tab=reliable');
    const text = view.text();
    expect(text).toContain('Mais cumpridor');
    expect(text).toContain('Rúben Teixeira'); // 3,00 € paid, nothing owed
    expect(text).not.toContain('Chinedu'); // has unpaid fines
  });

  it('shows both cake podiums', async () => {
    const view = await open('/rankings?tab=cakes');
    const text = view.text();
    expect(text).toContain('Melhores bolos');
    expect(text).toContain('Bolos para esquecer');
    expect(text).toContain('Tiago Gouveia');
  });

  it('lists the monthly "most stylish" winners, newest first', async () => {
    const view = await open('/rankings?tab=stylish');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('O mais estiloso');
    expect(text).toContain('Setembro de 2026');
    expect(text).toContain('Tiago Gouveia'); // September
    expect(text).toContain('Fato completo para um treino de terça.');
    expect(text).toContain('Agosto de 2026');
    expect(text).toContain('Rúben Teixeira'); // August, no comment
    // Newest month first.
    expect(text.indexOf('Setembro de 2026')).toBeLessThan(text.indexOf('Agosto de 2026'));
  });

  it('translates the award month, falling back to nothing in English', async () => {
    const view = await open('/rankings?tab=stylish', 'en-GB');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('The most stylish');
    expect(text).toContain('September 2026');
    expect(text).toContain('August 2026');
  });
});

describe('rule book', () => {
  it('shows the amounts, the player-only badge and the categories', async () => {
    const view = await open('/rules');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Regulamento');
    expect(text).toContain('Atraso ao treino');
    expect(text).toContain('2,00 €');
    expect(text).toContain('Só jogadores');
    expect(text).toContain('Treinos');
    expect(text).not.toContain('Regra desativada');
  });

  it('falls back to Portuguese for rules without an English translation', async () => {
    const view = await open('/rules', 'en-GB');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Rule book');
    expect(text).toContain('Late for training'); // translated
    expect(text).toContain('€2.00');
    expect(text).toContain('Pôr música pimba no balneário'); // no title_en: silent fallback
    expect(text).toContain('Players only');
  });
});

describe('team', () => {
  it('splits players and coaching staff and hides inactive members', async () => {
    const view = await open('/team');
    const text = view.text();
    expect(text).toContain('Jogadores');
    expect(text).toContain('Equipa técnica');
    expect(text).toContain('Treinador principal');
    expect(text).toContain('Treinador'); // badge on staff
    expect(text).not.toContain('Zé Antigo'); // inactive
  });

  it('shows the member totals and cake status', async () => {
    const view = await open('/team/m2');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Chinedu Okafor');
    expect(text).toContain('Por pagar');
    expect(text).toContain('12,00 €');
    expect(text).toContain('Sem data');
    expect(text).toContain('Marcar todas como pagas');
  });
});

describe('dinners', () => {
  it('shows the current fund and the dinner history', async () => {
    const view = await open('/dinners');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Jantares já feitos');
    expect(text).toContain('30/05/2026');
    expect(text).toContain('Restaurante O Pátio');
    expect(text).toContain('33,00 €');
  });
});

describe('assigning a fine', () => {
  it('takes three taps: member, rule, save', async () => {
    const view = await open('/fines/new');
    await view.waitForText('Rúben Teixeira');

    await view.click('Rúben Teixeira'); // tap 1
    let text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('O que fez?');
    expect(text).toContain('Esquecer caneleiras'); // player-only rule shows for a player
    expect(text).toContain('Multa avulsa');

    await view.click('Esquecer caneleiras'); // tap 2
    text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Confirma e guarda');
    expect((view.container.querySelector('#fine-amount') as HTMLInputElement).value).toBe('3');
    expect((view.container.querySelector('#fine-date') as HTMLInputElement).value).toBe('2026-09-11');

    await view.click('Guardar multa'); // tap 3
    text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Multa guardada!');
    expect(text).toContain('Partilhar no grupo?'); // offered, never automatic
  });

  it('hides player-only rules when the fine is for a coach', async () => {
    const view = await open('/fines/new');
    await view.waitForText('Rúben Teixeira');
    await view.click('Carlos Nóbrega');
    const text = view.text();
    expect(text).toContain('Atraso ao treino');
    expect(text).not.toContain('Esquecer caneleiras');
  });
});

describe('admin screens', () => {
  it('opens the admin menu', async () => {
    const view = await open('/admin');
    await view.waitForText('Administração');
    const text = view.text();
    expect(text).toContain('Administração');
    expect(text).toContain('Prémios do bolo');
    expect(text).toContain('Registar jantar');
    expect(text).toContain('Backup e exportação');
  });

  it('flags rules without an English translation', async () => {
    const view = await open('/admin/rules');
    await view.waitForText('Gerir regulamento');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Gerir regulamento');
    expect(text).toContain('Sem EN');
    expect(text).toContain('1 regra sem tradução inglesa'); // só a regra ativa sem EN conta
  });

  it('shows the cake award podiums with empty slots and every place marker', async () => {
    const view = await open('/admin/awards');
    await view.waitForText('Prémios do bolo');
    const text = view.text();
    expect(text).toContain('Prémios do bolo');
    expect(text).toContain('Tocar para escolher um bolo'); // 3rd places are empty

    const markers = [...view.container.querySelectorAll('[role="img"]')].map((el) => el.getAttribute('aria-label'));
    for (const place of ['1.º', '2.º', '3.º']) {
      expect(markers).toContain(`Bolos para esquecer · ${place} lugar`);
    }
  });

  it('lists a year of months on the stylish screen, marking the current one', async () => {
    const view = await open('/admin/stylish');
    await view.waitForText('O mais estiloso');
    const text = view.text().replace(/\s/g, ' ');
    // Today is 11 September 2026 in the fixtures.
    expect(text).toContain('Setembro de 2026');
    expect(text).toContain('Este mês');
    expect(text).toContain('Tiago Gouveia'); // already decided
    expect(text).toContain('Tocar para escolher'); // months still open
    // Twelve months back, crossing into the previous year.
    expect(text).toContain('Outubro de 2025');
  });

  it('shows the fund about to be closed on the dinner screen', async () => {
    const view = await open('/admin/dinner');
    await view.waitForText('Registar jantar');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Registar jantar');
    expect(text).toContain('Fundo que vai ser fechado');
    expect(text).toContain('6,00 €');
  });

  it('writes the history in plain words', async () => {
    const view = await open('/admin/history');
    await view.waitForText('Histórico');
    const text = view.text().replace(/\s/g, ' ');
    expect(text).toContain('Histórico');
    expect(text).toContain('Multa de Tiago Gouveia (2,00 €) marcada como paga');
    expect(text).toContain('Novo membro: Rúben Teixeira');
  });

  it('has no way to delete a member, only to deactivate', async () => {
    const view = await open('/admin/members/m1');
    await view.waitForText('Rúben Teixeira');
    const text = view.text();
    expect(text).toContain('Ativo na equipa'); // leaving = inactive
    expect(text).not.toContain('Apagar');
    const deleteButton = [...view.container.querySelectorAll('button')].find((b) => /apagar|eliminar/i.test(b.textContent ?? ''));
    expect(deleteButton).toBeUndefined();
  });

  it('offers the exports', async () => {
    const view = await open('/admin/backup');
    await view.waitForText('Backup completo');
    const text = view.text();
    expect(text).toContain('Backup completo');
    expect(text).toContain('multas-2026-09-11.json');
    expect(text).toContain('bolos-2026-09-11.json');
    expect(text).toContain('jantares-2026-09-11.json');
  });
});
