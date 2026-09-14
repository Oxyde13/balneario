import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/useFormat';
import { useReorderRules, useRules, useSaveRule, type RuleInput } from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { Sheet } from '../../components/Sheet';
import { Badge, Button, Checkbox, EmptyState, ErrorState, Field, IconButton, Input, ListSkeleton, PageHeader, Segmented, Textarea, cn } from '../../components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../../components/icons';
import { AppliesToBadges } from '../RulesPage';
import { errorMessage } from '../../lib/errors';
import { MEMBER_TYPES, type FineRule, type MemberType } from '../../types/db';

export default function RulesAdminPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const { data = [], isLoading, error, refetch } = useRules();
  const reorder = useReorderRules();
  const save = useSaveRule();
  const [editing, setEditing] = useState<FineRule | 'new' | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const ordered = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)), [data]);
  const visible = showInactive ? ordered : ordered.filter((r) => r.active);
  const missingEn = ordered.filter((r) => r.active && !r.title_en?.trim()).length;

  const move = (rule: FineRule, direction: -1 | 1) => {
    const index = ordered.findIndex((r) => r.id === rule.id);
    // Skip hidden (inactive) rules so the arrows move past what the admin sees.
    let target = index + direction;
    while (target >= 0 && target < ordered.length && !visible.includes(ordered[target])) target += direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next, { onError: (e) => toast(errorMessage(e, t), 'error') });
  };

  const toggleActive = (rule: FineRule) =>
    save.mutate(
      { id: rule.id, values: { active: !rule.active } },
      {
        onSuccess: () => toast(rule.active ? t('admin:rules.deactivated') : t('admin:rules.activated')),
        onError: (e) => toast(errorMessage(e, t), 'error'),
      },
    );

  return (
    <div>
      <PageHeader
        title={t('admin:rules.title')}
        subtitle={t('admin:rules.subtitle')}
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <PlusIcon className="h-4 w-4" />
            {t('admin:rules.new')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Checkbox checked={showInactive} onChange={setShowInactive} label={t('admin:rules.showInactive')} />
        {missingEn > 0 && <Badge tone="warning">🇬🇧 {t('admin:rules.missingEnCount', { count: missingEn })}</Badge>}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : visible.length === 0 ? (
        <EmptyState emoji="📜" title={t('rules:empty')} />
      ) : (
        <ul className="space-y-2">
          {visible.map((rule, i) => (
            <li key={rule.id} className={cn('flex items-center gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm', !rule.active && 'opacity-60')}>
              <div className="flex flex-col">
                <IconButton label={t('admin:rules.moveUp')} disabled={i === 0 || reorder.isPending} onClick={() => move(rule, -1)} className="min-h-[36px] disabled:opacity-30">
                  <ArrowUpIcon className="h-4 w-4" />
                </IconButton>
                <IconButton label={t('admin:rules.moveDown')} disabled={i === visible.length - 1 || reorder.isPending} onClick={() => move(rule, 1)} className="min-h-[36px] disabled:opacity-30">
                  <ArrowDownIcon className="h-4 w-4" />
                </IconButton>
              </div>
              <button type="button" onClick={() => setEditing(rule)} className="min-w-0 flex-1 rounded-xl p-1 text-left hover:bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground">{rule.category || t('rules:uncategorized')}</p>
                <p className="font-semibold">{rule.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!rule.title_en?.trim() && <Badge tone="warning">🇬🇧 {t('admin:rules.missingEn')}</Badge>}
                  {!rule.active && <Badge>{t('admin:rules.inactive')}</Badge>}
                  <AppliesToBadges rule={rule} />
                </div>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular font-extrabold text-link">{fmt.money(rule.amount)}</span>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)} disabled={save.isPending}>
                  {rule.active ? t('admin:rules.deactivate') : t('admin:rules.activate')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RuleForm
          rule={editing === 'new' ? null : editing}
          nextOrder={(ordered[ordered.length - 1]?.sort_order ?? 0) + 10}
          categories={[...new Set(data.map((r) => r.category).filter((c): c is string => Boolean(c)))]}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

type AppliesChoice = 'all' | MemberType;

function RuleForm({ rule, nextOrder, categories, onClose }: { rule: FineRule | null; nextOrder: number; categories: string[]; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveRule();
  const [tab, setTab] = useState<'pt' | 'en'>('pt');
  const [form, setForm] = useState({
    title: rule?.title ?? '',
    description: rule?.description ?? '',
    category: rule?.category ?? '',
    title_en: rule?.title_en ?? '',
    description_en: rule?.description_en ?? '',
    category_en: rule?.category_en ?? '',
    amount: rule ? String(rule.amount) : '',
    applies_to: (rule?.applies_to ?? []) as MemberType[],
    active: rule?.active ?? true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const amount = Number(form.amount.replace(',', '.'));
  const valid = form.title.trim() !== '' && form.amount.trim() !== '' && Number.isFinite(amount) && amount >= 0;

  // "Aplica-se a": everyone (null) or any combination of member types.
  const appliesAll = form.applies_to.length === 0 || form.applies_to.length === MEMBER_TYPES.length;
  const toggleType = (choice: AppliesChoice) => {
    if (choice === 'all') return set('applies_to', []);
    const current = appliesAll ? [] : form.applies_to;
    const next = current.includes(choice) ? current.filter((x) => x !== choice) : [...current, choice];
    set('applies_to', next.length === MEMBER_TYPES.length ? [] : next);
  };

  const submit = async () => {
    if (!valid) {
      setTab('pt');
      return;
    }
    const values: Partial<RuleInput> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      title_en: form.title_en.trim() || null,
      description_en: form.description_en.trim() || null,
      category_en: form.category_en.trim() || null,
      amount,
      applies_to: appliesAll ? null : form.applies_to,
      active: form.active,
      ...(rule ? {} : { sort_order: nextOrder }),
    };
    try {
      await save.mutateAsync({ id: rule?.id, values });
      toast(t('admin:rules.saved'));
      onClose();
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={rule ? t('admin:rules.edit') : t('admin:rules.new')}
      footer={
        <Button block size="lg" onClick={submit} loading={save.isPending} disabled={!valid}>
          {t('common:actions.save')}
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Segmented
          label={t('admin:rules.language')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pt', label: `PT · ${t('admin:rules.required')}` },
            { value: 'en', label: `EN · ${t('common:optional')}` },
          ]}
        />
        <datalist id="rule-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {tab === 'pt' ? (
          <>
            <Field label={t('admin:rules.fields.title')} htmlFor="r-title">
              <Input id="r-title" required value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label={t('admin:rules.fields.description')} htmlFor="r-desc" optional>
              <Textarea id="r-desc" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label={t('admin:rules.fields.category')} htmlFor="r-cat" optional hint={t('admin:rules.fields.categoryHint')}>
              <Input id="r-cat" list="rule-categories" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <p className="rounded-xl bg-muted/60 p-2 text-xs text-muted-foreground">{t('admin:rules.enHint')}</p>
            <Field label={t('admin:rules.fields.title')} htmlFor="r-title-en" optional>
              <Input id="r-title-en" lang="en-GB" value={form.title_en} onChange={(e) => set('title_en', e.target.value)} placeholder={form.title} />
            </Field>
            <Field label={t('admin:rules.fields.description')} htmlFor="r-desc-en" optional>
              <Textarea id="r-desc-en" lang="en-GB" value={form.description_en} onChange={(e) => set('description_en', e.target.value)} placeholder={form.description} />
            </Field>
            <Field label={t('admin:rules.fields.category')} htmlFor="r-cat-en" optional>
              <Input id="r-cat-en" lang="en-GB" value={form.category_en} onChange={(e) => set('category_en', e.target.value)} placeholder={form.category} />
            </Field>
          </>
        )}

        <Field label={t('admin:rules.fields.amount')} htmlFor="r-amount">
          <Input id="r-amount" inputMode="decimal" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        </Field>

        <fieldset>
          <legend className="mb-1 text-sm font-semibold">{t('admin:rules.fields.appliesTo')}</legend>
          <div className="flex flex-wrap gap-2">
            {(['all', ...MEMBER_TYPES] as AppliesChoice[]).map((choice) => {
              const checked = choice === 'all' ? appliesAll : !appliesAll && form.applies_to.includes(choice);
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleType(choice)}
                  className={cn(
                    'min-h-touch rounded-full border px-4 text-sm font-semibold',
                    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  {t(`admin:rules.appliesTo.${choice}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Checkbox checked={form.active} onChange={(v) => set('active', v)} label={t('admin:rules.fields.active')} />
        {rule && <p className="text-xs text-muted-foreground">{t('admin:rules.snapshotHint')}</p>}
      </form>
    </Sheet>
  );
}
