import type { TFunction } from 'i18next';

// Stable error codes raised by the database triggers/functions.
const DB_ERROR_CODES = [
  'FINE_LOCKED',
  'PAYMENT_BEFORE_DINNER',
  'DINNER_IMMUTABLE',
  'DINNER_NOT_LATEST',
  'DINNER_BEFORE_PREVIOUS',
  'CAKE_HAS_AWARD',
  'AWARD_CAKE_NOT_BROUGHT',
  'AWARD_CAKE_NOT_FOUND',
  'AWARD_MEMBER_INACTIVE',
  'AWARD_MEMBER_NOT_FOUND',
  'MEMBER_DELETE_FORBIDDEN',
  'NOT_ADMIN',
] as const;

type ErrorLike = { message?: string; code?: string } | null | undefined;

export function errorMessage(error: unknown, t: TFunction): string {
  const e = error as ErrorLike;
  const message = e?.message ?? '';
  const code = DB_ERROR_CODES.find((c) => message.includes(c));
  if (code) return t(`common:dbErrors.${code}`);
  if (e?.code === '23505') return t('common:dbErrors.duplicate');
  if (e?.code === '42501' || /row-level security/i.test(message)) return t('common:dbErrors.forbidden');
  if (/failed to fetch|network/i.test(message)) return t('common:dbErrors.network');
  return t('common:dbErrors.generic');
}
