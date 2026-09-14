-- Balneário 1º de Maio — functions and triggers
-- Error messages raised here are stable codes (e.g. 'FINE_LOCKED') that the
-- frontend translates via the `common:dbErrors` i18n keys.

-- Helpers -----------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- "Today" for the club, not for the UTC server.
create or replace function public.madeira_today() returns date
language sql stable as $$
  select (now() at time zone 'Atlantic/Madeira')::date
$$;

create or replace function public.require_admin() returns void
language plpgsql stable as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end
$$;

-- Cake window -------------------------------------------------------------------
-- Cakes are brought between 7 September and 31 May. Birthdays between 1 June
-- and 6 September fall outside it and need an alternative date.

create or replace function public.cake_window_start(p_on date default null)
returns date language sql stable as $$
  with ref as (select coalesce(p_on, public.madeira_today()) as d)
  select case
    -- Between 1 January and 31 May the window started last September.
    when (select d from ref) <= make_date(extract(year from (select d from ref))::int, 5, 31)
      then make_date(extract(year from (select d from ref))::int - 1, 9, 7)
    -- Summer (1 June – 6 September): the upcoming window.
    else make_date(extract(year from (select d from ref))::int, 9, 7)
  end
$$;

create or replace function public.cake_window_end(p_on date default null)
returns date language sql stable as $$
  select make_date(extract(year from public.cake_window_start(p_on))::int + 1, 5, 31)
$$;

-- Birthday in a given year; 29 February becomes 28 February in non-leap years.
create or replace function public.birthday_in_year(p_birth date, p_year int) returns date
language sql immutable as $$
  select case
    when extract(month from p_birth) = 2 and extract(day from p_birth) = 29
         and not (p_year % 4 = 0 and (p_year % 100 <> 0 or p_year % 400 = 0))
      then make_date(p_year, 2, 28)
    else make_date(p_year, extract(month from p_birth)::int, extract(day from p_birth)::int)
  end
$$;

-- Birthday that falls inside the given window, or null when it falls outside.
create or replace function public.birthday_in_window(p_birth date, p_start date, p_end date) returns date
language plpgsql immutable as $$
declare
  y int;
  d date;
begin
  for y in extract(year from p_start)::int .. extract(year from p_end)::int loop
    d := public.birthday_in_year(p_birth, y);
    if d between p_start and p_end then
      return d;
    end if;
  end loop;
  return null;
end
$$;

-- Dinners -----------------------------------------------------------------------

create or replace function public.last_dinner_date() returns date
language sql stable as $$
  select max(held_on) from public.dinners
$$;

-- Dinner rules:
--  * the fund snapshot is always computed here, never trusted from the client;
--  * once registered, date and amount are immutable (place/notes stay editable);
--  * a new dinner must be after the previous one;
--  * only the latest dinner can be deleted (undo a mistake).
create or replace function public.dinners_guard() returns trigger
language plpgsql as $$
declare
  prev date;
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.dinners d where d.held_on > old.held_on) then
      raise exception 'DINNER_NOT_LATEST';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.held_on <> old.held_on or new.fund_amount is distinct from old.fund_amount then
      raise exception 'DINNER_IMMUTABLE';
    end if;
    return new;
  end if;

  select max(d.held_on) into prev from public.dinners d;
  if prev is not null and new.held_on <= prev then
    raise exception 'DINNER_BEFORE_PREVIOUS';
  end if;

  select coalesce(sum(f.amount), 0) into new.fund_amount
  from public.fines f
  where f.paid_at is not null
    and (prev is null or f.paid_at > prev)
    and f.paid_at <= new.held_on;

  return new;
end
$$;

create trigger dinners_guard
before insert or update or delete on public.dinners
for each row execute function public.dinners_guard();

-- Fines -------------------------------------------------------------------------

-- Payments up to the last dinner are closed: that money has been spent.
create or replace function public.fines_dinner_lock() returns trigger
language plpgsql as $$
declare
  last_dinner date := public.last_dinner_date();
begin
  if last_dinner is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.paid_at is not null and old.paid_at <= last_dinner then
    raise exception 'FINE_LOCKED';
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.paid_at is not null and new.paid_at <= last_dinner
     and (tg_op = 'INSERT' or old.paid_at is distinct from new.paid_at) then
    raise exception 'PAYMENT_BEFORE_DINNER';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger fines_dinner_lock
before insert or update or delete on public.fines
for each row execute function public.fines_dinner_lock();

-- Cakes -------------------------------------------------------------------------

-- Idempotent: creates one cake row per active member (any type). Existing rows
-- keep alternative dates and "brought" marks; only rows still derived from the
-- birthday are refreshed (e.g. after fixing a birth date).
create or replace function public.generate_cake_calendar() returns integer
language plpgsql as $$
declare
  w_start date := public.cake_window_start();
  w_end date := public.cake_window_end();
  n integer;
begin
  perform public.require_admin();

  insert into public.cakes (member_id, due_date, is_alternative_date)
  select m.id, b.d, b.d is null
  from public.members m
  cross join lateral (select public.birthday_in_window(m.birth_date, w_start, w_end) as d) b
  where m.active
  on conflict (member_id) do update
    set due_date = excluded.due_date,
        is_alternative_date = excluded.is_alternative_date
    where cakes.brought_on is null
      and not cakes.is_alternative_date
      and cakes.due_date is distinct from excluded.due_date;

  get diagnostics n = row_count;
  return n;
end
$$;

-- New (or re-activated) members get their cake row. If their birthday has
-- already passed, they need an alternative date instead of being flagged as overdue.
create or replace function public.members_create_cake() returns trigger
language plpgsql as $$
declare
  d date;
begin
  if not new.active then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.active then
    return null;
  end if;

  d := public.birthday_in_window(new.birth_date, public.cake_window_start(), public.cake_window_end());
  if d is not null and d < public.madeira_today() then
    d := null;
  end if;

  insert into public.cakes (member_id, due_date, is_alternative_date)
  values (new.id, d, d is null)
  on conflict (member_id) do nothing;

  return null;
end
$$;

create trigger members_create_cake
after insert or update of active on public.members
for each row execute function public.members_create_cake();

-- A cake that holds an award must stay "brought".
create or replace function public.cakes_award_guard() returns trigger
language plpgsql as $$
begin
  if new.brought_on is null and exists (select 1 from public.cake_awards a where a.cake_id = old.id) then
    raise exception 'CAKE_HAS_AWARD';
  end if;
  return new;
end
$$;

create trigger cakes_award_guard
before update of brought_on on public.cakes
for each row execute function public.cakes_award_guard();

-- Cake awards -------------------------------------------------------------------

create or replace function public.cake_awards_validate() returns trigger
language plpgsql as $$
declare
  c public.cakes;
begin
  select * into c from public.cakes where id = new.cake_id;
  if not found then
    raise exception 'AWARD_CAKE_NOT_FOUND';
  end if;
  if c.brought_on is null then
    raise exception 'AWARD_CAKE_NOT_BROUGHT';
  end if;
  return new;
end
$$;

create trigger cake_awards_validate
before insert or update on public.cake_awards
for each row execute function public.cake_awards_validate();

-- Puts a cake in a podium slot in one transaction. If the cake already held
-- another slot and the target slot was taken, the two cakes swap places.
create or replace function public.set_cake_award(
  p_kind public.cake_award_kind,
  p_position smallint,
  p_cake_id uuid,
  p_comment text default null
) returns void
language plpgsql as $$
declare
  current_slot public.cake_awards;
  target_slot public.cake_awards;
begin
  perform public.require_admin();

  select * into current_slot from public.cake_awards where cake_id = p_cake_id;
  select * into target_slot from public.cake_awards where kind = p_kind and position = p_position;

  if current_slot.id is not null and current_slot.id = target_slot.id then
    update public.cake_awards set comment = p_comment where id = target_slot.id;
    return;
  end if;

  delete from public.cake_awards where id in (current_slot.id, target_slot.id);

  insert into public.cake_awards (cake_id, kind, position, comment)
  values (p_cake_id, p_kind, p_position, p_comment);

  if current_slot.id is not null and target_slot.id is not null then
    insert into public.cake_awards (cake_id, kind, position, comment)
    values (target_slot.cake_id, current_slot.kind, current_slot.position, target_slot.comment);
  end if;
end
$$;

-- Members are never deleted ------------------------------------------------------

create or replace function public.members_prevent_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'MEMBER_DELETE_FORBIDDEN';
end
$$;

create trigger members_prevent_delete
before delete on public.members
for each row execute function public.members_prevent_delete();

-- Activity log -------------------------------------------------------------------

create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return null;
  end if;

  insert into public.activity_log (table_name, record_id, action, old_data, new_data)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end
$$;

create trigger log_activity after insert or update or delete on public.members
for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.fine_rules
for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.fines
for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.cakes
for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.cake_awards
for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.dinners
for each row execute function public.log_activity();
