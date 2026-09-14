-- Balneário 1º de Maio — Row Level Security and privileges
--
-- Two access profiles, identified by the JWT claim app_metadata.role:
--   admin -> read + write
--   team  -> read only
-- Anonymous users (no login) cannot read or write anything.

alter table public.members      enable row level security;
alter table public.fine_rules   enable row level security;
alter table public.fines        enable row level security;
alter table public.cakes        enable row level security;
alter table public.cake_awards  enable row level security;
alter table public.dinners      enable row level security;
alter table public.activity_log enable row level security;
alter table public.keep_alive   enable row level security;

-- Read: any logged-in profile. Write: admin only.
do $$
declare
  t text;
begin
  foreach t in array array['members', 'fine_rules', 'fines', 'cakes', 'cake_awards', 'dinners'] loop
    execute format('create policy "%1$s: read (authenticated)" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s: insert (admin)" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s: update (admin)" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    -- Members are never deleted: no delete policy (and a trigger blocks it too).
    if t <> 'members' then
      execute format('create policy "%1$s: delete (admin)" on public.%1$I for delete to authenticated using (public.is_admin())', t);
    end if;
  end loop;
end
$$;

-- Activity log: readable by admin only; no write policies (only the
-- security definer trigger function writes to it).
create policy "activity_log: read (admin)" on public.activity_log
  for select to authenticated using (public.is_admin());

-- Keep-alive: readable by any logged-in profile (the workflow logs in as team).
create policy "keep_alive: read (authenticated)" on public.keep_alive
  for select to authenticated using (true);

-- Privileges -----------------------------------------------------------------------
-- RLS already blocks anon, but views and functions would still answer with
-- empty results. Remove anon (and PUBLIC) access altogether.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- Nobody writes to the activity log through the API.
revoke insert, update, delete, truncate on public.activity_log from authenticated;
-- Views are read-only.
revoke insert, update, delete, truncate on public.fine_stats, public.dinner_fund from authenticated;
