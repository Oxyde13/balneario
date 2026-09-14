import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useMembers } from '../hooks/queries';
import { MemberLine, memberSubtitle } from '../components/MemberBits';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, SectionTitle, buttonClass } from '../components/ui';
import { ChevronRightIcon, PlusIcon } from '../components/icons';
import { splitSquad } from '../lib/members';
import type { Member } from '../types/db';

export function TeamPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { data = [], isLoading, error, refetch } = useMembers();
  const squad = useMemo(() => splitSquad(data.filter((m) => m.active)), [data]);

  return (
    <div>
      <PageHeader
        title={t('members:team.title')}
        subtitle={t('members:team.subtitle', { players: squad.players.length, staff: squad.staff.length })}
        actions={
          isAdmin ? (
            <Link to="/admin/members/new" className={buttonClass('primary', 'sm')}>
              <PlusIcon className="h-4 w-4" />
              {t('members:new')}
            </Link>
          ) : undefined
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : squad.players.length + squad.staff.length === 0 ? (
        <EmptyState emoji="👻" title={t('members:team.empty')} />
      ) : (
        <>
          <SquadSection title={t('common:filterType.players')} members={squad.players} />
          <SquadSection title={t('common:filterType.staff')} members={squad.staff} />
        </>
      )}
    </div>
  );
}

function SquadSection({ title, members }: { title: string; members: Member[] }) {
  const { t } = useTranslation();
  if (members.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <li key={member.id}>
            <Link
              to={`/team/${member.id}`}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40"
            >
              <MemberLine
                member={member}
                className="flex-1"
                subtitle={[memberSubtitle(member, t), member.nickname ? `“${member.nickname}”` : null].filter(Boolean).join(' · ')}
              />
              <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
