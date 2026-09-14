import { birthdayInWindow, cakeStatus, cakeWindow } from './birthdays';
import { sumAmounts, toAmount } from './money';
import type { Cake, CakeAward, Dinner, Fine, FineRule, ISODate, Member } from '../types/db';

// JSON exports: numbers stay numbers, dates stay ISO (yyyy-MM-dd).

function memberInfo(member: Member | undefined) {
  return member
    ? { id: member.id, name: member.name, nickname: member.nickname, type: member.type }
    : { id: null, name: null, nickname: null, type: null };
}

export function buildFinesExport(
  fines: Fine[],
  members: Map<string, Member>,
  rules: Map<string, FineRule>,
  exportedOn: ISODate,
) {
  const sorted = [...fines].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  return {
    exported_on: exportedOn,
    totals: {
      count: fines.length,
      total_amount: sumAmounts(fines, (f) => f.amount),
      paid_amount: sumAmounts(fines.filter((f) => f.paid_at), (f) => f.amount),
      unpaid_amount: sumAmounts(fines.filter((f) => !f.paid_at), (f) => f.amount),
    },
    fines: sorted.map((fine) => {
      const rule = fine.rule_id ? rules.get(fine.rule_id) : undefined;
      return {
        id: fine.id,
        member: memberInfo(members.get(fine.member_id)),
        description_pt: fine.description,
        description_en: fine.description_en,
        category_pt: rule?.category ?? null,
        category_en: rule?.category_en ?? null,
        amount: toAmount(fine.amount),
        occurred_on: fine.occurred_on,
        paid: fine.paid_at !== null,
        paid_at: fine.paid_at,
        notes: fine.notes,
      };
    }),
  };
}

export function buildCakesExport(
  cakes: Cake[],
  awards: CakeAward[],
  members: Map<string, Member>,
  exportedOn: ISODate,
) {
  const cakeById = new Map(cakes.map((c) => [c.id, c]));
  const window = cakeWindow(exportedOn);
  return {
    exported_on: exportedOn,
    cake_window: window,
    cakes: [...cakes]
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
      .map((cake) => {
        const member = members.get(cake.member_id);
        return {
          id: cake.id,
          member: memberInfo(member),
          birthday_in_window: member ? birthdayInWindow(member.birth_date, window) : null,
          due_date: cake.due_date,
          is_alternative_date: cake.is_alternative_date,
          brought_on: cake.brought_on,
          status: cakeStatus(cake, exportedOn),
          notes: cake.notes,
        };
      }),
    awards: [...awards]
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position)
      .map((award) => {
        const cake = cakeById.get(award.cake_id);
        return {
          kind: award.kind,
          position: award.position,
          member: memberInfo(cake ? members.get(cake.member_id) : undefined),
          brought_on: cake?.brought_on ?? null,
          comment: award.comment,
        };
      }),
  };
}

export const BACKUP_TABLES = ['members', 'fine_rules', 'fines', 'cakes', 'cake_awards', 'member_awards', 'dinners', 'activity_log'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export function buildDinnersExport(dinners: Dinner[], exportedOn: ISODate) {
  return {
    exported_on: exportedOn,
    total_spent: dinners.reduce((total, dinner) => total + toAmount(dinner.fund_amount), 0),
    dinners: [...dinners]
      .sort((a, b) => a.held_on.localeCompare(b.held_on))
      .map((dinner) => ({
        id: dinner.id,
        held_on: dinner.held_on,
        place: dinner.place,
        fund_amount: toAmount(dinner.fund_amount),
        notes: dinner.notes,
      })),
  };
}

export function buildBackup(tables: Record<BackupTable, unknown[]>, exportedAt: string) {
  return {
    app: 'balneario-1-de-maio',
    format_version: 1,
    exported_at: exportedAt,
    counts: Object.fromEntries(BACKUP_TABLES.map((name) => [name, tables[name].length])),
    tables,
  };
}
