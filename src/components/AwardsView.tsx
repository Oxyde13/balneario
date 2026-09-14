import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { cn } from './ui';
import { useFormat } from '../hooks/useFormat';
import type { Cake, CakeAward, CakeAwardKind, Member } from '../types/db';

const MEDALS = ['🥇', '🥈', '🥉'];

export function placeLabel(kind: CakeAwardKind, position: number, t: (key: string) => string) {
  return t(`awards:place.${kind}${position}`);
}

/** Podium marker: the same medals on both podiums; the label says which one it is. */
export function PlaceMarker({ kind, position }: { kind: CakeAwardKind; position: number }) {
  const { t } = useTranslation();
  const label = placeLabel(kind, position, t);
  return (
    <span role="img" aria-label={label} title={label} className="text-2xl leading-none">
      {MEDALS[position - 1]}
    </span>
  );
}

/** The two podiums (best / worst), read-only. */
export function AwardsView({
  awards,
  cakes,
  members,
  compact,
}: {
  awards: CakeAward[];
  cakes: Map<string, Cake>;
  members: Map<string, Member>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();

  return (
    <div className={cn('grid gap-4', !compact && 'md:grid-cols-2')}>
      {(['best', 'worst'] as const).map((kind) => {
        const entries = awards.filter((a) => a.kind === kind).sort((a, b) => a.position - b.position);
        return (
          <section key={kind} aria-label={t(`awards:${kind}`)}>
            <h3 className="mb-2 font-bold">
              {kind === 'best' ? '🏅 ' : '🥴 '}
              {t(`awards:${kind}`)}
            </h3>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('awards:emptyPodium')}</p>
            ) : (
              <ol className="space-y-2">
                {entries.map((award) => {
                  const cake = cakes.get(award.cake_id);
                  const member = cake ? members.get(cake.member_id) : undefined;
                  return (
                    <li key={award.id} className="flex items-start gap-3 rounded-xl bg-muted/50 p-2">
                      <span className="flex w-10 shrink-0 justify-center">
                        <PlaceMarker kind={kind} position={award.position} />
                      </span>
                      {member && <Avatar name={member.name} photoPath={member.photo_path} size="sm" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{member?.name ?? '—'}</p>
                        {cake?.brought_on && <p className="text-xs text-muted-foreground">{fmt.date(cake.brought_on)}</p>}
                        {award.comment && <p className="mt-0.5 text-sm italic">“{award.comment}”</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
