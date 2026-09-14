import i18n from './i18n';
import { isEnglish } from './language';

type Localizable<K extends string> = { [P in K]: string | null } & { [P in `${K}_en`]?: string | null };

/**
 * Database content in the active language: `row[field_en]` in English when it
 * has text, otherwise the pt-PT `row[field]` (silent fallback).
 */
export function localized<K extends string>(row: Localizable<K>, field: K, lng: string = i18n.language): string {
  if (isEnglish(lng)) {
    const en = row[`${field}_en` as `${K}_en`];
    if (typeof en === 'string' && en.trim() !== '') return en;
  }
  return row[field] ?? '';
}
