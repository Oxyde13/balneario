import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/useFormat';
import { useAwards, useCakes, useClearAward, useMembers, useSetAward, useUpdateAward } from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { Avatar } from '../../components/Avatar';
import { PlaceMarker, placeLabel } from '../../components/AwardsView';
import { ShareButton } from '../../components/ShareButton';
import { Sheet } from '../../components/Sheet';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, ListSkeleton, PageHeader, cn } from '../../components/ui';
import { SearchIcon } from '../../components/icons';
import { errorMessage } from '../../lib/errors';
import { matchesSearch, shortName } from '../../lib/members';
import { awardsMessage } from '../../lib/shareTexts';
import type { CakeAward, CakeAwardKind } from '../../types/db';

interface Slot {
  kind: CakeAwardKind;
  position: 1 | 2 | 3;
}

export default function AwardsAdminPage() {
  const { t } = useTranslation();
  const awards = useAwards();
  const cakes = useCakes();
  const { data: members = [] } = useMembers();
  const [slot, setSlot] = useState<Slot | null>(null);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const cakeMap = useMemo(() => new Map((cakes.data ?? []).map((c) => [c.id, c])), [cakes.data]);
  const bySlot = useMemo(() => new Map((awards.data ?? []).map((a) => [`${a.kind}-${a.position}`, a])), [awards.data]);
  const brought = (cakes.data ?? []).filter((c) => c.brought_on);

  const share = awardsMessage(
    (awards.data ?? []).map((a) => {
      const cake = cakeMap.get(a.cake_id);
      const member = cake ? memberMap.get(cake.member_id) : undefined;
      return { kind: a.kind, position: a.position, name: member ? shortName(member) : '—', comment: a.comment };
    }),
  );

  return (
    <div>
      <PageHeader
        title={t('awards:title')}
        subtitle={t('awards:adminSubtitle')}
        actions={(awards.data ?? []).length > 0 ? <ShareButton build={share} /> : undefined}
      />
      {awards.error || cakes.error ? (
        <ErrorState error={awards.error ?? cakes.error} onRetry={() => void awards.refetch()} />
      ) : awards.isLoading || cakes.isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <>
          {brought.length === 0 && <p className="mb-4 rounded-xl bg-warning/10 p-3 text-sm font-semibold text-warning">{t('awards:noBroughtCakes')}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {(['best', 'worst'] as const).map((kind) => (
              <Card key={kind}>
                <h2 className="mb-3 text-lg font-extrabold">
                  {kind === 'best' ? '🏅 ' : '🥴 '}
                  {t(`awards:${kind}`)}
                </h2>
                <ol className="space-y-2">
                  {([1, 2, 3] as const).map((position) => {
                    const award = bySlot.get(`${kind}-${position}`);
                    const cake = award ? cakeMap.get(award.cake_id) : undefined;
                    const member = cake ? memberMap.get(cake.member_id) : undefined;
                    return (
                      <li key={position}>
                        <button
                          type="button"
                          onClick={() => setSlot({ kind, position })}
                          className={cn(
                            'flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 p-2 text-left transition hover:border-primary/60',
                            award ? 'border-border bg-card' : 'border-dashed border-border bg-muted/40',
                          )}
                        >
                          <span className="flex w-10 shrink-0 justify-center">
                            <PlaceMarker kind={kind} position={position} />
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
                            <span className="text-sm font-semibold text-muted-foreground">{t('awards:emptySlot')}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ))}
          </div>
        </>
      )}

      {slot && (
        <SlotSheet slot={slot} award={bySlot.get(`${slot.kind}-${slot.position}`)} awards={awards.data ?? []} onClose={() => setSlot(null)} />
      )}
    </div>
  );
}

function SlotSheet({
  slot,
  award,
  awards,
  onClose,
}: {
  slot: Slot;
  award: CakeAward | undefined;
  awards: CakeAward[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const toast = useToast();
  const { data: cakes = [] } = useCakes();
  const { data: members = [] } = useMembers();
  const setAward = useSetAward();
  const updateAward = useUpdateAward();
  const clearAward = useClearAward();
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState(award?.comment ?? '');
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const awardByCake = new Map(awards.map((a) => [a.cake_id, a]));

  const options = cakes
    .filter((c) => c.brought_on)
    .map((cake) => ({ cake, member: memberMap.get(cake.member_id) }))
    .filter((o) => o.member && matchesSearch(o.member, search))
    .sort((a, b) => (a.cake.brought_on ?? '').localeCompare(b.cake.brought_on ?? ''));

  const done = (message: string) => {
    toast(message);
    onClose();
  };
  const fail = (e: unknown) => toast(errorMessage(e, t), 'error');

  const choose = (cakeId: string) =>
    setAward.mutate(
      { kind: slot.kind, position: slot.position, cakeId, comment: comment.trim() || null },
      { onSuccess: () => done(t('awards:saved')), onError: fail },
    );

  return (
    <Sheet open onClose={onClose} title={placeLabel(slot.kind, slot.position, t)} size="lg">
      <div className="space-y-4">
        <Field label={t('awards:comment')} htmlFor="award-comment" optional hint={t('awards:commentHint')}>
          <Input id="award-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('awards:commentPlaceholder')} />
        </Field>
        {award && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={comment === (award.comment ?? '')}
              loading={updateAward.isPending}
              onClick={() => updateAward.mutate({ id: award.id, comment: comment.trim() || null }, { onSuccess: () => done(t('awards:saved')), onError: fail })}
            >
              {t('awards:saveComment')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              loading={clearAward.isPending}
              onClick={() => clearAward.mutate(award.id, { onSuccess: () => done(t('awards:cleared')), onError: fail })}
            >
              {t('awards:clearSlot')}
            </Button>
          </div>
        )}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder={t('awards:searchCake')} aria-label={t('awards:searchCake')} />
        </div>

        {options.length === 0 ? (
          <EmptyState emoji="🍰" title={t('awards:noBroughtCakes')} />
        ) : (
          <ul className="space-y-2">
            {options.map(({ cake, member }) => {
              const current = awardByCake.get(cake.id);
              const isHere = current?.id === award?.id && Boolean(award);
              return (
                <li key={cake.id}>
                  <button
                    type="button"
                    disabled={setAward.isPending || isHere}
                    onClick={() => choose(cake.id)}
                    className={cn(
                      'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-2 text-left transition',
                      isHere ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:border-primary/50',
                    )}
                  >
                    <Avatar name={member!.name} photoPath={member!.photo_path} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{member!.name}</span>
                      <span className="block text-xs text-muted-foreground">{t('birthdays:broughtOn', { date: fmt.date(cake.brought_on) })}</span>
                    </span>
                    {current && !isHere && <Badge tone="warning">{t('awards:willSwap', { place: placeLabel(current.kind, current.position, t) })}</Badge>}
                    {isHere && <Badge tone="primary">{t('awards:current')}</Badge>}
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
