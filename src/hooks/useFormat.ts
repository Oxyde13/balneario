import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDayMonth, formatWeekdayDayMonth, monthName } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { ISODate } from '../types/db';

/** Formatting bound to the active language. */
export function useFormat() {
  const { i18n } = useTranslation();
  const lng = i18n.language;
  return useMemo(
    () => ({
      lng,
      money: (amount: number | null | undefined) => formatMoney(amount ?? 0, lng),
      date: (iso: ISODate | null | undefined) => formatDate(iso),
      dayMonth: (iso: ISODate) => formatDayMonth(iso, lng),
      weekdayDayMonth: (iso: ISODate) => formatWeekdayDayMonth(iso, lng),
      month: (monthIndex: number) => monthName(monthIndex, lng),
    }),
    [lng],
  );
}
