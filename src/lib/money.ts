const formatters = new Map<string, Intl.NumberFormat>();

/** Euros in the given locale: "2,00 €" (pt-PT) / "€2.00" (en-GB). */
export function formatMoney(amount: number | string | null | undefined, lng: string): string {
  let formatter = formatters.get(lng);
  if (!formatter) {
    formatter = new Intl.NumberFormat(lng, { style: 'currency', currency: 'EUR' });
    formatters.set(lng, formatter);
  }
  return formatter.format(Number(amount ?? 0));
}

/** Supabase returns numeric columns as numbers, but be defensive. */
export function toAmount(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function sumAmounts<T>(rows: T[], pick: (row: T) => number | string | null | undefined): number {
  return toAmount(rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0));
}
