import { describe, expect, it } from 'vitest';
import { ageOn, birthdayInWindow, birthdayInYear, cakeStatus, cakeWindow, nextBirthday, turningAge, windowMonths } from './birthdays';

const WINDOW = { start: '2026-09-07', end: '2027-05-31' };
const inWindow = (birth: string) => birthdayInWindow(birth, WINDOW);

describe('cakeWindow', () => {
  it('runs from 7 September to 31 May', () => {
    expect(cakeWindow('2026-09-12')).toEqual({ start: '2026-09-07', end: '2027-05-31' });
    expect(cakeWindow('2026-12-31')).toEqual({ start: '2026-09-07', end: '2027-05-31' });
  });

  it('keeps January–May inside the window that started last September', () => {
    expect(cakeWindow('2027-01-02')).toEqual({ start: '2026-09-07', end: '2027-05-31' });
    expect(cakeWindow('2027-05-31')).toEqual({ start: '2026-09-07', end: '2027-05-31' });
  });

  it('points to the next window during the summer', () => {
    expect(cakeWindow('2027-06-01')).toEqual({ start: '2027-09-07', end: '2028-05-31' });
    expect(cakeWindow('2027-07-20')).toEqual({ start: '2027-09-07', end: '2028-05-31' });
  });
});

describe('birthdayInYear', () => {
  it('keeps 29 February in leap years', () => {
    expect(birthdayInYear('2000-02-29', 2028)).toBe('2028-02-29');
  });

  it('falls back to 28 February in non-leap years', () => {
    expect(birthdayInYear('2000-02-29', 2027)).toBe('2027-02-28');
    expect(birthdayInYear('2000-02-29', 2100)).toBe('2100-02-28'); // 2100 is not a leap year
  });

  it('pads month and day', () => {
    expect(birthdayInYear('1995-09-08', 2026)).toBe('2026-09-08');
  });
});

describe('birthdayInWindow', () => {
  it('puts September–December birthdays in the starting year', () => {
    expect(inWindow('1995-09-08')).toBe('2026-09-08');
    expect(inWindow('1997-12-03')).toBe('2026-12-03');
  });

  it('puts January–May birthdays in the ending year', () => {
    expect(inWindow('2001-04-19')).toBe('2027-04-19');
    expect(inWindow('2000-02-29')).toBe('2027-02-28');
  });

  it('returns null for birthdays between 1 June and 6 September', () => {
    expect(inWindow('1998-07-15')).toBeNull();
    expect(inWindow('1978-08-22')).toBeNull();
    expect(inWindow('1990-06-01')).toBeNull();
    expect(inWindow('1990-09-06')).toBeNull();
  });

  it('includes both ends of the window', () => {
    expect(inWindow('1990-09-07')).toBe('2026-09-07');
    expect(inWindow('1990-05-31')).toBe('2027-05-31');
  });
});

describe('ages', () => {
  it('counts the age reached on a date', () => {
    expect(ageOn('1995-09-08', '2026-09-08')).toBe(31);
    expect(ageOn('1995-09-08', '2026-09-07')).toBe(30);
  });

  it('gives the age of a birthday', () => {
    expect(turningAge('1996-09-10', '2026-09-10')).toBe(30);
  });

  it('finds the next birthday, rolling over the year', () => {
    expect(nextBirthday('1995-09-08', '2026-09-11')).toBe('2027-09-08');
    expect(nextBirthday('1995-12-03', '2026-09-11')).toBe('2026-12-03');
    expect(nextBirthday('1995-09-11', '2026-09-11')).toBe('2026-09-11');
  });
});

describe('cakeStatus', () => {
  const today = '2026-09-11';

  it('is "brought" whatever the date, once it is brought', () => {
    expect(cakeStatus({ due_date: '2026-09-01', brought_on: '2026-09-02' }, today)).toBe('brought');
  });

  it('flags cakes without a date', () => {
    expect(cakeStatus({ due_date: null, brought_on: null }, today)).toBe('noDate');
  });

  it('separates today, this week, pending and overdue', () => {
    expect(cakeStatus({ due_date: '2026-09-11', brought_on: null }, today)).toBe('today');
    expect(cakeStatus({ due_date: '2026-09-17', brought_on: null }, today)).toBe('thisWeek');
    expect(cakeStatus({ due_date: '2026-09-18', brought_on: null }, today)).toBe('pending');
    expect(cakeStatus({ due_date: '2026-09-10', brought_on: null }, today)).toBe('overdue');
  });
});

describe('windowMonths', () => {
  it('lists September to May in order', () => {
    const months = windowMonths(WINDOW);
    expect(months).toHaveLength(9);
    expect(months[0]).toEqual([2026, 8]);
    expect(months[8]).toEqual([2027, 4]);
  });
});
