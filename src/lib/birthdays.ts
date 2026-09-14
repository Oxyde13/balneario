import { addDaysISO, daysBetween } from './dates';
import type { Cake, ISODate, Member } from '../types/db';

// Mirrors public.birthday_in_year / birthday_in_window / cake_window_* in the database.

/** Cakes are brought between 7 September and 31 May. */
export const CAKE_WINDOW = { startMonth: 9, startDay: 7, endMonth: 5, endDay: 31 } as const;

export interface CakeWindow {
  start: ISODate;
  end: ISODate;
}

/**
 * The cake window that contains (or, during the summer, follows) a date:
 * 7 September of one year to 31 May of the next.
 */
export function cakeWindow(onISO: ISODate): CakeWindow {
  const year = Number(onISO.slice(0, 4));
  const startYear = onISO <= `${year}-05-31` ? year - 1 : year;
  return { start: `${startYear}-09-07`, end: `${startYear + 1}-05-31` };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Birthday in a given year; 29/02 becomes 28/02 in non-leap years. */
export function birthdayInYear(birthISO: ISODate, year: number): ISODate {
  const [, month, day] = birthISO.split('-').map(Number);
  const safeDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return `${year}-${pad(month)}-${pad(safeDay)}`;
}

/** Birthday inside the cake window, or null when it falls outside it (1 June – 6 September). */
export function birthdayInWindow(birthISO: ISODate, window: CakeWindow): ISODate | null {
  const startYear = Number(window.start.slice(0, 4));
  const endYear = Number(window.end.slice(0, 4));
  for (let year = startYear; year <= endYear; year++) {
    const candidate = birthdayInYear(birthISO, year);
    if (candidate >= window.start && candidate <= window.end) return candidate;
  }
  return null;
}

/** Age reached on a given date. */
export function ageOn(birthISO: ISODate, onISO: ISODate): number {
  const birthYear = Number(birthISO.slice(0, 4));
  const year = Number(onISO.slice(0, 4));
  return onISO >= birthdayInYear(birthISO, year) ? year - birthYear : year - birthYear - 1;
}

/** Next birthday on or after today. */
export function nextBirthday(birthISO: ISODate, todayISO: ISODate): ISODate {
  const year = Number(todayISO.slice(0, 4));
  const thisYear = birthdayInYear(birthISO, year);
  return thisYear >= todayISO ? thisYear : birthdayInYear(birthISO, year + 1);
}

/** Age the member turns on a given birthday. */
export function turningAge(birthISO: ISODate, birthdayISO: ISODate): number {
  return Number(birthdayISO.slice(0, 4)) - Number(birthISO.slice(0, 4));
}

export type CakeStatus = 'brought' | 'today' | 'thisWeek' | 'pending' | 'overdue' | 'noDate';

export const CAKE_STATUS_EMOJI: Record<CakeStatus, string> = {
  brought: '✅',
  today: '🎂',
  thisWeek: '🎂',
  pending: '⏳',
  overdue: '⚠️',
  noDate: '📅',
};

type CakeLike = Pick<Cake, 'due_date' | 'brought_on'>;

export function cakeStatus(cake: CakeLike, todayISO: ISODate): CakeStatus {
  if (cake.brought_on) return 'brought';
  if (!cake.due_date) return 'noDate';
  const diff = daysBetween(todayISO, cake.due_date);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 6) return 'thisWeek';
  return 'pending';
}

/**
 * What the cake row would look like if the calendar was generated now (used
 * for active members that still have no row in `cakes`).
 */
export function virtualCake(member: Member, window: CakeWindow): CakeLike & Pick<Cake, 'is_alternative_date'> {
  const due = birthdayInWindow(member.birth_date, window);
  return { due_date: due, is_alternative_date: due === null, brought_on: null };
}

/** Months of the cake window in order (September → May), as [year, monthIndex]. */
export function windowMonths(window: CakeWindow): Array<[number, number]> {
  const months: Array<[number, number]> = [];
  let year = Number(window.start.slice(0, 4));
  let month = Number(window.start.slice(5, 7)) - 1;
  const endYear = Number(window.end.slice(0, 4));
  const endMonth = Number(window.end.slice(5, 7)) - 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push([year, month]);
    month++;
    if (month === 12) {
      month = 0;
      year++;
    }
  }
  return months;
}

/** True when the date is today or within the next `days` days. */
export function isWithinNextDays(iso: ISODate, todayISO: ISODate, days: number): boolean {
  return iso >= todayISO && iso <= addDaysISO(todayISO, days);
}
