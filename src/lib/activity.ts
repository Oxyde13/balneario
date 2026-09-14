import type { TFunction } from 'i18next';
import { formatDate, formatMonthYear } from './dates';
import { formatMoney } from './money';
import type { ActivityLogEntry, Cake, Member } from '../types/db';

export interface ActivityContext {
  members: Map<string, Member>;
  cakes: Map<string, Cake>;
  lng: string;
  t: TFunction;
}

export interface ActivityChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ActivityView {
  emoji: string;
  title: string;
  changes: ActivityChange[];
}

type Row = Record<string, unknown>;

const HIDDEN_FIELDS = new Set(['id', 'created_at']);
const MONEY_FIELDS = new Set(['amount', 'fund_amount']);
const DATE_FIELDS = new Set(['occurred_on', 'paid_at', 'birth_date', 'due_date', 'brought_on', 'held_on']);

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

export function describeActivity(entry: ActivityLogEntry, ctx: ActivityContext): ActivityView {
  const { t, lng } = ctx;
  const before = (entry.old_data ?? {}) as Row;
  const after = (entry.new_data ?? {}) as Row;
  const row = entry.action === 'delete' ? before : after;

  const memberName = (id: unknown) => ctx.members.get(str(id))?.name ?? t('admin:history.unknownMember');
  const money = (value: unknown) => formatMoney(Number(value ?? 0), lng);
  const changed = (field: string) => entry.action === 'update' && str(before[field]) !== str(after[field]);

  const formatValue = (field: string, value: unknown): string => {
    if (value == null || value === '') return '—';
    if (MONEY_FIELDS.has(field)) return money(value);
    if (DATE_FIELDS.has(field)) return formatDate(str(value));
    if (field === 'member_id') return memberName(value);
    if (typeof value === 'boolean') return value ? t('common:yes') : t('common:no');
    if (Array.isArray(value)) return value.join(', ');
    return str(value);
  };

  const changes: ActivityChange[] =
    entry.action === 'update'
      ? Object.keys({ ...before, ...after })
          .filter((field) => !HIDDEN_FIELDS.has(field) && changed(field))
          .map((field) => ({
            field,
            label: t(`admin:history.fields.${field}`, { defaultValue: field }),
            before: formatValue(field, before[field]),
            after: formatValue(field, after[field]),
          }))
      : [];

  const h = (key: string, values: Record<string, unknown> = {}) => t(`admin:history.events.${key}`, values);

  switch (entry.table_name) {
    case 'fines': {
      const values = { name: memberName(row.member_id), amount: money(row.amount), description: str(row.description) };
      if (entry.action === 'insert') return { emoji: '💸', title: h('fineCreated', values), changes };
      if (entry.action === 'delete') return { emoji: '🗑️', title: h('fineDeleted', values), changes };
      if (!before.paid_at && after.paid_at) return { emoji: '✅', title: h('finePaid', values), changes };
      if (before.paid_at && !after.paid_at) return { emoji: '↩️', title: h('fineUnpaid', values), changes };
      return { emoji: '✏️', title: h('fineUpdated', values), changes };
    }
    case 'members': {
      const values = { name: str(row.name) };
      if (entry.action === 'insert') return { emoji: '🙋', title: h('memberCreated', values), changes };
      if (entry.action === 'delete') return { emoji: '🗑️', title: h('memberDeleted', values), changes };
      if (changed('active')) {
        return after.active
          ? { emoji: '🔄', title: h('memberReactivated', values), changes }
          : { emoji: '👋', title: h('memberDeactivated', values), changes };
      }
      if (changed('photo_path')) return { emoji: '📸', title: h('memberPhoto', values), changes };
      return { emoji: '✏️', title: h('memberUpdated', values), changes };
    }
    case 'fine_rules': {
      const values = { title: str(row.title) };
      if (entry.action === 'insert') return { emoji: '📜', title: h('ruleCreated', values), changes };
      if (entry.action === 'delete') return { emoji: '🗑️', title: h('ruleDeleted', values), changes };
      if (changed('active')) {
        return after.active
          ? { emoji: '🔄', title: h('ruleReactivated', values), changes }
          : { emoji: '🚫', title: h('ruleDeactivated', values), changes };
      }
      return { emoji: '✏️', title: h('ruleUpdated', values), changes };
    }
    case 'cakes': {
      const values = {
        name: memberName(row.member_id),
        date: formatDate(str(after.brought_on || after.due_date)),
      };
      if (entry.action === 'insert') return { emoji: '📅', title: h('cakeCreated', values), changes };
      if (entry.action === 'delete') return { emoji: '🗑️', title: h('cakeDeleted', values), changes };
      if (!before.brought_on && after.brought_on) return { emoji: '🎂', title: h('cakeBrought', values), changes };
      if (before.brought_on && !after.brought_on) return { emoji: '↩️', title: h('cakeUnbrought', values), changes };
      if (changed('due_date')) {
        return after.due_date
          ? { emoji: '📅', title: h('cakeDateSet', values), changes }
          : { emoji: '📅', title: h('cakeDateCleared', values), changes };
      }
      return { emoji: '✏️', title: h('cakeUpdated', values), changes };
    }
    case 'cake_awards': {
      const cake = ctx.cakes.get(str(row.cake_id));
      const kind = str(row.kind) === 'worst' ? 'worst' : 'best';
      const values = {
        name: cake ? memberName(cake.member_id) : t('admin:history.unknownMember'),
        place: t(`awards:place.${kind}${Number(row.position) || 1}`),
      };
      if (entry.action === 'insert') return { emoji: kind === 'best' ? '🏅' : '🥴', title: h('awardSet', values), changes };
      if (entry.action === 'delete') return { emoji: '🧹', title: h('awardCleared', values), changes };
      return { emoji: '✏️', title: h('awardUpdated', values), changes };
    }
    case 'member_awards': {
      const values = {
        name: memberName(str(row.member_id)),
        month: formatMonthYear(str(row.period_start), lng),
      };
      if (entry.action === 'insert') return { emoji: '🕺', title: h('stylishSet', values), changes };
      if (entry.action === 'delete') return { emoji: '🧹', title: h('stylishCleared', values), changes };
      return { emoji: '✏️', title: h('stylishUpdated', values), changes };
    }
    case 'dinners': {
      const values = { amount: money(row.fund_amount), date: formatDate(str(row.held_on)) };
      if (entry.action === 'insert') return { emoji: '🍽️', title: h('dinnerRegistered', values), changes };
      if (entry.action === 'delete') return { emoji: '↩️', title: h('dinnerUndone', values), changes };
      return { emoji: '✏️', title: h('dinnerUpdated', values), changes };
    }
    default:
      return { emoji: '•', title: `${entry.table_name} ${entry.action}`, changes };
  }
}
