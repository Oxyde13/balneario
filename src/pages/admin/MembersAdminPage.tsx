import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMembers } from '../../hooks/queries';
import { MemberLine, memberSubtitle } from '../../components/MemberBits';
import { Badge, EmptyState, ErrorState, Input, ListSkeleton, PageHeader, SectionTitle, Segmented, buttonClass } from '../../components/ui';
import { PlusIcon, SearchIcon } from '../../components/icons';
import { matchesSearch, splitSquad } from '../../lib/members';

type Show = 'active' | 'inactive';

export default function MembersAdminPage() {
  const { t } = useTranslation();
  const { data = [], isLoading, error, refetch } = useMembers();
  const [show, setShow] = useState<Show>('active');
  const [search, setSearch] = useState('');
  const squad = useMemo(
    () => splitSquad(data.filter((m) => m.active === (show === 'active') && matchesSearch(m, search))),
    [data, show, search],
  );

  return (
    <div>
      <PageHeader
        title={t('admin:members.title')}
        subtitle={t('admin:members.subtitle')}
        actions={
          <Link to="/admin/members/new" className={buttonClass('primary', 'sm')}>
            <PlusIcon className="h-4 w-4" />
            {t('members:new')}
          </Link>
        }
      />
      <div className="mb-4 space-y-2">
        <Segmented
          label={t('admin:members.show')}
          value={show}
          onChange={setShow}
          options={[
            { value: 'active', label: t('admin:members.active') },
            { value: 'inactive', label: t('admin:members.inactive') },
          ]}
        />
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder={t('fines:assign.searchPlaceholder')} aria-label={t('fines:assign.searchPlaceholder')} />
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : squad.players.length + squad.staff.length === 0 ? (
        <EmptyState emoji="👻" title={show === 'active' ? t('members:team.empty') : t('admin:members.noInactive')} />
      ) : (
        (['players', 'staff'] as const).map((group) =>
          squad[group].length === 0 ? null : (
            <section key={group}>
              <SectionTitle>{t(`common:filterType.${group}`)}</SectionTitle>
              <ul className="grid gap-2 sm:grid-cols-2">
                {squad[group].map((member) => (
                  <li key={member.id}>
                    <Link
                      to={`/admin/members/${member.id}`}
                      className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-primary/40"
                    >
                      <MemberLine member={member} className="flex-1" subtitle={memberSubtitle(member, t)} />
                      {!member.photo_path && <Badge>{t('admin:members.noPhoto')}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">{t('admin:members.neverDeleted')}</p>
    </div>
  );
}
