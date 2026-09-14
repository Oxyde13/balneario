import { describe, expect, it } from 'vitest';
import { buildCakesExport, buildDinnersExport, buildFinesExport } from './exports';
import type { Cake, CakeAward, Dinner, Fine, FineRule, Member } from '../types/db';

const player: Member = {
  id: 'm1',
  type: 'player',
  staff_role: null,
  name: 'Chinedu Okafor',
  nickname: 'Chi',
  shirt_number: 4,
  position: 'defender',
  birth_date: '1998-07-15',
  photo_path: null,
  active: true,
  created_at: '2026-09-01T10:00:00Z',
};

const coach: Member = {
  ...player,
  id: 'm2',
  type: 'coach',
  staff_role: 'head_coach',
  name: 'Carlos Nóbrega',
  nickname: null,
  shirt_number: null,
  position: null,
  birth_date: '1978-08-22',
};

const rule: FineRule = {
  id: 'r1',
  title: 'Atraso ao treino',
  title_en: 'Late for training',
  description: null,
  description_en: null,
  category: 'Treinos',
  category_en: 'Training',
  amount: 2,
  applies_to: null,
  active: true,
  sort_order: 10,
  created_at: '2026-09-01T10:00:00Z',
};

const fines: Fine[] = [
  { id: 'f1', member_id: 'm1', rule_id: 'r1', description: 'Atraso ao treino', description_en: 'Late for training', amount: 2, occurred_on: '2026-09-08', notes: null, paid_at: null, created_at: '2026-09-08T10:00:00Z' },
  { id: 'f2', member_id: 'm2', rule_id: null, description: 'Chegar de chinelos', description_en: null, amount: 3.5, occurred_on: '2026-09-10', notes: 'Mister!', paid_at: '2026-09-11', created_at: '2026-09-10T10:00:00Z' },
];

const members = new Map([
  ['m1', player],
  ['m2', coach],
]);

describe('fines export', () => {
  const data = buildFinesExport(fines, members, new Map([['r1', rule]]), '2026-09-11');
  const roundTripped = JSON.parse(JSON.stringify(data));

  it('is valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(data))).not.toThrow();
  });

  it('keeps amounts as numbers and dates as ISO', () => {
    expect(roundTripped.fines[0].amount).toBe(2);
    expect(typeof roundTripped.fines[1].amount).toBe('number');
    expect(roundTripped.fines[0].occurred_on).toBe('2026-09-08');
    expect(roundTripped.fines[1].paid_at).toBe('2026-09-11');
    expect(roundTripped.fines[0].paid_at).toBeNull();
    expect(roundTripped.exported_on).toBe('2026-09-11');
  });

  it('carries each member name and type', () => {
    expect(roundTripped.fines[0].member).toMatchObject({ name: 'Chinedu Okafor', type: 'player' });
    expect(roundTripped.fines[1].member).toMatchObject({ name: 'Carlos Nóbrega', type: 'coach' });
  });

  it('keeps both languages and the rule category', () => {
    expect(roundTripped.fines[0].description_pt).toBe('Atraso ao treino');
    expect(roundTripped.fines[0].description_en).toBe('Late for training');
    expect(roundTripped.fines[0].category_pt).toBe('Treinos');
    expect(roundTripped.fines[0].category_en).toBe('Training');
    expect(roundTripped.fines[1].category_pt).toBeNull();
  });

  it('totals paid and unpaid', () => {
    expect(roundTripped.totals).toEqual({ count: 2, total_amount: 5.5, paid_amount: 3.5, unpaid_amount: 2 });
  });
});

describe('cakes export', () => {
  const cakes: Cake[] = [
    { id: 'c1', member_id: 'm1', due_date: null, is_alternative_date: true, brought_on: null, notes: null },
    { id: 'c2', member_id: 'm2', due_date: '2026-09-09', is_alternative_date: true, brought_on: '2026-09-09', notes: null },
  ];
  const awards: CakeAward[] = [{ id: 'a1', cake_id: 'c2', kind: 'best', position: 1, comment: 'Bolo de mel', created_at: '2026-09-10T10:00:00Z' }];
  const data = JSON.parse(JSON.stringify(buildCakesExport(cakes, awards, members, '2026-09-11')));

  it('exports the cake window it was generated for', () => {
    expect(data.cake_window).toEqual({ start: '2026-09-07', end: '2027-05-31' });
  });

  it('exports the birthday inside the window and the cake status', () => {
    const out = data.cakes.find((c: { id: string }) => c.id === 'c1');
    expect(out.birthday_in_window).toBeNull(); // 15 July is outside the window
    expect(out.status).toBe('noDate');
    expect(out.is_alternative_date).toBe(true);
  });

  it('exports awards with the member behind each cake', () => {
    expect(data.awards[0]).toMatchObject({ kind: 'best', position: 1, comment: 'Bolo de mel', brought_on: '2026-09-09' });
    expect(data.awards[0].member.name).toBe('Carlos Nóbrega');
  });
});

describe('dinners export', () => {
  const dinners: Dinner[] = [
    { id: 'd2', held_on: '2026-05-30', place: 'Restaurante O Pátio', notes: null, fund_amount: 33, created_at: '2026-05-30T20:00:00Z' },
    { id: 'd1', held_on: '2025-05-31', place: null, notes: 'Primeira vez', fund_amount: 120.5, created_at: '2025-05-31T20:00:00Z' },
  ];
  const data = JSON.parse(JSON.stringify(buildDinnersExport(dinners, '2026-09-11')));

  it('sorts by date and totals what was spent', () => {
    expect(data.dinners.map((d: { held_on: string }) => d.held_on)).toEqual(['2025-05-31', '2026-05-30']);
    expect(data.total_spent).toBe(153.5);
    expect(typeof data.dinners[0].fund_amount).toBe('number');
  });
});
