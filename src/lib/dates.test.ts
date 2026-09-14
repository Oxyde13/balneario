import { describe, expect, it } from 'vitest';
import { addDaysISO, daysBetween, formatDate, formatDayMonth, formatMonthYear, monthName, monthPeriod, recentMonths, todayISO } from './dates';

describe('todayISO (Atlantic/Madeira)', () => {
  it('uses Madeira time, not UTC', () => {
    // 23:30 UTC in September is already the next day in Madeira (WEST, UTC+1).
    expect(todayISO(new Date('2026-09-11T23:30:00Z'))).toBe('2026-09-12');
    // In winter Madeira is on UTC, so the date matches.
    expect(todayISO(new Date('2027-01-01T00:30:00Z'))).toBe('2027-01-01');
    // …and 00:30 UTC on a summer day is still the previous day in Madeira? No: UTC+1.
    expect(todayISO(new Date('2026-06-30T23:59:00Z'))).toBe('2026-07-01');
  });
});

describe('date helpers', () => {
  it('formats dd/MM/yyyy in both languages', () => {
    expect(formatDate('2026-09-08')).toBe('08/09/2026');
    expect(formatDate(null)).toBe('');
  });

  it('writes day and month in the active language', () => {
    expect(formatDayMonth('2026-09-08', 'pt-PT')).toBe('8 de setembro');
    expect(formatDayMonth('2026-09-08', 'en-GB')).toBe('8 September');
  });

  it('translates month names', () => {
    expect(monthName(1, 'pt-PT')).toBe('Fevereiro');
    expect(monthName(1, 'en-GB')).toBe('February');
  });

  it('adds days and counts calendar days', () => {
    expect(addDaysISO('2026-05-30', 1)).toBe('2026-05-31');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-09-11', '2026-09-18')).toBe(7);
    expect(daysBetween('2026-09-11', '2026-09-10')).toBe(-1);
  });
});

describe('award periods', () => {
  it('monthPeriod covers the whole month, including February in a leap year', () => {
    expect(monthPeriod('2026-09-14')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(monthPeriod('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthPeriod('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    // The first and last day of a month map to that same month.
    expect(monthPeriod('2026-12-01')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
    expect(monthPeriod('2026-12-31')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('recentMonths lists whole months backwards, crossing the new year', () => {
    expect(recentMonths('2027-01-15', 3)).toEqual([
      { start: '2027-01-01', end: '2027-01-31' },
      { start: '2026-12-01', end: '2026-12-31' },
      { start: '2026-11-01', end: '2026-11-30' },
    ]);
  });

  it('formatMonthYear reads naturally in both languages', () => {
    expect(formatMonthYear('2026-09-01', 'pt-PT')).toBe('Setembro de 2026');
    expect(formatMonthYear('2026-09-01', 'en-GB')).toBe('September 2026');
  });
});
