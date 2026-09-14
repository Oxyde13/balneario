import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMembers, useSaveMember, type MemberInput } from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { PhotoEditor } from '../../components/PhotoEditor';
import { ConfirmSheet } from '../../components/Sheet';
import { Button, Card, Checkbox, EmptyState, Field, Input, ListSkeleton, PageHeader, Segmented, Select } from '../../components/ui';
import { ChevronLeftIcon } from '../../components/icons';
import { errorMessage } from '../../lib/errors';
import { todayISO } from '../../lib/dates';
import { POSITIONS, STAFF_ROLES, type Member, type MemberType, type Position, type StaffRole } from '../../types/db';

interface FormState {
  type: MemberType;
  name: string;
  nickname: string;
  shirt_number: string;
  position: Position | '';
  staff_role: StaffRole | '';
  birth_date: string;
  active: boolean;
}

const EMPTY: FormState = {
  type: 'player',
  name: '',
  nickname: '',
  shirt_number: '',
  position: '',
  staff_role: '',
  birth_date: '',
  active: true,
};

function toForm(member: Member): FormState {
  return {
    type: member.type,
    name: member.name,
    nickname: member.nickname ?? '',
    shirt_number: member.shirt_number != null ? String(member.shirt_number) : '',
    position: member.position ?? '',
    staff_role: member.staff_role ?? '',
    birth_date: member.birth_date,
    active: member.active,
  };
}

export default function MemberFormPage() {
  const { memberId } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const members = useMembers();
  const save = useSaveMember();
  const member = memberId ? members.data?.find((m) => m.id === memberId) : undefined;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Load the member once (later refetches, e.g. after a photo upload, keep unsaved edits).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (member && loadedId !== member.id) {
    setLoadedId(member.id);
    setForm(toForm(member));
  }

  if (memberId && members.isLoading) return <ListSkeleton rows={5} />;
  if (memberId && !member) return <EmptyState emoji="🤷" title={t('members:notFound')} />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isPlayer = form.type === 'player';
  const shirt = form.shirt_number.trim() === '' ? null : Number(form.shirt_number);
  const shirtInvalid = shirt !== null && (!Number.isInteger(shirt) || shirt < 0 || shirt > 999);
  const duplicateShirt =
    isPlayer && shirt !== null && (members.data ?? []).some((m) => m.active && m.id !== memberId && m.type === 'player' && m.shirt_number === shirt);
  const valid = form.name.trim() !== '' && Boolean(form.birth_date) && !shirtInvalid;

  const values = (): Partial<MemberInput> => ({
    type: form.type,
    name: form.name.trim(),
    nickname: form.nickname.trim() || null,
    birth_date: form.birth_date,
    shirt_number: isPlayer ? shirt : null,
    position: isPlayer ? form.position || null : null,
    staff_role: isPlayer ? null : form.staff_role || null,
    active: form.active,
  });

  const submit = async () => {
    if (!valid) return;
    try {
      const saved = await save.mutateAsync({ id: memberId, values: values() });
      if (memberId) {
        toast(t('admin:members.saved'));
        navigate(`/team/${saved.id}`);
      } else {
        toast(t('admin:members.created'));
        navigate(`/admin/members/${saved.id}`, { replace: true });
      }
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <div>
      <Link to="/admin/members" className="mb-2 flex min-h-touch items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeftIcon className="h-4 w-4" />
        {t('admin:members.title')}
      </Link>
      <PageHeader title={member ? member.name : t('members:new')} />

      <div className="space-y-4">
        {member ? (
          <Card>
            <h2 className="mb-3 font-bold">{t('admin:photo.title')}</h2>
            <PhotoEditor member={member} />
          </Card>
        ) : (
          <p className="rounded-xl bg-primary-soft p-3 text-sm text-link">{t('admin:members.photoAfterCreate')}</p>
        )}

        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (member?.active && !form.active) setConfirmDeactivate(true);
              else void submit();
            }}
          >
            <Field label={t('members:fields.type')}>
              <Segmented
                label={t('members:fields.type')}
                value={form.type}
                onChange={(v) => set('type', v)}
                options={(['player', 'coach', 'staff'] as const).map((type) => ({ value: type, label: t(`common:memberType.${type}`) }))}
              />
            </Field>
            <Field label={t('members:fields.name')} htmlFor="m-name">
              <Input id="m-name" required autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label={t('members:fields.nickname')} htmlFor="m-nick" optional>
              <Input id="m-nick" autoComplete="off" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} />
            </Field>
            <Field label={t('members:fields.birthDate')} htmlFor="m-birth" hint={t('members:fields.birthDateHint')}>
              <Input id="m-birth" type="date" required max={todayISO()} value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </Field>

            {isPlayer ? (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t('members:fields.shirtNumber')}
                  htmlFor="m-shirt"
                  optional
                  error={shirtInvalid ? t('members:fields.shirtInvalid') : undefined}
                  hint={duplicateShirt ? t('members:fields.shirtDuplicate') : undefined}
                >
                  <Input id="m-shirt" inputMode="numeric" value={form.shirt_number} onChange={(e) => set('shirt_number', e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label={t('members:fields.position')} htmlFor="m-pos" optional>
                  <Select id="m-pos" value={form.position} onChange={(e) => set('position', e.target.value as Position | '')}>
                    <option value="">—</option>
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {t(`members:position.${p}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : (
              <Field label={t('members:fields.staffRole')} htmlFor="m-role" optional>
                <Select id="m-role" value={form.staff_role} onChange={(e) => set('staff_role', e.target.value as StaffRole | '')}>
                  <option value="">—</option>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(`members:staffRole.${r}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {member && (
              <Checkbox
                checked={form.active}
                onChange={(v) => set('active', v)}
                label={t('members:fields.active')}
                description={t('members:fields.activeHint')}
              />
            )}

            <Button type="submit" size="lg" block loading={save.isPending} disabled={!valid}>
              {member ? t('common:actions.save') : t('members:create')}
            </Button>
          </form>
        </Card>
      </div>

      <ConfirmSheet
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title={t('admin:members.deactivateTitle')}
        message={t('admin:members.deactivateMessage', { name: form.name })}
        confirmLabel={t('admin:members.deactivate')}
        danger
        onConfirm={async () => {
          await submit();
          setConfirmDeactivate(false);
        }}
      />
    </div>
  );
}
