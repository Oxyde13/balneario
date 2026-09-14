-- Balneário 1º de Maio — views (all security_invoker so RLS applies)

-- Per member: totals of fines. Members without fines do not appear.
create view public.fine_stats with (security_invoker = true) as
select
  m.id as member_id,
  m.type,
  m.name,
  m.nickname,
  m.staff_role,
  m.shirt_number,
  m.photo_path,
  m.active,
  sum(f.amount)::numeric(10,2) as total_amount,
  coalesce(sum(f.amount) filter (where f.paid_at is not null), 0)::numeric(10,2) as paid_amount,
  coalesce(sum(f.amount) filter (where f.paid_at is null), 0)::numeric(10,2) as unpaid_amount,
  count(*)::int as fine_count,
  count(*) filter (where f.paid_at is null)::int as unpaid_count
from public.fines f
join public.members m on m.id = f.member_id
group by m.id;

-- The dinner fund: payments received after the last registered dinner.
create view public.dinner_fund with (security_invoker = true) as
with last_dinner as (
  select max(held_on) as d from public.dinners
),
totals as (
  select
    coalesce(sum(f.amount) filter (
      where f.paid_at is not null
        and f.paid_at > coalesce((select d from last_dinner), '-infinity'::date)
    ), 0)::numeric(10,2) as collected,
    coalesce(sum(f.amount) filter (where f.paid_at is null), 0)::numeric(10,2) as pending
  from public.fines f
)
select
  (select d from last_dinner) as last_dinner_date,
  t.collected,
  t.pending,
  (t.collected + t.pending)::numeric(10,2) as potential
from totals t;
