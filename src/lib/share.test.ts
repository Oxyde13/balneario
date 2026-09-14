import { describe, expect, it } from 'vitest';

/** Intl uses non-breaking spaces around the euro sign; normalise them for comparisons. */
const plain = (text: string) => text.replace(/\s/g, ' ');
import { composeShareText, whatsappUrl } from './share';
import {
  awardsMessage,
  birthdayMessage,
  cakesReminderMessage,
  dinnerMessage,
  fineMessage,
  monthBirthdaysMessage,
  monthCakesMessage,
  rankingsMessage,
  stylishMessage,
} from './shareTexts';

const APP = 'https://balneario.example';

describe('message templates', () => {
  it('writes the birthday message in each language', () => {
    const build = birthdayMessage('Rubinho');
    expect(build('pt-PT')).toContain('*Hoje faz anos o Rubinho!*');
    expect(build('en-GB')).toContain("*It's Rubinho's birthday today!*");
  });

  it('formats fine amounts in the language of the message', () => {
    const fine = { description: 'Atraso ao treino', description_en: 'Late for training', amount: 2 };
    const build = fineMessage(['Chi'], fine);
    expect(plain(build('pt-PT'))).toBe('💸 *Multa!* Chi: Atraso ao treino (2,00 €). O jantar agradece. 🍽️');
    expect(build('en-GB')).toBe('💸 *Fine!* Chi: Late for training (€2.00). The team dinner says thanks. 🍽️');
  });

  it('falls back to the Portuguese description in English messages', () => {
    const fine = { description: 'Pôr música pimba no balneário', description_en: null, amount: 1 };
    expect(fineMessage(['Hélder'], fine)('en-GB')).toContain('Pôr música pimba no balneário');
  });

  it('joins several names naturally', () => {
    const fine = { description: 'Atraso colectivo', description_en: 'Collective delay', amount: 2 };
    expect(fineMessage(['Chi', 'Tiago', 'Sammy'], fine)('pt-PT')).toContain('Chi, Tiago e Sammy');
    expect(fineMessage(['Chi', 'Tiago', 'Sammy'], fine)('en-GB')).toContain('Chi, Tiago and Sammy');
  });

  it('never mentions the birth year', () => {
    expect(birthdayMessage('Rubinho')('pt-PT')).not.toMatch(/19\d\d|20\d\d/);
  });

  it('builds the dinner fund message', () => {
    const build = dinnerMessage(16, 25);
    expect(plain(build('pt-PT'))).toBe(
      '🍽️ *Fundo do jantar:* 16,00 €. Ainda faltam cobrar 25,00 €. Paguem, que o jantar agradece! 😄',
    );
    expect(build('en-GB')).toContain('€16.00');
  });

  it('lists cakes due this week and overdue ones', () => {
    const build = cakesReminderMessage([{ name: 'Tiago', date: '2026-09-14' }], [{ name: 'Chi', date: '2026-09-01' }]);
    const pt = build('pt-PT');
    expect(pt).toContain('🍰 *Lembrete de bolos*');
    expect(pt).toContain('• Tiago, 14 de setembro');
    expect(pt).toContain('• Chi (desde 01/09/2026)');
    expect(build('en-GB')).toContain('• Tiago, 14 September');
  });

  it('says something funny when there is nothing to remind', () => {
    expect(cakesReminderMessage([], [])('pt-PT')).toContain('Que tristeza');
    expect(cakesReminderMessage([], [])('en-GB')).toContain('How sad');
  });

  it('summarises the rankings with medals', () => {
    const build = rankingsMessage(
      [
        { name: 'Carlos', amount: 7 },
        { name: 'Tiago', amount: 7 },
      ],
      { name: 'Chi', amount: 14 },
      null,
    );
    const pt = build('pt-PT');
    expect(pt).toContain('🥇 Carlos');
    expect(pt).toContain('🥈 Tiago');
    expect(pt).toContain('🦹 *Caloteiro-mor:* Chi');
    expect(pt).toContain('Vergonha!');
    expect(build('en-GB')).toContain('🦹 *Top Dodger:* Chi');
  });

  it('shows both podiums', () => {
    const build = awardsMessage([
      { kind: 'best', position: 1, name: 'Tiago', comment: 'Bolo de mel' },
      { kind: 'worst', position: 1, name: 'Rubinho', comment: null },
    ]);
    const pt = build('pt-PT');
    expect(pt).toContain('🥇 Tiago — _Bolo de mel_');
    expect(pt).toContain('*Bolos para esquecer* 🥴');
    expect(pt).toContain('1.º Rubinho');
    expect(awardsMessage([])('en-GB')).toContain('(to be decided)');
  });
});

describe('composeShareText', () => {
  const build = birthdayMessage('Rubinho');

  it('adds the app link at the end', () => {
    expect(composeShareText(build, 'pt-PT', APP).endsWith(`\n\n${APP}`)).toBe(true);
  });

  it('puts both versions in one message, separated by a blank line', () => {
    const both = composeShareText(build, 'both', APP);
    const [pt, en, link] = both.split('\n\n');
    expect(pt).toBe(build('pt-PT'));
    expect(en).toBe(build('en-GB'));
    expect(link).toBe(APP);
    expect(both.split(APP)).toHaveLength(2); // the link appears only once
  });

  it('works without an app link configured', () => {
    expect(composeShareText(build, 'en-GB', '')).toBe(build('en-GB'));
  });
});

describe('whatsappUrl', () => {
  it('encodes the text for wa.me', () => {
    expect(whatsappUrl('Multa! 2,00 €')).toBe('https://wa.me/?text=Multa!%202%2C00%20%E2%82%AC');
  });
});

describe('most stylish message', () => {
  it('lists the winners, newest first, with the comment in italics', () => {
    const build = stylishMessage([
      { periodStart: '2026-09-01', name: 'Gouveia', comment: 'Fato e ténis.' },
      { periodStart: '2026-08-01', name: 'Rubinho', comment: null },
    ]);
    const text = build('pt-PT');
    expect(text).toContain('🕺 *O mais estiloso*');
    expect(text).toContain('Setembro de 2026: *Gouveia* — _Fato e ténis._');
    // No comment: no trailing dash.
    expect(text).toContain('Agosto de 2026: *Rubinho*');
    expect(text).not.toContain('*Rubinho* —');
    expect(text.indexOf('Setembro')).toBeLessThan(text.indexOf('Agosto'));
  });

  it('spells the month in the language of each message', () => {
    const build = stylishMessage([{ periodStart: '2026-09-01', name: 'Gouveia', comment: null }]);
    expect(build('pt-PT')).toContain('Setembro de 2026: *Gouveia*');
    expect(build('en-GB')).toContain('September 2026: *Gouveia*');
  });

  it('says so when nothing has been decided yet', () => {
    const build = stylishMessage([]);
    expect(build('pt-PT')).toContain('Ainda não há eleitos');
    expect(build('en-GB')).toContain('No winners yet');
  });
});

describe('month cards', () => {
  it('writes the birthdays of the month with the age', () => {
    const build = monthBirthdaysMessage([
      { name: 'Rubinho', date: '2026-09-08', age: 31 },
      { name: 'Gouveia', date: '2026-09-10', age: 30 },
    ]);
    expect(build('pt-PT')).toContain('🎉 *Aniversários de Setembro de 2026*');
    expect(build('pt-PT')).toContain('• Rubinho — 8 de setembro (faz 31)');
    expect(build('en-GB')).toContain('🎉 *Birthdays in September 2026*');
    expect(build('en-GB')).toContain('• Rubinho — 8 September (turns 31)');
  });

  it('writes the cake days by date, marking agreed dates and cakes already brought', () => {
    const build = monthCakesMessage([
      { name: 'Rubinho', dueDate: '2026-09-08', birthday: null, brought: true },
      { name: 'Cipriano', dueDate: '2026-09-26', birthday: '1992-09-01', brought: false },
    ]);
    const pt = build('pt-PT');
    expect(pt).toContain('🍰 *Bolos de Setembro de 2026*');
    expect(pt).toContain('• 8 de setembro — *Rubinho* ✅');
    // Agreed date: the birthday is a different day and is spelled out.
    expect(pt).toContain('• 26 de setembro — *Cipriano* (aniversário a 1 de setembro)');
    expect(build('en-GB')).toContain('• 26 September — *Cipriano* (birthday on 1 September)');
  });

  it('says so when the month is empty', () => {
    expect(monthCakesMessage([])('pt-PT')).toContain('Não há bolos marcados este mês');
    expect(monthBirthdaysMessage([])('en-GB')).toContain('Nobody has a birthday this month');
  });
});
