import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { cn } from './ui';
import { useFormat } from '../hooks/useFormat';
import { formatMonthYear } from '../lib/dates';
import type { Member, MemberAward } from '../types/db';

/** The monthly "most stylish" winners, newest first. Read-only. */
export function StylishView({
  awards,
  members,
  limit,
}: {
  awards: MemberAward[];
  members: Map<string, Member>;
  limit?: number;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const shown = limit ? awards.slice(0, limit) : awards;

  return (
    <ol className="space-y-2">
      {shown.map((award, index) => {
        const member = members.get(award.member_id);
        return (
          <li
            key={award.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-2',
              index === 0 ? 'border-primary/40 bg-primary-soft' : 'border-border',
            )}
          >
            <span role="img" aria-hidden="true" className="w-8 shrink-0 text-center text-2xl leading-none">
              {index === 0 ? '🕺' : '👔'}
            </span>
            {member && <Avatar name={member.name} photoPath={member.photo_path} size="sm" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{member?.name ?? '—'}</span>
              <span className="block truncate text-sm text-muted-foreground">{formatMonthYear(award.period_start, fmt.lng)}</span>
              {award.comment && <span className="block break-words text-sm italic text-muted-foreground">“{award.comment}”</span>}
            </span>
          </li>
        );
      })}
      {shown.length === 0 && <li className="text-sm text-muted-foreground">{t('stylish:noWinner')}</li>}
    </ol>
  );
}
