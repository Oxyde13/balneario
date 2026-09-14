import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useFines, useMembers, useRules } from '../hooks/queries';
import { FineRow, FineSheet } from '../components/FineBits';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  SectionTitle,
  Segmented,
  Select,
  Stat,
  buttonClass,
} from '../components/ui';
import { FilterIcon, PlusIcon } from '../components/icons';
import { localized } from '../lib/localized';
import { splitSquad } from '../lib/members';
import { sumAmounts } from '../lib/money';
import type { Fine } from '../types/db';

type StatusFilter = 'all' | 'paid' | 'unpaid';
const ADHOC = '__adhoc__';

export function FinesPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<Fine | null>(null);
  const [showFilters, setShowFilters] = useState(() => ['member', 'category', 'from', 'to'].some((k) => params.has(k)));

  const fines = useFines();
  const { data: members = [] } = useMembers();
  const { data: rules = [] } = useRules();

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const ruleMap = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const squad = useMemo(() => splitSquad(members), [members]);

  const filters = {
    member: params.get('member') ?? '',
    status: (params.get('status') as StatusFilter) || 'all',
    category: params.get('category') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
  const setFilter = (key: keyof typeof filters, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const activeFilterCount = ['member', 'category', 'from', 'to'].filter((k) => params.get(k)).length;

  const categoryOf = (fine: Fine) => {
    const rule = fine.rule_id ? ruleMap.get(fine.rule_id) : undefined;
    return rule ? localized(rule, 'category') || t('rules:uncategorized') : ADHOC;
  };
  const categories = [...new Set((fines.data ?? []).map(categoryOf))].sort((a, b) =>
    a === ADHOC ? 1 : b === ADHOC ? -1 : a.localeCompare(b),
  );

  const matches = (fine: Fine) => {
    if (filters.member && fine.member_id !== filters.member) return false;
    if (filters.status === 'paid' && !fine.paid_at) return false;
    if (filters.status === 'unpaid' && fine.paid_at) return false;
    if (filters.category && categoryOf(fine) !== filters.category) return false;
    if (filters.from && fine.occurred_on < filters.from) return false;
    if (filters.to && fine.occurred_on > filters.to) return false;
    return true;
  };

  const list = (fines.data ?? []).filter(matches);

  const totals = {
    total: sumAmounts(list, (f) => f.amount),
    paid: sumAmounts(list.filter((f) => f.paid_at), (f) => f.amount),
    unpaid: sumAmounts(list.filter((f) => !f.paid_at), (f) => f.amount),
  };

  return (
    <div>
      <PageHeader
        title={t('fines:title')}
        subtitle={t('fines:subtitle')}
        actions={
          isAdmin ? (
            <Link to="/fines/new" className={buttonClass('primary', 'sm')}>
              <PlusIcon className="h-4 w-4" />
              {t('fines:assign.cta')}
            </Link>
          ) : undefined
        }
      />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label={t('fines:totals.total')} value={fmt.money(totals.total)} tone="primary" />
        <Stat label={t('fines:totals.paid')} value={fmt.money(totals.paid)} tone="success" />
        <Stat label={t('fines:totals.unpaid')} value={fmt.money(totals.unpaid)} tone="danger" />
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex items-stretch gap-2">
          <Segmented
            label={t('fines:filters.status')}
            value={filters.status}
            onChange={(v) => setFilter('status', v)}
            size="sm"
            className="flex-1"
            options={[
              { value: 'all', label: t('fines:filters.all') },
              { value: 'unpaid', label: t('fines:unpaid') },
              { value: 'paid', label: t('fines:paid') },
            ]}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="fine-filters"
            className="shrink-0"
          >
            <FilterIcon className="h-4 w-4" />
            {/* The label only fits from small screens up; the icon + badge carry it on phones. */}
            <span className="sr-only sm:not-sr-only">{t('fines:filters.more')}</span>
            {activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilterCount}</span>}
          </Button>
        </div>
        {showFilters && (
          <div id="fine-filters" className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-2">
            <Field label={t('fines:filters.member')} htmlFor="filter-member">
              <Select id="filter-member" value={filters.member} onChange={(e) => setFilter('member', e.target.value)}>
                <option value="">{t('fines:filters.allMembers')}</option>
                <optgroup label={t('common:filterType.players')}>
                  {squad.players.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.shirt_number != null ? `${m.shirt_number} · ` : ''}
                      {m.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t('common:filterType.staff')}>
                  {squad.staff.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label={t('fines:filters.category')} htmlFor="filter-category">
              <Select id="filter-category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">{t('fines:filters.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === ADHOC ? t('fines:adhoc') : c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('fines:filters.from')} htmlFor="filter-from">
              <Input id="filter-from" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
            </Field>
            <Field label={t('fines:filters.to')} htmlFor="filter-to">
              <Input id="filter-to" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
            </Field>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="sm:col-span-2"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  ['member', 'category', 'from', 'to'].forEach((k) => next.delete(k));
                  setParams(next, { replace: true });
                }}
              >
                {t('fines:filters.clear')}
              </Button>
            )}
          </div>
        )}
      </div>

      <SectionTitle>{t('fines:count', { count: list.length })}</SectionTitle>
      {fines.error ? (
        <ErrorState error={fines.error} onRetry={() => void fines.refetch()} />
      ) : fines.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="😇"
          title={(fines.data ?? []).length === 0 ? t('fines:empty.none') : t('fines:empty.filtered')}
          text={(fines.data ?? []).length === 0 ? t('fines:empty.noneText') : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((fine) => (
            <li key={fine.id}>
              <FineRow fine={fine} member={memberMap.get(fine.member_id)} onOpen={isAdmin ? () => setOpen(fine) : undefined} />
            </li>
          ))}
        </ul>
      )}

      {open && <FineSheet fine={open} member={memberMap.get(open.member_id)} onClose={() => setOpen(null)} />}
    </div>
  );
}
