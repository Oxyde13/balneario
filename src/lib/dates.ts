import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { enGB, pt } from 'date-fns/locale';
import { isEnglish } from './language';
import type { ISODate } from '../types/db';

export const CLUB_TIME_ZONE = 'Atlantic/Madeira';

/** Today's date in Madeira (not UTC, not the device's zone), as yyyy-MM-dd. */
export function todayISO(now: Date = new Date()): ISODate {
  // en-CA formats dates as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Parses yyyy-MM-dd as a local calendar date (no time zone shifts). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISODate(iso), days));
}

export function daysBetween(fromISO: ISODate, toISO: ISODate): number {
  return differenceInCalendarDays(parseISODate(toISO), parseISODate(fromISO));
}

export function dateFnsLocale(lng: string) {
  return isEnglish(lng) ? enGB : pt;
}

/** dd/MM/yyyy in both languages. */
export function formatDate(iso: ISODate | null | undefined): string {
  return iso ? format(parseISODate(iso), 'dd/MM/yyyy') : '';
}

/** Day and month only (e.g. "8 de setembro" / "8 September"). */
export function formatDayMonth(iso: ISODate, lng: string): string {
  const pattern = isEnglish(lng) ? 'd MMMM' : "d 'de' MMMM";
  return format(parseISODate(iso), pattern, { locale: dateFnsLocale(lng) });
}

export function formatWeekdayDayMonth(iso: ISODate, lng: string): string {
  const pattern = isEnglish(lng) ? 'EEEE, d MMMM' : "EEEE, d 'de' MMMM";
  return format(parseISODate(iso), pattern, { locale: dateFnsLocale(lng) });
}

/** Month name in the active language (monthIndex 0–11). */
export function monthName(monthIndex: number, lng: string): string {
  const name = format(new Date(2000, monthIndex, 1), 'LLLL', { locale: dateFnsLocale(lng) });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The closed range of the month `iso` falls in, as `{ start, end }`. */
export function monthPeriod(iso: ISODate): { start: ISODate; end: ISODate } {
  const date = parseISODate(iso);
  return { start: toISODate(startOfMonth(date)), end: toISODate(endOfMonth(date)) };
}

/** The `count` most recent months, newest first, as closed ranges. */
export function recentMonths(fromISO: ISODate, count: number): Array<{ start: ISODate; end: ISODate }> {
  const base = startOfMonth(parseISODate(fromISO));
  return Array.from({ length: count }, (_, i) => monthPeriod(toISODate(addMonths(base, -i))));
}

/** "Setembro de 2026" / "September 2026", for an award period. */
export function formatMonthYear(iso: ISODate, lng: string): string {
  const name = format(parseISODate(iso), isEnglish(lng) ? 'LLLL yyyy' : "LLLL 'de' yyyy", { locale: dateFnsLocale(lng) });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatDateTime(timestamp: string, lng: string): string {
  return new Intl.DateTimeFormat(lng, {
    timeZone: CLUB_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
