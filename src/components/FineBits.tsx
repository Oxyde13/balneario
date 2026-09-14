import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useDeleteFine, useDinners, useUpdateFines } from '../hooks/queries';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { TypeBadge } from './MemberBits';
import { ShareButton } from './ShareButton';
import { ConfirmSheet, Sheet } from './Sheet';
import { Badge, Button, Field, Input, Textarea, cn } from './ui';
import { LockIcon } from './icons';
import { addDaysISO, todayISO } from '../lib/dates';
import { errorMessage } from '../lib/errors';
import { localized } from '../lib/localized';
import { shortName } from '../lib/members';
import { fineMessage } from '../lib/shareTexts';
import type { Dinner, Fine, Member } from '../types/db';

/** Dinner lock: payments up to the last registered dinner are closed. */
export function useDinnerLock() {
  const { data: dinners = [] } = useDinners();
  return useMemo(() => {
    const byDate = [...dinners].sort((a, b) => a.held_on.localeCompare(b.held_on));
    const lastDinner = byDate.length ? byDate[byDate.length - 1].held_on : null;
    return {
      lastDinner,
      /** First allowed payment date (day after the last dinner). */
      minPaymentDate: lastDinner ? addDaysISO(lastDinner, 1) : undefined,
      /** Dinner that spent this fine's money, if any. */
      lockedBy(fine: Pick<Fine, 'paid_at'>): Dinner | null {
        if (!fine.paid_at) return null;
        return byDate.find((d) => d.held_on >= fine.paid_at!) ?? null;
      },
    };
  }, [dinners]);
}

/** Default payment date: today, unless that is still inside a closed dinner. */
export function defaultPaymentDate(minPaymentDate: string | undefined) {
  const today = todayISO();
  return minPaymentDate && today < minPaymentDate ? minPaymentDate : today;
}

export function FineRow({
  fine,
  member,
  showMember = true,
  onOpen,
}: {
  fine: Fine;
  member: Member | undefined;
  showMember?: boolean;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { lockedBy } = useDinnerLock();
  const lockDinner = lockedBy(fine);

  const body = (
    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
      {showMember && member && <Avatar name={member.name} photoPath={member.photo_path} size="sm" />}
      <div className="min-w-0 flex-1">
        {showMember && member && (
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            {member.name} <TypeBadge member={member} />
          </p>
        )}
        <p className={cn('truncate', showMember ? 'text-sm' : 'font-semibold')}>{localized(fine, 'description')}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{fmt.date(fine.occurred_on)}</span>
          {fine.paid_at ? (
            <Badge tone="success">{t('fines:paidOn', { date: fmt.date(fine.paid_at) })}</Badge>
          ) : (
            <Badge tone="danger">{t('fines:unpaid')}</Badge>
          )}
          {lockDinner && (
            <Badge tone="neutral">
              <LockIcon className="h-3 w-3" />
              {t('fines:lockedBy', { date: fmt.date(lockDinner.held_on) })}
            </Badge>
          )}
        </div>
      </div>
      <span className={cn('tabular shrink-0 font-extrabold', fine.paid_at ? 'text-success' : 'text-danger')}>{fmt.money(fine.amount)}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-2 pl-3 shadow-sm">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="flex min-h-touch min-w-0 flex-1 items-center rounded-xl" aria-label={t('fines:open', { description: localized(fine, 'description') })}>
          {body}
        </button>
      ) : (
        body
      )}
      {member && <ShareButton build={fineMessage([shortName(member)], fine)} iconOnly />}
    </div>
  );
}

/** Admin actions on one fine: pay / undo payment / edit / delete. */
export function FineSheet({ fine, member, onClose }: { fine: Fine; member: Member | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { lockedBy, minPaymentDate } = useDinnerLock();
  const update = useUpdateFines();
  const remove = useDeleteFine();
  const lockDinner = lockedBy(fine);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [paidAt, setPaidAt] = useState(defaultPaymentDate(minPaymentDate));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    description: fine.description,
    description_en: fine.description_en ?? '',
    amount: String(fine.amount),
    occurred_on: fine.occurred_on,
    notes: fine.notes ?? '',
  });
  const amount = Number(form.amount.replace(',', '.'));
  const formValid = form.description.trim() !== '' && Number.isFinite(amount) && amount > 0 && Boolean(form.occurred_on);

  const run = async (patch: Partial<Fine>, message: string) => {
    try {
      await update.mutateAsync({ ids: [fine.id], patch });
      toast(message);
      onClose();
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <>
      <Sheet open onClose={onClose} title={member ? member.name : t('fines:fine')}>
        {mode === 'view' ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold">{localized(fine, 'description')}</p>
              <p className={cn('tabular text-3xl font-black', fine.paid_at ? 'text-success' : 'text-danger')}>{fmt.money(fine.amount)}</p>
              <p className="text-sm text-muted-foreground">{t('fines:occurredOn', { date: fmt.date(fine.occurred_on) })}</p>
              {fine.notes && <p className="mt-2 rounded-xl bg-muted/60 p-2 text-sm">{fine.notes}</p>}
            </div>

            {lockDinner ? (
              <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{t('fines:lockedBy', { date: fmt.date(lockDinner.held_on) })}</strong>
                  <br />
                  {t('fines:lockedHint')}
                </span>
              </p>
            ) : (
              isAdmin && (
                <div className="space-y-3">
                  {fine.paid_at ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-success/10 p-3">
                      <span className="font-semibold text-success">{t('fines:paidOn', { date: fmt.date(fine.paid_at) })}</span>
                      <Button variant="secondary" size="sm" loading={update.isPending} onClick={() => run({ paid_at: null }, t('fines:toast.unpaid'))}>
                        {t('fines:undoPayment')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/60 p-3">
                      <Field label={t('fines:paymentDate')} htmlFor="paid-at" hint={minPaymentDate ? t('fines:paymentMin', { date: fmt.date(minPaymentDate) }) : undefined}>
                        <Input id="paid-at" type="date" value={paidAt} min={minPaymentDate} onChange={(e) => setPaidAt(e.target.value)} />
                      </Field>
                      <Button
                        variant="success"
                        loading={update.isPending}
                        disabled={!paidAt || Boolean(minPaymentDate && paidAt < minPaymentDate)}
                        onClick={() => run({ paid_at: paidAt }, t('fines:toast.paid'))}
                      >
                        ✅ {t('fines:markPaid')}
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="secondary" block onClick={() => setMode('edit')}>
                      {t('common:actions.edit')}
                    </Button>
                    <Button variant="ghost" block className="text-danger" onClick={() => setConfirmDelete(true)}>
                      {t('common:actions.delete')}
                    </Button>
                  </div>
                </div>
              )
            )}
            {member && <ShareButton build={fineMessage([shortName(member)], fine)} block size="md" />}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!formValid) return;
              void run(
                {
                  description: form.description.trim(),
                  description_en: form.description_en.trim() || null,
                  amount,
                  occurred_on: form.occurred_on,
                  notes: form.notes.trim() || null,
                },
                t('fines:toast.updated'),
              );
            }}
          >
            <Field label={t('fines:form.descriptionPt')} htmlFor="f-desc">
              <Input id="f-desc" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label={t('fines:form.descriptionEn')} htmlFor="f-desc-en" optional>
              <Input id="f-desc-en" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fines:form.amount')} htmlFor="f-amount">
                <Input id="f-amount" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label={t('fines:form.date')} htmlFor="f-date">
                <Input id="f-date" type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
              </Field>
            </div>
            <Field label={t('fines:form.notes')} htmlFor="f-notes" optional>
              <Textarea id="f-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <p className="text-xs text-muted-foreground">{t('fines:form.snapshotHint')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setMode('view')}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" block loading={update.isPending} disabled={!formValid}>
                {t('common:actions.save')}
              </Button>
            </div>
          </form>
        )}
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title={t('fines:confirmDelete.title')}
        message={t('fines:confirmDelete.message', { description: localized(fine, 'description'), amount: fmt.money(fine.amount), name: member?.name ?? '' })}
        confirmLabel={t('common:actions.delete')}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(fine.id);
            toast(t('fines:toast.deleted'));
            setConfirmDelete(false);
            onClose();
          } catch (e) {
            toast(errorMessage(e, t), 'error');
          }
        }}
      />
    </>
  );
}

