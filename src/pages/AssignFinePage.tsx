import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../hooks/useFormat';
import { useCreateFines, useMembers, useRules } from '../hooks/queries';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { MemberLine, memberSubtitle } from '../components/MemberBits';
import { ShareButton } from '../components/ShareButton';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  SectionTitle,
  Textarea,
  buttonClass,
  cn,
} from '../components/ui';
import { CheckIcon, ChevronLeftIcon, SearchIcon } from '../components/icons';
import { todayISO } from '../lib/dates';
import { errorMessage } from '../lib/errors';
import { localized } from '../lib/localized';
import { matchesSearch, shortName, splitSquad } from '../lib/members';
import { fineMessage } from '../lib/shareTexts';
import type { FineRule, Member } from '../types/db';

type Step = 'members' | 'rules' | 'confirm' | 'done';

function ruleAppliesTo(rule: FineRule, members: Member[]) {
  return !rule.applies_to || rule.applies_to.length === 0 || members.every((m) => rule.applies_to!.includes(m.type));
}

export default function AssignFinePage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const members = useMembers();
  const rules = useRules();
  const createFines = useCreateFines();

  const [step, setStep] = useState<Step>('members');
  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [rule, setRule] = useState<FineRule | 'adhoc' | null>(null);
  const [form, setForm] = useState({ amount: '', occurredOn: todayISO(), notes: '', description: '', descriptionEn: '' });
  const [saved, setSaved] = useState<{ names: string[]; description: string; description_en: string | null; amount: number } | null>(null);

  const active = useMemo(() => (members.data ?? []).filter((m) => m.active), [members.data]);
  const squad = useMemo(() => splitSquad(active.filter((m) => matchesSearch(m, search))), [active, search]);
  const selectedMembers = useMemo(() => active.filter((m) => selected.includes(m.id)), [active, selected]);

  const applicableRules = useMemo(
    () => (rules.data ?? []).filter((r) => r.active && ruleAppliesTo(r, selectedMembers)),
    [rules.data, selectedMembers],
  );
  const ruleGroups = useMemo(() => {
    const groups = new Map<string, FineRule[]>();
    applicableRules.forEach((r) => {
      const key = localized(r, 'category') || t('rules:uncategorized');
      groups.set(key, [...(groups.get(key) ?? []), r]);
    });
    return [...groups.entries()];
  }, [applicableRules, t]);

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const chooseMember = (member: Member) => {
    if (multi) return toggle(member.id);
    setSelected([member.id]);
    setStep('rules');
  };

  const chooseRule = (value: FineRule | 'adhoc') => {
    setRule(value);
    setForm((f) => ({ ...f, amount: value === 'adhoc' ? '' : String(value.amount) }));
    setStep('confirm');
  };

  const amount = Number(form.amount.replace(',', '.'));
  const description = rule === 'adhoc' ? form.description.trim() : rule?.title ?? '';
  const descriptionEn = rule === 'adhoc' ? form.descriptionEn.trim() || null : rule?.title_en ?? null;
  const valid = selectedMembers.length > 0 && description !== '' && Number.isFinite(amount) && amount > 0 && Boolean(form.occurredOn);

  const save = async () => {
    if (!valid) return;
    try {
      await createFines.mutateAsync(
        selectedMembers.map((m) => ({
          member_id: m.id,
          rule_id: rule === 'adhoc' || !rule ? null : rule.id,
          description,
          description_en: descriptionEn,
          amount,
          // Date computed in Madeira and sent explicitly (the server runs in UTC).
          occurred_on: form.occurredOn,
          notes: form.notes.trim() || null,
        })),
      );
      setSaved({ names: selectedMembers.map(shortName), description, description_en: descriptionEn, amount });
      setStep('done');
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  const restart = () => {
    setStep('members');
    setSelected([]);
    setRule(null);
    setSearch('');
    setSaved(null);
    setForm({ amount: '', occurredOn: todayISO(), notes: '', description: '', descriptionEn: '' });
  };

  const back = () => {
    if (step === 'confirm') setStep('rules');
    else if (step === 'rules') setStep('members');
    else navigate(-1);
  };

  return (
    <div className="pb-24">
      <div className="mb-2 flex items-center gap-2">
        {step !== 'done' && (
          <button type="button" onClick={back} className="flex min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-muted" aria-label={t('common:actions.back')}>
            <ChevronLeftIcon />
          </button>
        )}
        <PageHeader title={t('fines:assign.title')} subtitle={t(`fines:assign.step.${step}`)} />
      </div>

      {step !== 'members' && step !== 'done' && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedMembers.map((m) => (
            <Badge key={m.id} tone="primary" className="py-1 text-sm">
              {shortName(m)}
            </Badge>
          ))}
        </div>
      )}

      {/* Step 1: member(s) */}
      {step === 'members' && (
        <>
          <div className="relative mb-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fines:assign.searchPlaceholder')}
              aria-label={t('fines:assign.searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Checkbox
              checked={multi}
              onChange={(value) => {
                setMulti(value);
                if (!value) setSelected([]);
              }}
              label={t('fines:assign.multi')}
            />
            {multi && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setSelected((cur) => [...new Set([...cur, ...active.filter((m) => m.type === 'player').map((m) => m.id)])])}>
                  {t('fines:assign.selectPlayers')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelected((cur) => [...new Set([...cur, ...active.filter((m) => m.type !== 'player').map((m) => m.id)])])}>
                  {t('fines:assign.selectStaff')}
                </Button>
                {selected.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                    {t('common:actions.clear')}
                  </Button>
                )}
              </>
            )}
          </div>

          {members.error ? (
            <ErrorState error={members.error} onRetry={() => void members.refetch()} />
          ) : members.isLoading ? (
            <ListSkeleton rows={8} />
          ) : squad.players.length + squad.staff.length === 0 ? (
            <EmptyState emoji="🔍" title={t('fines:assign.noMatch')} />
          ) : (
            (['players', 'staff'] as const).map((group) =>
              squad[group].length === 0 ? null : (
                <section key={group}>
                  <SectionTitle>{t(`common:filterType.${group}`)}</SectionTitle>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {squad[group].map((member) => {
                      const isSelected = selected.includes(member.id);
                      return (
                        <li key={member.id}>
                          <button
                            type="button"
                            onClick={() => chooseMember(member)}
                            aria-pressed={multi ? isSelected : undefined}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-2xl border bg-card p-2 text-left shadow-sm transition active:scale-[.99]',
                              isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50',
                            )}
                          >
                            <MemberLine member={member} subtitle={memberSubtitle(member, t)} className="flex-1" />
                            {multi && (
                              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2', isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                                {isSelected && <CheckIcon className="h-4 w-4" />}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )
          )}

          {multi && (
            <div className="pb-safe fixed inset-x-0 bottom-[64px] z-30 border-t border-border bg-card/95 p-3 backdrop-blur md:bottom-0 md:left-64">
              <Button block size="lg" disabled={selected.length === 0} onClick={() => setStep('rules')}>
                {t('fines:assign.continue', { count: selected.length })}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Step 2: rule */}
      {step === 'rules' && (
        <>
          {rules.error ? (
            <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
          ) : rules.isLoading ? (
            <ListSkeleton rows={6} />
          ) : (
            <>
              {ruleGroups.length === 0 && <EmptyState emoji="📜" title={t('fines:assign.noRules')} />}
              {ruleGroups.map(([category, list]) => (
                <section key={category}>
                  <SectionTitle>{category}</SectionTitle>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => chooseRule(r)}
                          className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-left shadow-sm transition hover:border-primary/50 active:scale-[.99]"
                        >
                          <span className="font-semibold">{localized(r, 'title')}</span>
                          <span className="tabular shrink-0 font-extrabold text-link">{fmt.money(r.amount)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <SectionTitle>{t('fines:adhoc')}</SectionTitle>
              <button
                type="button"
                onClick={() => chooseRule('adhoc')}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-2 text-left font-semibold hover:border-primary/50"
              >
                ✍️ {t('fines:assign.adhocCta')}
              </button>
            </>
          )}
        </>
      )}

      {/* Step 3: confirm */}
      {step === 'confirm' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Card className="space-y-4">
            {rule === 'adhoc' ? (
              <>
                <Field label={t('fines:form.descriptionPt')} htmlFor="adhoc-pt">
                  <Input id="adhoc-pt" required autoFocus value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('fines:form.adhocPlaceholder')} />
                </Field>
                <Field label={t('fines:form.descriptionEn')} htmlFor="adhoc-en" optional>
                  <Input id="adhoc-en" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
                </Field>
              </>
            ) : (
              rule && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('fines:form.rule')}</p>
                  <p className="text-lg font-bold">{localized(rule, 'title')}</p>
                  {rule.description && <p className="text-sm text-muted-foreground">{localized(rule, 'description')}</p>}
                </div>
              )
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fines:form.amount')} htmlFor="fine-amount" error={form.amount && !(amount > 0) ? t('fines:form.amountInvalid') : undefined}>
                <Input id="fine-amount" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label={t('fines:form.date')} htmlFor="fine-date">
                <Input id="fine-date" type="date" required value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} />
              </Field>
            </div>
            <Field label={t('fines:form.notes')} htmlFor="fine-notes" optional>
              <Textarea id="fine-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </Card>
          {selectedMembers.length > 1 && valid && (
            <p className="text-center text-sm text-muted-foreground">
              {t('fines:assign.multiTotal', { count: selectedMembers.length, total: fmt.money(amount * selectedMembers.length) })}
            </p>
          )}
          <Button type="submit" size="lg" block loading={createFines.isPending} disabled={!valid}>
            {t('fines:assign.save', { count: selectedMembers.length })}
          </Button>
        </form>
      )}

      {/* Done: offer (never automatic) sharing */}
      {step === 'done' && saved && (
        <Card className="space-y-4 text-center">
          <p className="text-5xl" aria-hidden="true">
            💸
          </p>
          <div>
            <p className="text-xl font-extrabold">{t('fines:assign.saved', { count: saved.names.length })}</p>
            <p className="text-muted-foreground">
              {localized(saved, 'description')} · {fmt.money(saved.amount)}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {selectedMembers.map((m) => (
              <Avatar key={m.id} name={m.name} photoPath={m.photo_path} size="sm" />
            ))}
          </div>
          <p className="font-semibold">{t('fines:assign.shareQuestion')}</p>
          <ShareButton build={fineMessage(saved.names, saved)} block size="md" />
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={restart}>
              {t('fines:assign.another')}
            </Button>
            <Link to="/fines" className={buttonClass('ghost', 'md', true)}>
              {t('fines:assign.viewFines')}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
