import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/useFormat';
import { useCreateDinner, useDeleteDinner, useDinnerFund, useDinners, useUpdateDinner } from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { ConfirmSheet } from '../../components/Sheet';
import { useDinnerLock } from '../../components/FineBits';
import { Button, Card, Field, Input, ListSkeleton, PageHeader, SectionTitle, Skeleton, Textarea } from '../../components/ui';
import { DinnerHistory } from '../DinnersPage';
import { todayISO } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import type { Dinner } from '../../types/db';

export default function DinnerAdminPage() {
  const { t } = useTranslation();
  const dinners = useDinners();
  const latest = dinners.data?.[0];

  return (
    <div>
      <PageHeader title={t('dinner:admin.title')} subtitle={t('dinner:admin.subtitle')} />
      {dinners.isLoading ? <ListSkeleton rows={3} /> : <RegisterDinner />}
      {latest && <EditLatestDinner dinner={latest} />}
      <SectionTitle>{t('dinner:history.title')}</SectionTitle>
      <DinnerHistory />
    </div>
  );
}

function RegisterDinner() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const fund = useDinnerFund();
  const create = useCreateDinner();
  const { minPaymentDate } = useDinnerLock();
  const [form, setForm] = useState({ date: todayISO(), place: '', notes: '' });
  const [confirming, setConfirming] = useState(false);
  const valid = Boolean(form.date) && (!minPaymentDate || form.date >= minPaymentDate);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{t('dinner:admin.fundToClose')}</p>
        {fund.isLoading ? (
          <Skeleton className="h-10 w-40" />
        ) : (
          <p className="tabular text-4xl font-black text-success">{fmt.money(fund.data?.collected)}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{t('dinner:admin.fundHint')}</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setConfirming(true);
        }}
      >
        <Field label={t('dinner:admin.date')} htmlFor="d-date" hint={minPaymentDate ? t('dinner:admin.dateMin', { date: fmt.date(minPaymentDate) }) : undefined}>
          <Input id="d-date" type="date" required value={form.date} min={minPaymentDate} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label={t('dinner:admin.place')} htmlFor="d-place" optional>
          <Input id="d-place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
        </Field>
        <Field label={t('dinner:admin.notes')} htmlFor="d-notes" optional>
          <Textarea id="d-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Button type="submit" size="lg" block disabled={!valid}>
          🍽️ {t('dinner:admin.register')}
        </Button>
      </form>

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('dinner:admin.confirmTitle')}
        message={t('dinner:admin.confirmMessage')}
        confirmLabel={t('dinner:admin.register')}
        onConfirm={async () => {
          try {
            // The fund snapshot is computed by the database, not sent from here.
            const saved = await create.mutateAsync({
              held_on: form.date,
              place: form.place.trim() || null,
              notes: form.notes.trim() || null,
            });
            toast(t('dinner:admin.registered', { amount: fmt.money(saved.fund_amount) }));
            setConfirming(false);
            setForm({ date: todayISO(), place: '', notes: '' });
          } catch (e) {
            toast(errorMessage(e, t), 'error');
          }
        }}
      >
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          {t('dinner:admin.confirmSummary', { date: fmt.date(form.date), amount: fmt.money(fund.data?.collected) })}
        </p>
      </ConfirmSheet>
    </Card>
  );
}

/** The latest dinner: place and notes stay editable; it can also be undone. */
function EditLatestDinner({ dinner }: { dinner: Dinner }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const update = useUpdateDinner();
  const remove = useDeleteDinner();
  const [form, setForm] = useState({ place: dinner.place ?? '', notes: dinner.notes ?? '' });
  const [undoStep, setUndoStep] = useState<0 | 1 | 2>(0);
  const dirty = form.place !== (dinner.place ?? '') || form.notes !== (dinner.notes ?? '');

  return (
    <Card className="mt-4 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">{t('dinner:admin.latestTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('dinner:admin.registeredOn', { date: fmt.date(dinner.held_on) })}</p>
        <p className="tabular text-3xl font-black text-success">{fmt.money(dinner.fund_amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('dinner:admin.immutableHint')}</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(
            { id: dinner.id, patch: { place: form.place.trim() || null, notes: form.notes.trim() || null } },
            { onSuccess: () => toast(t('dinner:admin.saved')), onError: (err) => toast(errorMessage(err, t), 'error') },
          );
        }}
      >
        <Field label={t('dinner:admin.place')} htmlFor="d-place-edit" optional>
          <Input id="d-place-edit" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
        </Field>
        <Field label={t('dinner:admin.notes')} htmlFor="d-notes-edit" optional>
          <Textarea id="d-notes-edit" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Button type="submit" block disabled={!dirty} loading={update.isPending}>
          {t('common:actions.save')}
        </Button>
      </form>
      <Button variant="ghost" block className="text-danger" onClick={() => setUndoStep(1)}>
        {t('dinner:admin.undo')}
      </Button>

      <ConfirmSheet
        open={undoStep === 1}
        onClose={() => setUndoStep(0)}
        danger
        title={t('dinner:admin.undoTitle')}
        message={t('dinner:admin.undoMessage')}
        confirmLabel={t('common:actions.continue')}
        onConfirm={() => setUndoStep(2)}
      />
      <ConfirmSheet
        open={undoStep === 2}
        onClose={() => setUndoStep(0)}
        danger
        title={t('dinner:admin.undoTitle2')}
        message={t('dinner:admin.undoMessage2', { date: fmt.date(dinner.held_on) })}
        confirmLabel={t('dinner:admin.undoConfirm')}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(dinner.id);
            toast(t('dinner:admin.undone'));
            setUndoStep(0);
          } catch (e) {
            toast(errorMessage(e, t), 'error');
          }
        }}
      />
    </Card>
  );
}
