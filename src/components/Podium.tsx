import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar';
import { TypeBadge } from './MemberBits';
import { cn } from './ui';
import { shortName } from '../lib/members';
import type { MemberSummary } from '../types/db';

export interface PodiumEntry {
  member: Pick<MemberSummary, 'member_id' | 'name' | 'nickname' | 'type' | 'staff_role' | 'photo_path'>;
  value: ReactNode;
  detail?: ReactNode;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const HEIGHTS = ['h-20', 'h-14', 'h-10'];
// Visual order: 2nd, 1st, 3rd (DOM order stays 1st, 2nd, 3rd for screen readers).
const ORDER = [1, 0, 2];

export function Podium({ entries, label }: { entries: PodiumEntry[]; label: string }) {
  const top = entries.slice(0, 3);
  return (
    <ol aria-label={label} className="grid grid-cols-3 items-end gap-2">
      {[0, 1, 2].map((index) => {
        const entry = top[index];
        if (!entry) return <li key={index} aria-hidden="true" style={{ order: ORDER.indexOf(index) }} />;
        return (
          <li key={entry.member.member_id} className="flex min-w-0 flex-col items-center text-center" style={{ order: ORDER.indexOf(index) }}>
            <Link to={`/team/${entry.member.member_id}`} className="flex w-full min-w-0 flex-col items-center rounded-xl p-1 hover:bg-muted">
              <Avatar name={entry.member.name} photoPath={entry.member.photo_path} size={index === 0 ? 'lg' : 'md'} />
              <span className="mt-1 w-full truncate text-sm font-bold">{shortName(entry.member)}</span>
              <TypeBadge member={entry.member} />
              <span className="tabular mt-0.5 text-sm font-extrabold text-link">{entry.value}</span>
              {entry.detail && <span className="text-xs text-muted-foreground">{entry.detail}</span>}
            </Link>
            <div
              className={cn(
                'mt-1 flex w-full items-start justify-center rounded-t-xl bg-primary/90 pt-1 text-xl',
                HEIGHTS[index],
              )}
              aria-hidden="true"
            >
              {MEDALS[index]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
