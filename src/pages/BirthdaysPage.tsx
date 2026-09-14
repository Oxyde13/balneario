import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useCakeRows, type CakeRow } from '../hooks/useCakeRows';
import { useCreateCake, useGenerateCakeCalendar, useUpdateCake } from '../hooks/queries';
import { useToast } from '../components/Toast';
import { CakeStatusBadge } from '../components/CakeBits';
import { MemberLine } from '../components/MemberBits';
import { ShareButton } from '../components/ShareButton';
import { Sheet } from '../components/Sheet';
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, ListSkeleton, PageHeader, SectionTitle } from '../components/ui';
import { turningAge, windowMonths, type CakeWindow } from '../lib/birthdays';
import { todayISO } from '../lib/dates';
import { errorMessage } from '../lib/errors';
import { shortName } from '../lib/members';
import { birthdayMessage, cakesReminderMessage } from '../lib/shareTexts';

export function BirthdaysPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { isAdmin } = useAuth();
  const { rows, window, isLoading, error, refetch, missingRows } = useCakeRows();
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<CakeRow | null>(null);

  const groups = useMemo(() => {
    const visible = onlyPending ? rows.filter((r) => r.status !== 'brought') : rows;
    const months = windowMonths(window).map(([year, month]) => ({
      key: `${year}-${month}`,
      title: `${fmt.month(month)} ${year}`,
      rows: visible
        .filter((r) => r.birthday && Number(r.birthday.slice(0, 4)) === year && Number(r.birthday.slice(5, 7)) === month + 1)
        .sort((a, b) => (a.birthday ?? '').localeCompare(b.birthday ?? '')),
    }));
    const outOfWindow = visible
      .filter((r) => !r.birthday)
      .sort((a, b) => a.member.birth_date.slice(5).localeCompare(b.member.birth_date.slice(5)));
    return [...months, { key: 'out', title: t('birthdays:outOfWindow'), rows: outOfWindow }];
  }, [rows, window, onlyPending, fmt, t]);

  const today = todayISO();
  const week = rows.filter((r) => r.status === 'today' || r.status === 'thisWeek');
  const overdue = rows.filter((r) => r.status === 'overdue');
  const share = cakesReminderMessage(
    week.map((r) => ({ name: shortName(r.member), date: r.dueDate })),
    overdue.map((r) => ({ name: shortName(r.member), date: r.dueDate })),
  );

  return (
    <div>
      <PageHeader
        title={t('birthdays:title')}
        subtitle={t('birthdays:subtitle', { start: fmt.date(window.start), end: fmt.date(window.end) })}
        actions={
          <>
            <ShareButton build={share} label={t('birthdays:shareReminder')} />
            {isAdmin && <GenerateCalendarButton />}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Checkbox checked={onlyPending} onChange={setOnlyPending} label={t('birthdays:onlyPending')} />
        <p className="text-sm text-muted-foreground">{t('birthdays:legend')}</p>
      </div>

      {isAdmin && missingRows > 0 && (
        <p className="mb-4 rounded-xl bg-primary-soft p-3 text-sm font-semibold text-link">
          {t('birthdays:missingRows', { count: missingRows })}
        </p>
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <ListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState emoji="🎈" title={t('birthdays:empty')} />
      ) : (
        groups.map((group) => {
          if (group.rows.length === 0 && (onlyPending || group.key !== 'out')) {
            return onlyPending ? null : (
              <section key={group.key}>
                <SectionTitle>{group.title}</SectionTitle>
                <p className="px-1 text-sm text-muted-foreground">{t('birthdays:noneInMonth')}</p>
              </section>
            );
          }
          if (group.rows.length === 0) return null;
          return (
            <section key={group.key}>
              <SectionTitle>{group.title}</SectionTitle>
              {group.key === 'out' && <p className="mb-2 px-1 text-sm text-muted-foreground">{t('birthdays:outOfWindowHint')}</p>}
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <li key={row.member.id}>
                    <BirthdayItem row={row} today={today} onEdit={isAdmin ? () => setEditing(row) : undefined} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {editing && <CakeSheet row={editing} window={window} onClose={() => setEditing(null)} />}
    </div>
  );
}

function GenerateCalendarButton() {
  const { t } = useTranslation();
  const toast = useToast();
  const generate = useGenerateCakeCalendar();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={generate.isPending}
      onClick={() =>
        generate.mutate(undefined, {
          onSuccess: (n) => toast(t('birthdays:generated', { count: n })),
          onError: (e) => toast(errorMessage(e, t), 'error'),
        })
      }
    >
      🎂 {t('birthdays:generate')}
    </Button>
  );
}

function BirthdayItem({ row, today, onEdit }: { row: CakeRow; today: string; onEdit?: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { isAdmin } = useAuth();
  const birthdayText = row.birthday
    ? `${fmt.dayMonth(row.birthday)} · ${t('birthdays:turns', { count: turningAge(row.member.birth_date, row.birthday) })}`
    : isAdmin
      ? fmt.date(row.member.birth_date)
      : fmt.dayMonth(row.member.birth_date);

  let detail: string | null = null;
  if (row.broughtOn) detail = t('birthdays:broughtOn', { date: fmt.date(row.broughtOn) });
  else if (row.isAlternative && row.dueDate) detail = t('birthdays:alternativeOn', { date: fmt.date(row.dueDate) });
  else if (!row.dueDate) detail = t('birthdays:waitingDate');

  const content = (
    <Card className="p-3">
      <MemberLine
        member={row.member}
        subtitle={
          <>
            {birthdayText}
            {detail && <span className="block text-xs">{detail}</span>}
          </>
        }
        trailing={
          <div className="flex shrink-0 flex-col items-end gap-1">
            <CakeStatusBadge status={row.status} />
            {row.status === 'today' && row.birthday === today && (
              <ShareButton build={birthdayMessage(shortName(row.member))} iconOnly />
            )}
          </div>
        }
      />
    </Card>
  );

  if (!onEdit) return content;
  return (
    <button type="button" onClick={onEdit} className="block w-full text-left" aria-label={t('birthdays:manage', { name: row.member.name })}>
      {content}
    </button>
  );
}

/** Admin: alternative date and "brought cake" marks. */
function CakeSheet({ row, window, onClose }: { row: CakeRow; window: CakeWindow; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const updateCake = useUpdateCake();
  const createCake = useCreateCake();
  const [altDate, setAltDate] = useState(row.isAlternative ? row.dueDate ?? '' : '');
  const [broughtOn, setBroughtOn] = useState(row.broughtOn ?? todayISO());
  const [notes, setNotes] = useState(row.cake?.notes ?? '');
  const busy = updateCake.isPending || createCake.isPending;

  const save = async (
    patch: { due_date?: string | null; is_alternative_date?: boolean; brought_on?: string | null; notes?: string | null },
    message: string,
  ) => {
    try {
      if (row.cake) {
        await updateCake.mutateAsync({ id: row.cake.id, patch });
      } else {
        await createCake.mutateAsync({
          member_id: row.member.id,
          due_date: row.dueDate,
          is_alternative_date: row.isAlternative,
          brought_on: null,
          notes: null,
          ...patch,
        });
      }
      toast(message);
      onClose();
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <Sheet open onClose={onClose} title={row.member.name}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CakeStatusBadge status={row.status} />
          <span className="text-muted-foreground">
            {t('birthdays:bornOn', { date: fmt.date(row.member.birth_date) })}
            {row.birthday ? ` · ${t('birthdays:birthdayOn', { date: fmt.date(row.birthday) })}` : ` · ${t('birthdays:outOfWindow')}`}
          </span>
        </div>

        {/* Brought / not brought */}
        <section className="space-y-2 rounded-xl border border-border p-3">
          <h3 className="font-bold">🎂 {t('birthdays:cakeSection')}</h3>
          {row.broughtOn ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>{t('birthdays:broughtOn', { date: fmt.date(row.broughtOn) })}</p>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => save({ brought_on: null }, t('birthdays:unmarked'))}>
                {t('birthdays:unmarkBrought')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t('birthdays:broughtDate')} htmlFor="brought-on">
                <Input id="brought-on" type="date" value={broughtOn} max={todayISO()} onChange={(e) => setBroughtOn(e.target.value)} />
              </Field>
              <Button variant="success" disabled={busy || !broughtOn} onClick={() => save({ brought_on: broughtOn }, t('birthdays:marked'))}>
                ✅ {t('birthdays:markBrought')}
              </Button>
            </div>
          )}
        </section>

        {/* Alternative date */}
        <section className="space-y-2 rounded-xl border border-border p-3">
          <h3 className="font-bold">📅 {t('birthdays:alternativeDate')}</h3>
          <p className="text-sm text-muted-foreground">
            {row.birthday ? t('birthdays:alternativeHintInWindow') : t('birthdays:alternativeHintOut')}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('birthdays:date')} htmlFor="alt-date">
              <Input
                id="alt-date"
                type="date"
                value={altDate}
                min={window.start}
                max={window.end}
                onChange={(e) => setAltDate(e.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              disabled={busy || !altDate}
              onClick={() => save({ due_date: altDate, is_alternative_date: true }, t('birthdays:dateSaved'))}
            >
              {t('common:actions.save')}
            </Button>
          </div>
          {row.isAlternative && row.birthday && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => save({ due_date: row.birthday, is_alternative_date: false }, t('birthdays:dateSaved'))}
            >
              {t('birthdays:useBirthday', { date: fmt.date(row.birthday) })}
            </Button>
          )}
        </section>

        <section className="space-y-2">
          <Field label={t('birthdays:notes')} htmlFor="cake-notes" optional>
            <Input id="cake-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {notes !== (row.cake?.notes ?? '') && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => save({ notes: notes.trim() || null }, t('birthdays:notesSaved'))}>
              {t('common:actions.save')}
            </Button>
          )}
        </section>

        {row.isAlternative && !row.dueDate && <Badge tone="primary">{t('birthdays:waitingDate')}</Badge>}
      </div>
    </Sheet>
  );
}
