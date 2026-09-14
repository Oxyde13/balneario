import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { Badge, cn } from './ui';
import type { Member, MemberSummary } from '../types/db';

type MemberLike = Pick<Member, 'name' | 'nickname' | 'type' | 'staff_role' | 'shirt_number' | 'photo_path'>;

/** "Treinador" / "Coach" badge for coaching staff; nothing for players. */
export function TypeBadge({ member }: { member: Pick<Member, 'type' | 'staff_role'> }) {
  const { t } = useTranslation();
  if (member.type === 'player') return null;
  return <Badge tone="primary">{t(`common:memberType.${member.type}`)}</Badge>;
}

export function memberSubtitle(member: Pick<Member, 'type' | 'staff_role' | 'position' | 'shirt_number'>, t: (key: string) => string) {
  if (member.type === 'player') {
    const parts = [member.shirt_number != null ? `#${member.shirt_number}` : null, member.position ? t(`members:position.${member.position}`) : null];
    return parts.filter(Boolean).join(' · ');
  }
  return member.staff_role ? t(`members:staffRole.${member.staff_role}`) : t(`common:memberType.${member.type}`);
}

/** Avatar + name (+ nickname, badge) in one line; used across lists. */
export function MemberLine({
  member,
  subtitle,
  trailing,
  size = 'md',
  className,
}: {
  member: MemberLike | (MemberSummary & { position?: null });
  subtitle?: ReactNode;
  trailing?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar name={member.name} photoPath={member.photo_path} size={size} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold">{member.name}</span>
          <TypeBadge member={member} />
        </p>
        {(subtitle || member.nickname) && (
          <p className="truncate text-sm text-muted-foreground">
            {subtitle ?? <span className="italic">“{member.nickname}”</span>}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}
