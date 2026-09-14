import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useCakeRows } from '../hooks/useCakeRows';
import { useMemberFines, useMembers, useUpdateFines } from '../hooks/queries';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { CakeStatusBadge } from '../components/CakeBits';
import { FineRow, FineSheet, defaultPaymentDate, useDinnerLock } from '../components/FineBits';
import { TypeBadge, memberSubtitle } from '../components/MemberBits';
import { ConfirmSheet } from '../components/Sheet';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, ListSkeleton, SectionTitle, Skeleton, Stat, buttonClass } from '../components/ui';
import { ChevronLeftIcon, EditIcon } from '../components/icons';
import { nextBirthday, turningAge } from '../lib/birthdays';
import { todayISO } from '../lib/dates';
import { errorMessage } from '../lib/errors';
import { sumAmounts } from '../lib/money';
import type { Fine } from '../types/db';

export function MemberPage() {
  const { memberId } = useParams();
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const members = useMembers();
  const fines = useMemberFines(memberId);
  const cakeRows = useCakeRows();
  const updateFines = useUpdateFines();
  const { minPaymentDate } = useDinnerLock();
  const [open, setOpen] = useState<Fine | null>(null);
  const [payAllOpen, setPayAllOpen] = useState(false);
  const [payAllDate, setPayAllDate] = useState(() => defaultPaymentDate(minPaymentDate));

  const member = members.data?.find((m) => m.id === memberId);
  const cakeRow = cakeRows.rows.find((r) => r.member.id === memberId);

  const allFines = fines.data ?? [];
  const unpaid = allFines.filter((f) => !f.paid_at);

  if (members.error) return <ErrorState error={members.error} onRetry={() => void members.refetch()} />;
  if (members.isLoading) return <ListSkeleton rows={5} />;
  if (!member) return <EmptyState emoji="🤷" title={t('members:notFound')} />;

  const next = nextBirthday(member.birth_date, todayISO());

  const payAll = async () => {
    try {
      await updateFines.mutateAsync({ ids: unpaid.map((f) => f.id), patch: { paid_at: payAllDate } });
      toast(t('fines:toast.allPaid', { count: unpaid.length }));
      setPayAllOpen(false);
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Link to="/team" className="flex min-h-touch items-center gap-1 text-sm font-semibold text-link">
          <ChevronLeftIcon className="h-4 w-4" />
          {t('members:team.title')}
        </Link>
        {isAdmin && (
          <Link to={`/admin/members/${member.id}`} className={buttonClass('secondary', 'sm')}>
            <EditIcon className="h-4 w-4" />
            {t('common:actions.edit')}
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
        <Avatar name={member.name} photoPath={member.photo_path} size="xl" />
        <div className="min-w-0 sm:ml-2">
          <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start">
            {member.name} <TypeBadge member={member} />
            {!member.active && <Badge>{t('members:inactive')}</Badge>}
          </h1>
          {member.nickname && <p className="italic text-muted-foreground">“{member.nickname}”</p>}
          <p className="text-sm font-semibold text-muted-foreground">{memberSubtitle(member, t)}</p>
          <p className="mt-2 text-sm">
            🎂 {isAdmin ? fmt.date(member.birth_date) : fmt.dayMonth(member.birth_date)}
            {' · '}
            {t('birthdays:turnsOn', { count: turningAge(member.birth_date, next), date: fmt.dayMonth(next) })}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-extrabold">💸 {t('members:detail.money')}</h2>
          {fines.isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('members:detail.total')} value={fmt.money(sumAmounts(allFines, (f) => f.amount))} tone="primary" />
              <Stat label={t('members:detail.paid')} value={fmt.money(sumAmounts(allFines.filter((f) => f.paid_at), (f) => f.amount))} tone="success" />
              <Stat label={t('members:detail.unpaid')} value={fmt.money(sumAmounts(unpaid, (f) => f.amount))} tone="danger" />
            </div>
          )}
          {isAdmin && unpaid.length > 0 && (
            <Button variant="success" block className="mt-3" onClick={() => setPayAllOpen(true)}>
              ✅ {t('fines:payAll', { count: unpaid.length })}
            </Button>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-extrabold">🍰 {t('members:detail.cake')}</h2>
          {cakeRows.isLoading ? (
            <Skeleton className="h-12" />
          ) : cakeRow ? (
            <div className="space-y-1">
              <CakeStatusBadge status={cakeRow.status} />
              <p className="text-sm text-muted-foreground">
                {cakeRow.broughtOn
                  ? t('birthdays:broughtOn', { date: fmt.date(cakeRow.broughtOn) })
                  : cakeRow.dueDate
                    ? cakeRow.isAlternative
                      ? t('birthdays:alternativeOn', { date: fmt.date(cakeRow.dueDate) })
                      : t('birthdays:dueOn', { date: fmt.date(cakeRow.dueDate) })
                    : t('birthdays:waitingDate')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('members:detail.noCake')}</p>
          )}
        </Card>
      </div>

      <SectionTitle>{t('members:detail.fines')}</SectionTitle>
      {fines.error ? (
        <ErrorState error={fines.error} onRetry={() => void fines.refetch()} />
      ) : fines.isLoading ? (
        <ListSkeleton rows={3} />
      ) : allFines.length === 0 ? (
        <EmptyState emoji="😇" title={t('members:detail.noFines')} />
      ) : (
        <ul className="space-y-2">
          {allFines.map((fine) => (
            <li key={fine.id}>
              <FineRow fine={fine} member={member} showMember={false} onOpen={isAdmin ? () => setOpen(fine) : undefined} />
            </li>
          ))}
        </ul>
      )}

      {open && <FineSheet fine={open} member={member} onClose={() => setOpen(null)} />}
      <ConfirmSheet
        open={payAllOpen}
        onClose={() => setPayAllOpen(false)}
        title={t('fines:payAllTitle')}
        message={t('fines:payAllMessage', {
          count: unpaid.length,
          amount: fmt.money(sumAmounts(unpaid, (f) => f.amount)),
          name: member.name,
        })}
        confirmLabel={t('fines:markPaid')}
        onConfirm={payAll}
      >
        <Field label={t('fines:paymentDate')} htmlFor="pay-all-date">
          <Input id="pay-all-date" type="date" value={payAllDate} min={minPaymentDate} onChange={(e) => setPayAllDate(e.target.value)} />
        </Field>
      </ConfirmSheet>
    </div>
  );
}
