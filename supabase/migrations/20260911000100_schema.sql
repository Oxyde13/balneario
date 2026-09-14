-- Balneário 1º de Maio — schema
-- Tables, types and indexes. Business rules live in the next migrations.
--
-- There is no "season" entity: the club runs one continuous season. The cake
-- window (7 September – 31 May) is a fixed rule, computed by public.cake_window().

create extension if not exists pgcrypto;

-- Team members (players and staff) -----------------------------------------
create type public.member_type as enum ('player', 'coach', 'staff');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  type public.member_type not null default 'player',
  staff_role text,                        -- i18n key: head_coach, assistant_coach, goalkeeper_coach,
                                          -- fitness_coach, physio, team_manager, other (null for players)
  name text not null,
  nickname text,
  shirt_number smallint,                  -- players only
  position text,                          -- i18n key: goalkeeper, defender, midfielder, forward (players only)
  birth_date date not null,
  photo_path text,                        -- object path in the 'member-photos' bucket
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type = 'player' or shirt_number is null),
  check (staff_role is null or staff_role in
    ('head_coach', 'assistant_coach', 'goalkeeper_coach', 'fitness_coach', 'physio', 'team_manager', 'other')),
  check (position is null or position in ('goalkeeper', 'defender', 'midfielder', 'forward'))
);

-- Fine rules ------------------------------------------------------------------
create table public.fine_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,                    -- pt-PT (required)
  title_en text,                          -- en-GB (optional; falls back to pt-PT)
  description text,
  description_en text,
  category text,
  category_en text,
  amount numeric(8,2) not null check (amount >= 0),
  applies_to public.member_type[],        -- null = everyone; e.g. '{player}' = players only
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Fines -----------------------------------------------------------------------
create table public.fines (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  rule_id uuid references public.fine_rules(id) on delete set null,
  description text not null,              -- snapshot of the pt-PT rule title
  description_en text,                    -- snapshot of the en-GB rule title (if any)
  amount numeric(8,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  notes text,
  paid_at date,                           -- null = unpaid
  created_at timestamptz not null default now()
);
create index on public.fines (member_id);
create index on public.fines (member_id) where paid_at is null;
create index on public.fines (paid_at);
create index on public.fines (occurred_on desc);

-- Birthday cakes --------------------------------------------------------------
-- One row per member: the day they bring the cake.
create table public.cakes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete restrict,
  due_date date,                          -- birthday inside the cake window OR alternative date
  is_alternative_date boolean not null default false,
  brought_on date,                        -- null = not brought yet
  notes text
);

-- Cake awards (best 3 and worst 3) -----------------------------------------------
create type public.cake_award_kind as enum ('best', 'worst');

create table public.cake_awards (
  id uuid primary key default gen_random_uuid(),
  cake_id uuid not null unique references public.cakes(id) on delete restrict,
  kind public.cake_award_kind not null,
  position smallint not null check (position between 1 and 3),
  comment text,
  created_at timestamptz not null default now(),
  unique (kind, position)                 -- one cake per podium slot
);

-- Team dinners -------------------------------------------------------------------
-- All the fine money pays for team dinners. Each dinner closes the fund
-- collected since the previous one.
create table public.dinners (
  id uuid primary key default gen_random_uuid(),
  held_on date not null unique,
  place text,
  notes text,
  fund_amount numeric(8,2) not null default 0, -- snapshot, computed by trigger
  created_at timestamptz not null default now()
);
create index on public.dinners (held_on desc);

-- Activity log (written by triggers only) -------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log (created_at desc);
create index on public.activity_log (table_name, created_at desc);

-- Keep-alive (pinged by the GitHub Actions workflow) ------------------------------
create table public.keep_alive (
  id smallint primary key default 1 check (id = 1),
  note text not null default 'Pinged by .github/workflows/keep-alive.yml'
);
insert into public.keep_alive (id) values (1);
