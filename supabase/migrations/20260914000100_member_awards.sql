-- Balneário 1º de Maio — member awards ("o mais estiloso")
--
-- A periodic award given to a member, decided by the admin. There is no
-- per-member login (the whole squad shares the "team" PIN), so this cannot be
-- a squad vote: it is an admin pick, like the cake podium.
--
-- The period is stored as a closed date range instead of a month, so moving to
-- a weekly award later is a change in who computes the range, not a migration.

create type public.member_award_kind as enum ('stylish');

create table public.member_awards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  kind public.member_award_kind not null,
  period_start date not null,
  period_end date not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint member_awards_period_order check (period_end >= period_start),
  unique (kind, period_start, period_end)   -- one winner per period
);

create index on public.member_awards (kind, period_start desc);
create index on public.member_awards (member_id);

-- Only active members can win --------------------------------------------------
create or replace function public.member_awards_validate() returns trigger
language plpgsql as $$
declare
  m public.members;
begin
  select * into m from public.members where id = new.member_id;
  if not found then
    raise exception 'AWARD_MEMBER_NOT_FOUND';
  end if;
  if not m.active then
    raise exception 'AWARD_MEMBER_INACTIVE';
  end if;
  return new;
end
$$;

create trigger member_awards_validate
before insert or update on public.member_awards
for each row execute function public.member_awards_validate();

create trigger log_activity after insert or update or delete on public.member_awards
for each row execute function public.log_activity();

-- Row Level Security: read for any logged-in profile, write for admin ----------
alter table public.member_awards enable row level security;

create policy "member_awards: read (authenticated)" on public.member_awards
  for select to authenticated using (true);
create policy "member_awards: insert (admin)" on public.member_awards
  for insert to authenticated with check (public.is_admin());
create policy "member_awards: update (admin)" on public.member_awards
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "member_awards: delete (admin)" on public.member_awards
  for delete to authenticated using (public.is_admin());

revoke all on public.member_awards from anon;
