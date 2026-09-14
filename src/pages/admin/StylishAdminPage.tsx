import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/useFormat';
import {
  useClearMemberAward,
  useMemberAwards,
  useMembers,
  useSetMemberAward,
  useUpdateMemberAward,
} from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { Avatar } from '../../components/Avatar';
import { Sheet } from '../../components/Sheet';
import { Button, Card, EmptyState, ErrorState, Field, Input, ListSkeleton, PageHeader, cn } from '../../components/ui';
import { SearchIcon } from '../../components/icons';
import { errorMessage } from '../../lib/errors';
import { formatMonthYear, recentMonths, todayISO } from '../../lib/dates';
import { matchesSearch } from '../../lib/members';
import type { MemberAward } from '../../types/db';

/** A season's worth of months to look back on. */
const MONTHS = 12;

interface Period {
  start: string;
  end: string;
}

export default function StylishAdminPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const awards = useMemberAwards();
  const { data: members = [] } = useMembers();
  const [period, setPeriod] = useState<Period | null>(null);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const byPeriod = useMemo(
    () => new Map((awards.data ?? []).map((a) => [`${a.period_start}/${a.period_end}`, a])),
    [awards.data],
  );
  const periods = useMemo(() => recentMonths(todayISO(), MONTHS), []);

  return (
    <div>
      <PageHeader title={t('stylish:title')} subtitle={t('stylish:adminSubtitle')} />
      {awards.error ? (
        <ErrorState error={awards.error} onRetry={() => void awards.refetch()} />
      ) : awards.isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <Card>
          <ol className="space-y-2">
            {periods.map((p, index) => {
              const award = byPeriod.get(`${p.start}/${p.end}`);
              const member = award ? memberMap.get(award.member_id) : undefined;
              return (
                <li key={p.start}>
                  <button
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 p-2 text-left transition hover:border-primary/60',
                      award ? 'border-border bg-card' : 'border-dashed border-border bg-muted/40',
                    )}
                  >
                    <span className="w-28 shrink-0 text-sm font-bold sm:w-36">
                      {formatMonthYear(p.start, fmt.lng)}
                      {index === 0 && <span className="block text-xs font-semibold text-link">{t('stylish:currentMonth')}</span>}
                    </span>
                    {member ? (
                      <>
                        <Avatar name={member.name} photoPath={member.photo_path} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{member.name}</span>
                          {award?.comment && <span className="block truncate text-sm italic text-muted-foreground">“{award.comment}”</span>}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">{t('stylish:pick')}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {period && (
        <PeriodSheet
          period={period}
          award={byPeriod.get(`${period.start}/${period.end}`)}
          onClose={() => setPeriod(null)}
        />
      )}
    </div>
  );
}

function PeriodSheet({ period, award, onClose }: { period: Period; award: MemberAward | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const { data: members = [] } = useMembers();
  const setAward = useSetMemberAward();
  const updateAward = useUpdateMemberAward();
  const clearAward = useClearMemberAward();
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState(award?.comment ?? '');

  // The database rejects inactive members, so they are not offered here.
  const options = members.filter((m) => m.active && matchesSearch(m, search));

  const done = (message: string) => {
    toast(message);
    onClose();
  };
  const fail = (e: unknown) => toast(errorMessage(e, t), 'error');
  const saved = () => done(t('stylish:saved'));

  const choose = (memberId: string) => {
    const trimmed = comment.trim() || null;
    if (award) updateAward.mutate({ id: award.id, memberId, comment: trimmed }, { onSuccess: saved, onError: fail });
    else
      setAward.mutate(
        { kind: 'stylish', memberId, periodStart: period.start, periodEnd: period.end, comment: trimmed },
        { onSuccess: saved, onError: fail },
      );
  };

  return (
    <Sheet open onClose={onClose} title={formatMonthYear(period.start, fmt.lng)} size="lg">
      <div className="space-y-4">
        <Field label={t('stylish:comment')} htmlFor="stylish-comment" optional hint={t('stylish:commentHint')}>
          <Input
            id="stylish-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('stylish:commentPlaceholder')}
          />
        </Field>
        {award && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={comment === (award.comment ?? '')}
              loading={updateAward.isPending}
              onClick={() =>
                updateAward.mutate(
                  { id: award.id, memberId: award.member_id, comment: comment.trim() || null },
                  { onSuccess: saved, onError: fail },
                )
              }
            >
              {t('stylish:save')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              loading={clearAward.isPending}
              onClick={() => clearAward.mutate(award.id, { onSuccess: () => done(t('stylish:cleared')), onError: fail })}
            >
              {t('stylish:clear')}
            </Button>
          </div>
        )}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            placeholder={t('stylish:searchMember')}
            aria-label={t('stylish:searchMember')}
          />
        </div>

        {options.length === 0 ? (
          <EmptyState emoji="🕺" title={t('stylish:noActiveMembers')} />
        ) : (
          <ul className="space-y-2">
            {options.map((member) => {
              const isHere = award?.member_id === member.id;
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    disabled={setAward.isPending || updateAward.isPending || isHere}
                    onClick={() => choose(member.id)}
                    className={cn(
                      'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-2 text-left transition',
                      isHere ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/60',
                    )}
                  >
                    <Avatar name={member.name} photoPath={member.photo_path} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{member.name}</span>
                    {isHere && <span className="shrink-0 text-sm font-bold text-link">{t('stylish:currentWinner')}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
