import i18n from './i18n';
import { formatDate, formatDayMonth, formatMonthYear } from './dates';
import { formatMoney } from './money';
import { localized } from './localized';
import type { Language } from './language';
import type { CakeAwardKind, Fine } from '../types/db';

// Builders for the WhatsApp messages. Each one receives the message language
// so "PT + EN" can render both versions regardless of the app language.

function tFor(lng: Language) {
  return i18n.getFixedT(lng, 'share');
}

export function joinNames(names: string[], lng: Language): string {
  return new Intl.ListFormat(lng, { style: 'long', type: 'conjunction' }).format(names);
}

export function birthdayMessage(name: string) {
  return (lng: Language) => tFor(lng)('birthday', { name });
}

export interface CakeReminderItem {
  name: string;
  date: string | null;
}

export function cakesReminderMessage(week: CakeReminderItem[], overdue: CakeReminderItem[]) {
  return (lng: Language) => {
    const t = tFor(lng);
    const lines: string[] = [t('cakes.title')];
    if (week.length === 0 && overdue.length === 0) {
      lines.push(t('cakes.none'));
      return lines.join('\n');
    }
    if (week.length > 0) {
      lines.push('', t('cakes.week'));
      week.forEach((item) =>
        lines.push(t('cakes.weekLine', { name: item.name, date: item.date ? formatDayMonth(item.date, lng) : '' })),
      );
    }
    if (overdue.length > 0) {
      lines.push('', t('cakes.overdue'));
      overdue.forEach((item) =>
        lines.push(
          item.date
            ? t('cakes.overdueLine', { name: item.name, date: formatDate(item.date) })
            : t('cakes.overdueLineNoDate', { name: item.name }),
        ),
      );
      lines.push('', t('cakes.overdueJoke'));
    }
    return lines.join('\n');
  };
}

export interface MonthBirthdayEntry {
  name: string;
  date: string;
  age: number;
}

/** Everyone with a birthday in the given month. */
export function monthBirthdaysMessage(entries: MonthBirthdayEntry[]) {
  return (lng: Language) => {
    const t = tFor(lng);
    if (entries.length === 0) return `${t('monthBirthdays.title')}\n\n${t('monthBirthdays.none')}`;
    const month = formatMonthYear(entries[0].date, lng);
    const lines = [t('monthBirthdays.title', { month }), ''];
    entries.forEach((e) =>
      lines.push(t('monthBirthdays.line', { name: e.name, date: formatDayMonth(e.date, lng), age: e.age })),
    );
    return lines.join('\n');
  };
}

export interface MonthCakeEntry {
  name: string;
  dueDate: string;
  /** Set when the date was agreed instead of being the birthday. */
  birthday: string | null;
  brought: boolean;
}

/** Cake days of the given month, by cake date. */
export function monthCakesMessage(entries: MonthCakeEntry[]) {
  return (lng: Language) => {
    const t = tFor(lng);
    if (entries.length === 0) return `${t('monthCakes.title')}\n\n${t('monthCakes.none')}`;
    const month = formatMonthYear(entries[0].dueDate, lng);
    const lines = [t('monthCakes.title', { month }), ''];
    entries.forEach((e) => {
      const key = e.birthday ? 'monthCakes.lineAgreed' : 'monthCakes.line';
      const line = t(key, {
        name: e.name,
        date: formatDayMonth(e.dueDate, lng),
        birthday: e.birthday ? formatDayMonth(e.birthday, lng) : '',
      });
      lines.push(e.brought ? `${line} ${t('monthCakes.brought')}` : line);
    });
    return lines.join('\n');
  };
}

export function fineMessage(names: string[], fine: Pick<Fine, 'description' | 'description_en' | 'amount'>) {
  return (lng: Language) =>
    tFor(lng)('fine', {
      name: joinNames(names, lng),
      rule: localized(fine, 'description', lng),
      amount: formatMoney(fine.amount, lng),
    });
}

export interface RankingEntry {
  name: string;
  amount: number;
}

export function rankingsMessage(
  top: RankingEntry[],
  dodger: RankingEntry | null,
  reliable: RankingEntry | null,
) {
  return (lng: Language) => {
    const t = tFor(lng);
    const medals = ['🥇', '🥈', '🥉'];
    const lines = [t('rankings.title'), ''];
    if (top.length === 0) {
      lines.push(t('rankings.noFines'));
    } else {
      lines.push(t('rankings.mostFined'));
      top.forEach((entry, i) => lines.push(`${medals[i]} ${entry.name} — ${formatMoney(entry.amount, lng)}`));
    }
    lines.push('');
    lines.push(
      dodger
        ? t('rankings.dodger', { name: dodger.name, amount: formatMoney(dodger.amount, lng) })
        : t('rankings.noDodger'),
    );
    lines.push(
      reliable
        ? t('rankings.reliable', { name: reliable.name, amount: formatMoney(reliable.amount, lng) })
        : t('rankings.noReliable'),
    );
    return lines.join('\n');
  };
}

export interface AwardShareEntry {
  kind: CakeAwardKind;
  position: number;
  name: string;
  comment: string | null;
}

export function awardsMessage(awards: AwardShareEntry[]) {
  return (lng: Language) => {
    const t = tFor(lng);
    const lines = [t('awards.title')];
    (['best', 'worst'] as const).forEach((kind) => {
      const entries = awards.filter((a) => a.kind === kind).sort((a, b) => a.position - b.position);
      lines.push('', kind === 'best' ? t('awards.best') : t('awards.worst'));
      if (entries.length === 0) {
        lines.push(t('awards.empty'));
        return;
      }
      entries.forEach((a) => {
        const place = kind === 'best' ? ['🥇', '🥈', '🥉'][a.position - 1] : t(`awards.worstPlace${a.position}`);
        lines.push(a.comment ? `${place} ${a.name} — _${a.comment}_` : `${place} ${a.name}`);
      });
    });
    return lines.join('\n');
  };
}

export interface StylishShareEntry {
  /** Raw period start: the month is spelled in the language of each message. */
  periodStart: string;
  name: string;
  comment: string | null;
}

/** The most recent "most stylish" winners, newest first. */
export function stylishMessage(entries: StylishShareEntry[]) {
  return (lng: Language) => {
    const t = tFor(lng);
    const lines = [t('stylish.title'), ''];
    if (entries.length === 0) {
      lines.push(t('stylish.empty'));
      return lines.join('\n');
    }
    entries.forEach((e) => {
      const line = t('stylish.line', { month: formatMonthYear(e.periodStart, lng), name: e.name });
      lines.push(e.comment ? `${line} — _${e.comment}_` : line);
    });
    return lines.join('\n');
  };
}

export function dinnerMessage(collected: number, pending: number) {
  return (lng: Language) =>
    tFor(lng)('dinner', { fund: formatMoney(collected, lng), unpaid: formatMoney(pending, lng) });
}
