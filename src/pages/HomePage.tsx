import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useCakeRows } from '../hooks/useCakeRows';
import { useAwards, useCakes, useDinnerFund, useFineStats, useMemberAwards, useMembers } from '../hooks/queries';
import { Avatar } from '../components/Avatar';
import { AwardsView } from '../components/AwardsView';
import { CakeStatusBadge } from '../components/CakeBits';
import { MemberLine, TypeBadge } from '../components/MemberBits';
import { Podium } from '../components/Podium';
import { ShareButton } from '../components/ShareButton';
import { StylishView } from '../components/StylishView';
import { Card, EmptyState, ErrorState, Skeleton, Stat, buttonClass } from '../components/ui';
import { ChevronRightIcon, PlusIcon } from '../components/icons';
import { birthdayInYear, nextBirthday, turningAge } from '../lib/birthdays';
import { daysBetween, formatMonthYear, todayISO } from '../lib/dates';
import { shortName } from '../lib/members';
import { awardsMessage, birthdayMessage, cakesReminderMessage, dinnerMessage, stylishMessage } from '../lib/shareTexts';

export function HomePage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('home:title')}</h1>
        {isAdmin && (
          <Link to="/fines/new" className={buttonClass('primary', 'sm')}>
            <PlusIcon className="h-4 w-4" />
            {t('fines:assign.cta')}
          </Link>
        )}
      </div>
      <TodayBirthdays />
      <div className="grid gap-4 md:grid-cols-2">
        <MonthBirthdaysCard />
        <CakesCard />
        <TopDodgerCard />
        <FinesPodiumCard />
        <DinnerFundCard />
        <AwardsCard />
        <StylishCard />
      </div>
    </div>
  );
}

function CardTitle({ children, to, action }: { children: ReactNode; to?: string; action?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-extrabold">{children}</h2>
      <div className="flex items-center gap-1">
        {action}
        {to && (
          <Link to={to} className="flex min-h-touch items-center text-sm font-semibold text-link" aria-label={t('common:actions.seeAll')}>
            {t('common:actions.seeAll')}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function TodayBirthdays() {
  const { t } = useTranslation();
  const { data: members = [] } = useMembers();
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const celebrating = members.filter((m) => m.active && birthdayInYear(m.birth_date, year) === today);
  if (celebrating.length === 0) return null;

  return (
    <div className="space-y-3">
      {celebrating.map((member) => (
        <div
          key={member.id}
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground shadow-md"
        >
          <span className="text-4xl" aria-hidden="true">
            🎂
          </span>
          <Avatar name={member.name} photoPath={member.photo_path} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold">{t('home:today.title', { name: shortName(member) })}</p>
            <p className="text-sm opacity-90">{t('birthdays:turns', { count: turningAge(member.birth_date, today) })}</p>
          </div>
          <ShareButton build={birthdayMessage(shortName(member))} />
        </div>
      ))}
    </div>
  );
}

function MonthBirthdaysCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data: members = [], isLoading, error, refetch } = useMembers();
  const { data: cakes = [] } = useCakes();
  const today = todayISO();
  const month = Number(today.slice(5, 7));
  const year = Number(today.slice(0, 4));

  const { thisMonth, next } = useMemo(() => {
    const active = members.filter((m) => m.active);
    const thisMonth = active
      .filter((m) => Number(m.birth_date.slice(5, 7)) === month)
      .map((m) => ({ member: m, date: birthdayInYear(m.birth_date, year) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = active
      .map((m) => ({ member: m, date: nextBirthday(m.birth_date, today) }))
      .filter((x) => x.date > today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { thisMonth, next: upcoming[0] ?? null };
  }, [members, month, year, today]);

  const cakeByMember = new Map(cakes.map((c) => [c.member_id, c]));

  return (
    <Card>
      <CardTitle to="/birthdays">🎉 {t('home:birthdays.title', { month: fmt.month(month - 1) })}</CardTitle>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-24" />
      ) : thisMonth.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('home:birthdays.none')}</p>
      ) : (
        <ul className="space-y-2">
          {thisMonth.map(({ member, date }) => {
            const cake = cakeByMember.get(member.id);
            return (
              <li key={member.id}>
                <MemberLine
                  member={member}
                  size="sm"
                  subtitle={`${fmt.dayMonth(date)} · ${t('birthdays:turns', { count: turningAge(member.birth_date, date) })}`}
                  trailing={cake?.brought_on ? <CakeStatusBadge status="brought" /> : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
      {next && (
        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <span className="font-semibold">{t('home:birthdays.next')}</span>{' '}
          {t('home:birthdays.nextValue', {
            name: shortName(next.member),
            date: fmt.dayMonth(next.date),
            count: daysBetween(today, next.date),
          })}
        </p>
      )}
    </Card>
  );
}

function CakesCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { rows, isLoading, error, refetch } = useCakeRows();

  const week = rows
    .filter((r) => r.status === 'today' || r.status === 'thisWeek')
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const overdue = rows.filter((r) => r.status === 'overdue').sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const noDate = rows.filter((r) => r.status === 'noDate');

  const share = cakesReminderMessage(
    week.map((r) => ({ name: shortName(r.member), date: r.dueDate })),
    overdue.map((r) => ({ name: shortName(r.member), date: r.dueDate })),
  );

  return (
    <Card>
      <CardTitle to="/birthdays" action={<ShareButton build={share} iconOnly />}>
        🍰 {t('home:cakes.title')}
      </CardTitle>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <Skeleton className="h-24" />
      ) : week.length + overdue.length + noDate.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('home:cakes.allGood')}</p>
      ) : (
        <ul className="space-y-2">
          {[...week, ...overdue, ...noDate].map((row) => (
            <li key={row.member.id}>
              <MemberLine
                member={row.member}
                size="sm"
                subtitle={row.dueDate ? fmt.date(row.dueDate) : t('birthdays:waitingDate')}
                trailing={<CakeStatusBadge status={row.status} />}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopDodgerCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data = [], isLoading, error, refetch } = useFineStats();
  const dodger = [...data].filter((s) => s.unpaid_amount > 0).sort((a, b) => b.unpaid_amount - a.unpaid_amount)[0];

  return (
    <Card>
      <CardTitle to="/rankings?tab=dodgers">🦹 {t('rankings:topDodger')}</CardTitle>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-20" />
      ) : !dodger ? (
        <EmptyState emoji="😇" title={t('rankings:empty.dodgers')} />
      ) : (
        <Link to={`/team/${dodger.member_id}`} className="flex items-center gap-4 rounded-xl bg-danger/5 p-3 hover:bg-danger/10">
          <Avatar name={dodger.name} photoPath={dodger.photo_path} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-lg font-extrabold">
              {dodger.name} <TypeBadge member={dodger} />
            </p>
            <p className="tabular text-2xl font-black text-danger">{fmt.money(dodger.unpaid_amount)}</p>
            <p className="text-xs text-muted-foreground">{t('fines:count', { count: dodger.unpaid_count })}</p>
            <p className="mt-1 text-sm italic text-muted-foreground">{t('home:dodgerJoke')}</p>
          </div>
        </Link>
      )}
    </Card>
  );
}

function FinesPodiumCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data = [], isLoading, error, refetch } = useFineStats();
  const top = [...data].sort((a, b) => b.total_amount - a.total_amount || b.fine_count - a.fine_count).slice(0, 3);

  return (
    <Card>
      <CardTitle to="/rankings">🏆 {t('home:podium.title')}</CardTitle>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-36" />
      ) : top.length === 0 ? (
        <EmptyState emoji="🧘" title={t('rankings:empty.mostFined')} />
      ) : (
        <Podium
          label={t('home:podium.title')}
          entries={top.map((s) => ({
            member: s,
            value: fmt.money(s.total_amount),
            detail: t('fines:count', { count: s.fine_count }),
          }))}
        />
      )}
    </Card>
  );
}

export function DinnerFundCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data, isLoading, error, refetch } = useDinnerFund();

  return (
    <Card>
      <CardTitle to="/dinners" action={data ? <ShareButton build={dinnerMessage(data.collected, data.pending)} iconOnly /> : undefined}>
        🍽️ {t('dinner:card.title')}
      </CardTitle>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="space-y-3">
          <p className="text-lg">
            {t('dinner:card.collectedPrefix')}{' '}
            <span className="tabular text-3xl font-black text-success">{fmt.money(data.collected)}</span>{' '}
            {t('dinner:card.collectedSuffix')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t('dinner:card.pending')} value={fmt.money(data.pending)} tone="danger" />
            <Stat label={t('dinner:card.potential')} value={fmt.money(data.potential)} tone="primary" />
          </div>
          {data.last_dinner_date && (
            <p className="text-xs text-muted-foreground">{t('dinner:card.since', { date: fmt.date(data.last_dinner_date) })}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function AwardsCard() {
  const { t } = useTranslation();
  const { data: awards = [] } = useAwards();
  const { data: cakes = [] } = useCakes();
  const { data: members = [] } = useMembers();
  if (awards.length === 0) return null;

  const cakeMap = new Map(cakes.map((c) => [c.id, c]));
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const share = awardsMessage(
    awards.map((a) => {
      const cake = cakeMap.get(a.cake_id);
      const member = cake ? memberMap.get(cake.member_id) : undefined;
      return { kind: a.kind, position: a.position, name: member ? shortName(member) : '—', comment: a.comment };
    }),
  );

  return (
    <Card className="md:col-span-2">
      <CardTitle to="/rankings?tab=cakes" action={<ShareButton build={share} iconOnly />}>
        🎂 {t('awards:title')}
      </CardTitle>
      <AwardsView awards={awards} cakes={cakeMap} members={memberMap} />
    </Card>
  );
}

/** The three most recent monthly winners; hidden until there is at least one. */
function StylishCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data: awards = [] } = useMemberAwards();
  const { data: members = [] } = useMembers();
  if (awards.length === 0) return null;

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const share = stylishMessage(
    awards.map((a) => {
      const member = memberMap.get(a.member_id);
      return { month: formatMonthYear(a.period_start, fmt.lng), name: member ? shortName(member) : '—', comment: a.comment };
    }),
  );

  return (
    <Card>
      <CardTitle to="/rankings?tab=stylish" action={<ShareButton build={share} iconOnly />}>
        🕺 {t('stylish:title')}
      </CardTitle>
      <StylishView awards={awards} members={memberMap} limit={3} />
    </Card>
  );
}
