-- Balneário 1º de Maio — database acceptance tests
--
-- Runs inside a transaction and ends with ROLLBACK: nothing is changed.
-- Requires the seed data (supabase/seed.sql). Can be run in the Supabase SQL
-- editor or with psql. Any failed check aborts with an error that names it;
-- on success the last line prints 'ALL ACCEPTANCE TESTS PASSED'.

begin;

create schema acceptance_test;
grant usage on schema acceptance_test to anon, authenticated;

create function acceptance_test.expect_error(label text, stmt text, pattern text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAILED [%]: expected an error matching "%", but the statement succeeded', label, pattern;
exception when others then
  if sqlerrm like 'FAILED [%' then
    raise;
  end if;
  if sqlerrm !~* pattern then
    raise exception 'FAILED [%]: expected error "%", got "%"', label, pattern, sqlerrm;
  end if;
end
$$;

create function acceptance_test.expect_rows(label text, stmt text, expected int) returns void
language plpgsql as $$
declare
  n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n <> expected then
    raise exception 'FAILED [%]: expected % affected rows, got %', label, expected, n;
  end if;
end
$$;

create function acceptance_test.expect(label text, ok boolean) returns void
language plpgsql as $$
begin
  if ok is distinct from true then
    raise exception 'FAILED [%]', label;
  end if;
end
$$;

grant execute on all functions in schema acceptance_test to anon, authenticated;

-- 1. Anonymous: no reads, no writes -----------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select acceptance_test.expect_error('anon reads members', 'select * from public.members', 'permission denied');
select acceptance_test.expect_error('anon reads fines', 'select * from public.fines', 'permission denied');
select acceptance_test.expect_error('anon reads dinner_fund', 'select * from public.dinner_fund', 'permission denied');
select acceptance_test.expect_error('anon reads fine_stats', 'select * from public.fine_stats', 'permission denied');
select acceptance_test.expect_error('anon reads dinners', 'select * from public.dinners', 'permission denied');
select acceptance_test.expect_error('anon inserts fine',
  $$insert into public.fines (member_id, description, amount)
    values ('00000000-0000-4000-8000-000000000101', 'x', 1)$$,
  'permission denied');
select acceptance_test.expect_error('anon calls rpc', 'select public.generate_cake_calendar()', 'permission denied');
select acceptance_test.expect_rows('anon reads photos', $$select * from storage.objects where bucket_id = 'member-photos'$$, 0);
reset role;

-- 2. Team: reads everything, every write is rejected ------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"team"}}';
select acceptance_test.expect('team reads members', (select count(*) from public.members) = 8);
select acceptance_test.expect('team reads fines', (select count(*) from public.fines) > 0);
select acceptance_test.expect('team reads stats', (select count(*) from public.fine_stats) > 0);
select acceptance_test.expect('team reads dinners', (select count(*) from public.dinners) = 1);
select acceptance_test.expect('team cannot read activity_log', (select count(*) from public.activity_log) = 0);
select acceptance_test.expect_error('team inserts fine',
  $$insert into public.fines (member_id, description, amount)
    values ('00000000-0000-4000-8000-000000000101', 'x', 1)$$,
  'row-level security');
select acceptance_test.expect_error('team inserts member',
  $$insert into public.members (name, birth_date) values ('Intruso', '2000-01-01')$$, 'row-level security');
select acceptance_test.expect_error('team registers a dinner',
  $$insert into public.dinners (held_on) values ('2027-05-30')$$, 'row-level security');
select acceptance_test.expect_rows('team updates fines', 'update public.fines set amount = 99', 0);
select acceptance_test.expect_rows('team pays fines', 'update public.fines set paid_at = current_date where paid_at is null', 0);
select acceptance_test.expect_rows('team deletes fines', 'delete from public.fines', 0);
select acceptance_test.expect_rows('team deletes members', 'delete from public.members', 0);
select acceptance_test.expect_rows('team deletes rules', 'delete from public.fine_rules', 0);
select acceptance_test.expect_rows('team deletes cakes', 'delete from public.cakes', 0);
select acceptance_test.expect_rows('team deletes awards', 'delete from public.cake_awards', 0);
select acceptance_test.expect('team reads member awards', (select count(*) from public.member_awards) = 2);
select acceptance_test.expect_error('team names the most stylish',
  $$insert into public.member_awards (member_id, kind, period_start, period_end)
    values ('00000000-0000-4000-8000-000000000101', 'stylish', '2026-07-01', '2026-07-31')$$,
  'row-level security');
select acceptance_test.expect_rows('team deletes member awards', 'delete from public.member_awards', 0);
select acceptance_test.expect_rows('team deletes dinners', 'delete from public.dinners', 0);
select acceptance_test.expect_error('team writes activity_log',
  $$insert into public.activity_log (table_name, action) values ('x', 'insert')$$, 'permission denied');
select acceptance_test.expect_error('team generates calendar', 'select public.generate_cake_calendar()', 'NOT_ADMIN');
select acceptance_test.expect_error('team uploads photo',
  $$insert into storage.objects (bucket_id, name) values ('member-photos', 'x.webp')$$, 'row-level security');
reset role;
select acceptance_test.expect('team changed nothing', (select count(*) from public.fines where amount = 99) = 0);

-- 3. Admin -------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';

select acceptance_test.expect('admin reads activity_log', (select count(*) from public.activity_log) > 0);

-- Most stylish: one winner per month, active members only ---------------------------
select acceptance_test.expect_error('two winners in the same month',
  $$insert into public.member_awards (member_id, kind, period_start, period_end)
    values ('00000000-0000-4000-8000-000000000102', 'stylish', '2026-09-01', '2026-09-30')$$,
  'duplicate key');
select acceptance_test.expect_error('award period runs backwards',
  $$insert into public.member_awards (member_id, kind, period_start, period_end)
    values ('00000000-0000-4000-8000-000000000102', 'stylish', '2026-07-31', '2026-07-01')$$,
  'member_awards_period_order');
update public.members set active = false where id = '00000000-0000-4000-8000-000000000106';
select acceptance_test.expect_error('inactive member wins',
  $$insert into public.member_awards (member_id, kind, period_start, period_end)
    values ('00000000-0000-4000-8000-000000000106', 'stylish', '2026-07-01', '2026-07-31')$$,
  'AWARD_MEMBER_INACTIVE');
update public.members set active = true where id = '00000000-0000-4000-8000-000000000106';
select acceptance_test.expect_rows('admin names the most stylish',
  $$insert into public.member_awards (member_id, kind, period_start, period_end, comment)
    values ('00000000-0000-4000-8000-000000000102', 'stylish', '2026-07-01', '2026-07-31', 'Camisa de manga curta em julho.')$$, 1);
select acceptance_test.expect('the award is in the activity log',
  (select count(*) from public.activity_log where table_name = 'member_awards') > 0);

-- Members are never deleted, not even by admin.
select acceptance_test.expect_rows('admin deletes member', $$delete from public.members where name = 'Chinedu Okafor'$$, 0);
select acceptance_test.expect('member still there', exists (select 1 from public.members where name = 'Chinedu Okafor'));

-- The cake window (7 September – 31 May) is derived from the date, not from a season.
select acceptance_test.expect('window in September', public.cake_window_start('2026-09-12') = '2026-09-07');
select acceptance_test.expect('window ends in May', public.cake_window_end('2026-09-12') = '2027-05-31');
select acceptance_test.expect('window in February belongs to the previous September',
  public.cake_window_start('2027-02-10') = '2026-09-07' and public.cake_window_end('2027-02-10') = '2027-05-31');
select acceptance_test.expect('window on the last day', public.cake_window_start('2027-05-31') = '2026-09-07');
select acceptance_test.expect('summer points to the next window',
  public.cake_window_start('2027-07-20') = '2027-09-07' and public.cake_window_end('2027-07-20') = '2028-05-31');

-- Birthdays.
select acceptance_test.expect('15/07 is outside the window',
  public.birthday_in_window('1998-07-15', '2026-09-07', '2027-05-31') is null);
select acceptance_test.expect('22/08 is outside the window',
  public.birthday_in_window('1978-08-22', '2026-09-07', '2027-05-31') is null);
select acceptance_test.expect('29/02 -> 28/02 in 2027',
  public.birthday_in_window('2000-02-29', '2026-09-07', '2027-05-31') = '2027-02-28');
select acceptance_test.expect('29/02 stays in leap 2028',
  public.birthday_in_window('2000-02-29', '2027-09-07', '2028-05-31') = '2028-02-29');
select acceptance_test.expect('07/09 is the first day',
  public.birthday_in_window('1990-09-07', '2026-09-07', '2027-05-31') = '2026-09-07');
select acceptance_test.expect('06/09 is outside',
  public.birthday_in_window('1990-09-06', '2026-09-07', '2027-05-31') is null);
select acceptance_test.expect('31/05 is the last day',
  public.birthday_in_window('1990-05-31', '2026-09-07', '2027-05-31') = '2027-05-31');
select acceptance_test.expect('Chinedu (15/07) has no date',
  (select due_date is null and is_alternative_date from public.cakes
   where member_id = '00000000-0000-4000-8000-000000000102'));

-- Cake calendar: coaches included, idempotent, alternative dates preserved.
update public.cakes set due_date = '2026-10-01'
where member_id = '00000000-0000-4000-8000-000000000102';
insert into public.members (id, type, staff_role, name, birth_date, active)
values ('00000000-0000-4000-8000-000000000999', 'coach', 'goalkeeper_coach', 'Treinador Inativo', '1980-03-03', false);
update public.members set active = true where id = '00000000-0000-4000-8000-000000000999';
delete from public.cakes where member_id = '00000000-0000-4000-8000-000000000999';
select public.generate_cake_calendar();
select acceptance_test.expect('calendar includes coach',
  exists (select 1 from public.cakes where member_id = '00000000-0000-4000-8000-000000000999' and due_date = '2027-03-03'));
select acceptance_test.expect('calendar is idempotent', public.generate_cake_calendar() = 0);
select acceptance_test.expect('alternative date preserved',
  (select due_date = '2026-10-01' from public.cakes where member_id = '00000000-0000-4000-8000-000000000102'));
select acceptance_test.expect('one cake row per active member',
  (select count(*) from public.cakes) = (select count(*) from public.members where active));

-- A member who joins now, whose birthday already passed, gets "no date", not "overdue".
insert into public.members (id, name, birth_date)
values ('00000000-0000-4000-8000-000000000998', 'Reforço de Inverno',
        make_date(1999, extract(month from public.madeira_today() - 1)::int, extract(day from public.madeira_today() - 1)::int));
select acceptance_test.expect('late joiner has no date',
  (select due_date is null and is_alternative_date from public.cakes
   where member_id = '00000000-0000-4000-8000-000000000998'));

-- Cake awards.
select acceptance_test.expect_error('award for cake not brought',
  $$insert into public.cake_awards (cake_id, kind, position)
    values ('00000000-0000-4000-8000-000000000504', 'worst', 2)$$,
  'AWARD_CAKE_NOT_BROUGHT');
select acceptance_test.expect_error('same cake in two slots',
  $$insert into public.cake_awards (cake_id, kind, position)
    values ('00000000-0000-4000-8000-000000000505', 'worst', 3)$$,
  'duplicate key');
update public.cakes set brought_on = '2026-09-11' where id = '00000000-0000-4000-8000-000000000504';
select acceptance_test.expect_error('two cakes in one slot',
  $$insert into public.cake_awards (cake_id, kind, position)
    values ('00000000-0000-4000-8000-000000000504', 'best', 1)$$,
  'duplicate key');
select acceptance_test.expect_error('unbring awarded cake',
  $$update public.cakes set brought_on = null where id = '00000000-0000-4000-8000-000000000505'$$, 'CAKE_HAS_AWARD');
-- Swap: best 2 (Carlos) goes to best 1, Tiago moves to best 2.
select public.set_cake_award('best', 1::smallint, '00000000-0000-4000-8000-000000000507', null);
select acceptance_test.expect('swap moved both cakes',
  (select cake_id from public.cake_awards where kind = 'best' and position = 1) = '00000000-0000-4000-8000-000000000507'
  and (select cake_id from public.cake_awards where kind = 'best' and position = 2) = '00000000-0000-4000-8000-000000000505');

-- Rule changes never touch assigned fines.
update public.fine_rules set amount = 50, title = 'Mudou' where id = '00000000-0000-4000-8000-000000000201';
select acceptance_test.expect('fines keep their snapshot',
  not exists (select 1 from public.fines where rule_id = '00000000-0000-4000-8000-000000000201'
              and (amount <> 2 or description <> 'Atraso ao treino')));

-- Rankings: dodgers, coaches included, most reliable payer.
select acceptance_test.expect('unpaid totals per member',
  (select unpaid_amount = 14 and total_amount = 14 from public.fine_stats where name = 'Chinedu Okafor'));
select acceptance_test.expect('Rúben is all paid up',
  (select unpaid_amount = 0 and fine_count = 2 from public.fine_stats where name = 'Rúben Teixeira'));
insert into public.fines (member_id, description, amount, occurred_on)
values ('00000000-0000-4000-8000-000000000101', 'Atraso', 2, '2026-09-12');
select acceptance_test.expect('new unpaid fine leaves the reliable ranking',
  (select unpaid_amount = 2 from public.fine_stats where name = 'Rúben Teixeira'));
insert into public.fines (member_id, description, amount, occurred_on)
values ('00000000-0000-4000-8000-000000000107', 'Cartão vermelho', 20, '2026-09-12');
select acceptance_test.expect('a coach can be the top dodger',
  (select type = 'coach' from public.fine_stats order by unpaid_amount desc limit 1));

-- Dinner fund and closed payments.
select acceptance_test.expect('fund counts payments after the last dinner only',
  (select collected = 16 from public.dinner_fund));
select acceptance_test.expect_error('undo payment included in dinner',
  $$update public.fines set paid_at = null where paid_at = '2025-10-10'$$, 'FINE_LOCKED');
select acceptance_test.expect_error('edit fine included in dinner',
  $$update public.fines set notes = 'x' where paid_at = '2025-10-10'$$, 'FINE_LOCKED');
select acceptance_test.expect_error('delete fine included in dinner',
  $$delete from public.fines where paid_at = '2025-10-10'$$, 'FINE_LOCKED');
select acceptance_test.expect_error('payment dated on dinner day',
  $$update public.fines set paid_at = '2026-05-30' where member_id = '00000000-0000-4000-8000-000000000102' and paid_at is null$$,
  'PAYMENT_BEFORE_DINNER');
select acceptance_test.expect_error('payment dated before dinner',
  $$update public.fines set paid_at = '2026-01-01' where member_id = '00000000-0000-4000-8000-000000000102' and paid_at is null$$,
  'PAYMENT_BEFORE_DINNER');

-- Paying and unpaying is logged.
create temp table log_before on commit drop as select count(*) as n from public.activity_log where table_name = 'fines';
select acceptance_test.expect_rows('pay the old unpaid fine',
  $$update public.fines set paid_at = '2026-09-12'
    where member_id = '00000000-0000-4000-8000-000000000102' and occurred_on = '2026-04-12'$$, 1);
select acceptance_test.expect('fund includes new payment', (select collected = 26 from public.dinner_fund));
select acceptance_test.expect_rows('unpay it again',
  $$update public.fines set paid_at = null
    where member_id = '00000000-0000-4000-8000-000000000102' and occurred_on = '2026-04-12'$$, 1);
select acceptance_test.expect('pay/unpay logged',
  (select count(*) from public.activity_log where table_name = 'fines') = (select n from log_before) + 2);

-- Registering a dinner: server-side snapshot, fund back to zero, history kept.
insert into public.dinners (id, held_on, place, fund_amount)
values ('00000000-0000-4000-8000-000000000302', '2026-09-11', 'Teste', 999);
select acceptance_test.expect('snapshot computed server-side',
  (select fund_amount = 16 from public.dinners where id = '00000000-0000-4000-8000-000000000302'));
select acceptance_test.expect('fund back to zero', (select collected = 0 from public.dinner_fund));
select acceptance_test.expect('history keeps both dinners', (select count(*) from public.dinners) = 2);
select acceptance_test.expect_error('dinner date is immutable',
  $$update public.dinners set held_on = '2026-09-12' where id = '00000000-0000-4000-8000-000000000302'$$,
  'DINNER_IMMUTABLE');
select acceptance_test.expect_error('dinner amount is immutable',
  $$update public.dinners set fund_amount = 1 where id = '00000000-0000-4000-8000-000000000302'$$,
  'DINNER_IMMUTABLE');
select acceptance_test.expect_rows('dinner place stays editable',
  $$update public.dinners set place = 'Outro sítio', notes = 'nota' where id = '00000000-0000-4000-8000-000000000302'$$, 1);
select acceptance_test.expect_error('a new dinner must come after the previous one',
  $$insert into public.dinners (held_on) values ('2026-09-01')$$, 'DINNER_BEFORE_PREVIOUS');
select acceptance_test.expect_error('cannot undo an older dinner',
  $$delete from public.dinners where id = '00000000-0000-4000-8000-000000000301'$$, 'DINNER_NOT_LATEST');
select acceptance_test.expect_rows('undo the latest dinner',
  $$delete from public.dinners where id = '00000000-0000-4000-8000-000000000302'$$, 1);
select acceptance_test.expect('undo restores the fund', (select collected = 16 from public.dinner_fund));

reset role;
select 'ALL ACCEPTANCE TESTS PASSED' as result;

rollback;
