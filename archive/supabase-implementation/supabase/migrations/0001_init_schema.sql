-- ============================================================================
-- Intern Scoreboard & Leaderboard Management System
-- Migration 0001: Core schema (tables, indexes, triggers, ranked view)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ADMINS
-- One row per admin, id mirrors auth.users(id) 1:1.
-- Single-role system per project decision: every row in this table is an admin.
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.admins is 'Authorized admins. Row must exist for a Supabase Auth user to perform write actions.';

-- ----------------------------------------------------------------------------
-- INTERNS
-- ----------------------------------------------------------------------------
create table if not exists public.interns (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text unique not null,
  department  text not null,
  score       integer not null default 0 check (score >= 0 and score <= 100),
  is_deleted  boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.interns is 'Interns being tracked. Soft-delete only — never hard-delete a row.';

create index if not exists idx_interns_score
  on public.interns (score desc)
  where is_deleted = false;

create index if not exists idx_interns_department
  on public.interns (department)
  where is_deleted = false;

create index if not exists idx_interns_full_name
  on public.interns using gin (to_tsvector('english', full_name));

-- ----------------------------------------------------------------------------
-- SCORE_HISTORY
-- Append-only audit trail. One row per score change, written automatically
-- by a trigger on public.interns — never written directly by app code.
-- ----------------------------------------------------------------------------
create table if not exists public.score_history (
  id          uuid primary key default gen_random_uuid(),
  intern_id   uuid not null references public.interns(id) on delete cascade,
  old_score   integer not null,
  new_score   integer not null,
  updated_by  uuid references public.admins(id),
  updated_at  timestamptz not null default now()
);

comment on table public.score_history is 'Append-only audit log of every score change. Populated automatically by trigger, not by app code.';

create index if not exists idx_score_history_intern on public.score_history (intern_id);
create index if not exists idx_score_history_updated_at on public.score_history (updated_at desc);

-- ----------------------------------------------------------------------------
-- TRIGGER: keep interns.updated_at current
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_interns_updated_at on public.interns;
create trigger trg_interns_updated_at
  before update on public.interns
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- TRIGGER: auto-log every score change into score_history
-- security definer so the insert succeeds even though score_history has no
-- direct write policy for regular admin actions — the trigger is the only
-- writer.
-- ----------------------------------------------------------------------------
create or replace function public.log_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.score is distinct from old.score then
    insert into public.score_history (intern_id, old_score, new_score, updated_by)
    values (new.id, old.score, new.score, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_score_change on public.interns;
create trigger trg_log_score_change
  after update on public.interns
  for each row
  execute function public.log_score_change();

-- ----------------------------------------------------------------------------
-- VIEW: leaderboard
-- Rank is always computed on read — never stored — so it can never drift out
-- of sync with scores. Status bands match the spec's "Excellent" example;
-- adjust thresholds later if the org wants different cutoffs.
-- ----------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  i.id,
  i.full_name,
  i.email,
  i.department,
  i.score,
  row_number() over (order by i.score desc, i.created_at asc) as rank,
  case
    when i.score >= 90 then 'Excellent'
    when i.score >= 75 then 'Good'
    when i.score >= 50 then 'Average'
    else 'Needs Improvement'
  end as status
from public.interns i
where i.is_deleted = false;

comment on view public.leaderboard is 'Public-facing ranked leaderboard. Rank computed on read, not stored.';
