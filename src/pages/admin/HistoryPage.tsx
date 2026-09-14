import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/useFormat';
import { useActivityLog, useCakes, useMembers } from '../../hooks/queries';
import { Button, Card, EmptyState, ErrorState, Field, Input, ListSkeleton, PageHeader, Select } from '../../components/ui';
import { describeActivity } from '../../lib/activity';
import { formatDateTime } from '../../lib/dates';
import type { ActivityLogEntry } from '../../types/db';

const TABLES = ['fines', 'members', 'fine_rules', 'cakes', 'cake_awards', 'member_awards', 'dinners'] as const;

export default function HistoryPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data: members = [] } = useMembers();
  const { data: cakes = [] } = useCakes();
  const [filters, setFilters] = useState({ table: '', from: '', to: '' });
  const log = useActivityLog(filters);

  const ctx = useMemo(
    () => ({
      members: new Map(members.map((m) => [m.id, m])),
      cakes: new Map(cakes.map((c) => [c.id, c])),
      lng: fmt.lng,
      t,
    }),
    [members, cakes, fmt.lng, t],
  );

  const entries = log.data?.pages.flat() ?? [];

  return (
    <div>
      <PageHeader title={t('admin:history.title')} subtitle={t('admin:history.subtitle')} />
      <Card className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label={t('admin:history.filterTable')} htmlFor="h-table">
          <Select id="h-table" value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value })}>
            <option value="">{t('admin:history.allTables')}</option>
            {TABLES.map((table) => (
              <option key={table} value={table}>
                {t(`admin:history.tables.${table}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('fines:filters.from')} htmlFor="h-from">
          <Input id="h-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </Field>
        <Field label={t('fines:filters.to')} htmlFor="h-to">
          <Input id="h-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </Field>
      </Card>

      {log.error ? (
        <ErrorState error={log.error} onRetry={() => void log.refetch()} />
      ) : log.isLoading ? (
        <ListSkeleton rows={8} />
      ) : entries.length === 0 ? (
        <EmptyState emoji="📭" title={t('admin:history.empty')} />
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <HistoryItem key={entry.id} entry={entry} view={describeActivity(entry, ctx)} />
            ))}
          </ul>
          {log.hasNextPage && (
            <Button variant="secondary" block className="mt-4" loading={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
              {t('common:actions.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function HistoryItem({ entry, view }: { entry: ActivityLogEntry; view: ReturnType<typeof describeActivity> }) {
  const { t, i18n } = useTranslation();
  return (
    <li className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">
          {view.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{view.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(entry.created_at, i18n.language)} · {t(`admin:history.tables.${entry.table_name}`)}
          </p>
          {view.changes.length > 0 && (
            <details className="mt-1">
              <summary className="min-h-touch cursor-pointer py-2 text-sm font-semibold text-link">
                {t('admin:history.changes', { count: view.changes.length })}
              </summary>
              <dl className="space-y-1 text-sm">
                {view.changes.map((change) => (
                  <div key={change.field} className="grid grid-cols-[minmax(0,8rem)_1fr] gap-2">
                    <dt className="truncate text-muted-foreground">{change.label}</dt>
                    <dd className="min-w-0 break-words">
                      <span className="text-danger line-through">{change.before}</span> → <span className="font-semibold text-success">{change.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
