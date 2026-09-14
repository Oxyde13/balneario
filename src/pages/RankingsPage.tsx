import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../hooks/useFormat';
import { useAwards, useCakes, useFineStats, useMemberAwards, useMembers } from '../hooks/queries';
import { Avatar } from '../components/Avatar';
import { AwardsView } from '../components/AwardsView';
import { StylishView } from '../components/StylishView';
import { TypeBadge } from '../components/MemberBits';
import { Podium } from '../components/Podium';
import { ShareButton } from '../components/ShareButton';
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Tabs, cn } from '../components/ui';
import { shortName } from '../lib/members';
import { awardsMessage, rankingsMessage, stylishMessage } from '../lib/shareTexts';
import type { FineStat } from '../types/db';

type Tab = 'mostFined' | 'dodgers' | 'reliable' | 'cakes' | 'stylish';
const TABS: Tab[] = ['mostFined', 'dodgers', 'reliable', 'cakes', 'stylish'];

interface RankedEntry {
  member: FineStat;
  amount: number;
  count: number;
}

/** The three money rankings, shared by the tabs and the WhatsApp summary. */
function useRankings() {
  const stats = useFineStats();

  const data = useMemo(() => {
    const list = stats.data ?? [];

    const mostFined: RankedEntry[] = [...list]
      .sort((a, b) => b.total_amount - a.total_amount || b.fine_count - a.fine_count || a.name.localeCompare(b.name))
      .map((s) => ({ member: s, amount: s.total_amount, count: s.fine_count }));

    const dodgers: RankedEntry[] = list
      .filter((s) => s.unpaid_amount > 0)
      .sort((a, b) => b.unpaid_amount - a.unpaid_amount || a.name.localeCompare(b.name))
      .map((s) => ({ member: s, amount: s.unpaid_amount, count: s.unpaid_count }));

    // Most reliable: at least one fine and nothing left to pay.
    const reliable: RankedEntry[] = list
      .filter((s) => s.fine_count > 0 && s.unpaid_amount === 0)
      .sort((a, b) => b.paid_amount - a.paid_amount || b.fine_count - a.fine_count || a.name.localeCompare(b.name))
      .map((s) => ({ member: s, amount: s.paid_amount, count: s.fine_count }));

    return { mostFined, dodgers, reliable };
  }, [stats.data]);

  return { ...data, isLoading: stats.isLoading, error: stats.error, refetch: () => void stats.refetch() };
}

export function RankingsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'mostFined';
  const rankings = useRankings();

  const awards = useAwards();
  const stylish = useMemberAwards();
  const cakes = useCakes();
  const { data: members = [] } = useMembers();
  const cakeMap = useMemo(() => new Map((cakes.data ?? []).map((c) => [c.id, c])), [cakes.data]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const summaryShare = rankingsMessage(
    rankings.mostFined.slice(0, 3).map((e) => ({ name: shortName(e.member), amount: e.amount })),
    rankings.dodgers[0] ? { name: shortName(rankings.dodgers[0].member), amount: rankings.dodgers[0].amount } : null,
    rankings.reliable[0] ? { name: shortName(rankings.reliable[0].member), amount: rankings.reliable[0].amount } : null,
  );
  const awardsShare = awardsMessage(
    (awards.data ?? []).map((a) => {
      const cake = cakeMap.get(a.cake_id);
      const member = cake ? memberMap.get(cake.member_id) : undefined;
      return { kind: a.kind, position: a.position, name: member ? shortName(member) : '—', comment: a.comment };
    }),
  );

  const stylishShare = stylishMessage(
    (stylish.data ?? []).map((a) => {
      const member = memberMap.get(a.member_id);
      return {
        periodStart: a.period_start,
        name: member ? shortName(member) : '—',
        comment: a.comment,
      };
    }),
  );

  return (
    <div>
      <PageHeader
        title={t('rankings:title')}
        subtitle={t('rankings:subtitle')}
        actions={<ShareButton build={tab === 'stylish' ? stylishShare : tab === 'cakes' ? awardsShare : summaryShare} />}
      />
      <Tabs
        label={t('rankings:title')}
        value={tab}
        onChange={(value) => setParams({ tab: value }, { replace: true })}
        tabs={TABS.map((value) => ({ value, label: t(`rankings:tabs.${value}`) }))}
      />

      {tab === 'stylish' ? (
        <Card>
          <h2 className="mb-1 text-lg font-extrabold">🕺 {t('stylish:title')}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{t('stylish:subtitle')}</p>
          {stylish.error ? (
            <ErrorState error={stylish.error} onRetry={() => void stylish.refetch()} />
          ) : stylish.isLoading ? (
            <ListSkeleton rows={3} />
          ) : (stylish.data ?? []).length === 0 ? (
            <EmptyState emoji="🕺" title={t('stylish:empty')} text={t('stylish:emptyText')} />
          ) : (
            <StylishView awards={stylish.data ?? []} members={memberMap} />
          )}
        </Card>
      ) : tab === 'cakes' ? (
        <Card>
          <h2 className="mb-3 text-lg font-extrabold">🎂 {t('awards:title')}</h2>
          {awards.error ? (
            <ErrorState error={awards.error} onRetry={() => void awards.refetch()} />
          ) : awards.isLoading ? (
            <ListSkeleton rows={3} />
          ) : (awards.data ?? []).length === 0 ? (
            <EmptyState emoji="🍰" title={t('awards:empty')} text={t('awards:emptyText')} />
          ) : (
            <AwardsView awards={awards.data ?? []} cakes={cakeMap} members={memberMap} />
          )}
        </Card>
      ) : rankings.error ? (
        <ErrorState error={rankings.error} onRetry={rankings.refetch} />
      ) : rankings.isLoading ? (
        <ListSkeleton rows={6} />
      ) : tab === 'mostFined' ? (
        <RankingList
          entries={rankings.mostFined}
          empty={<EmptyState emoji="🧘" title={t('rankings:empty.mostFined')} />}
          podium
          value={(e) => fmt.money(e.amount)}
          detail={(e) => t('fines:count', { count: e.count })}
        />
      ) : tab === 'dodgers' ? (
        <>
          <p className="mb-3 text-sm italic text-muted-foreground">{t('rankings:dodgersJoke')}</p>
          <RankingList
            entries={rankings.dodgers}
            empty={<EmptyState emoji="😇" title={t('rankings:empty.dodgers')} />}
            highlight={{ emoji: '🦹', label: t('rankings:topDodger'), tone: 'danger' }}
            value={(e) => fmt.money(e.amount)}
            detail={(e) => t('fines:unpaidCount', { count: e.count })}
          />
        </>
      ) : (
        <RankingList
          entries={rankings.reliable}
          empty={<EmptyState emoji="🙈" title={t('rankings:empty.reliable')} />}
          highlight={{ emoji: '😇', label: t('rankings:mostReliable'), tone: 'success' }}
          value={(e) => fmt.money(e.amount)}
          detail={(e) => t('rankings:paidCount', { count: e.count })}
        />
      )}
    </div>
  );
}

function RankingList({
  entries,
  empty,
  podium,
  highlight,
  value,
  detail,
}: {
  entries: RankedEntry[];
  empty: ReactNode;
  podium?: boolean;
  highlight?: { emoji: string; label: string; tone: 'danger' | 'success' };
  value: (entry: RankedEntry) => ReactNode;
  detail: (entry: RankedEntry) => ReactNode;
}) {
  const { t } = useTranslation();
  if (entries.length === 0) return <>{empty}</>;
  const first = entries[0];
  const rest = podium ? entries.slice(3) : highlight ? entries.slice(1) : entries;

  return (
    <div className="space-y-4">
      {podium && (
        <Card>
          <Podium label={t('rankings:podium')} entries={entries.slice(0, 3).map((e) => ({ member: e.member, value: value(e), detail: detail(e) }))} />
        </Card>
      )}
      {highlight && (
        <Link
          to={`/team/${first.member.member_id}`}
          className={cn(
            'flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm',
            highlight.tone === 'danger' ? 'border-danger/40 bg-danger/5' : 'border-success/40 bg-success/5',
          )}
        >
          <span className="text-4xl" aria-hidden="true">
            {highlight.emoji}
          </span>
          <Avatar name={first.member.name} photoPath={first.member.photo_path} size="lg" />
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs font-bold uppercase tracking-wide', highlight.tone === 'danger' ? 'text-danger' : 'text-success')}>
              {highlight.label}
            </p>
            <p className="flex items-center gap-1.5 truncate text-lg font-extrabold">
              {first.member.name} <TypeBadge member={first.member} />
            </p>
            <p className="tabular text-2xl font-black">{value(first)}</p>
            {detail(first) && <p className="text-xs text-muted-foreground">{detail(first)}</p>}
          </div>
        </Link>
      )}
      {rest.length > 0 && (
        <ol className="space-y-2" start={entries.length - rest.length + 1}>
          {rest.map((entry, i) => (
            <li key={entry.member.member_id}>
              <Link to={`/team/${entry.member.member_id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-primary/40">
                <span className="tabular w-6 shrink-0 text-center font-extrabold text-muted-foreground">{entries.length - rest.length + i + 1}</span>
                <Avatar name={entry.member.name} photoPath={entry.member.photo_path} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">
                    {entry.member.name} <TypeBadge member={entry.member} />
                  </p>
                  {detail(entry) && <p className="truncate text-xs text-muted-foreground">{detail(entry)}</p>}
                </div>
                <span className="tabular shrink-0 font-extrabold">{value(entry)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
