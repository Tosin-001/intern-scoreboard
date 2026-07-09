-- ============================================================================
-- Migration 0002: Row Level Security
-- ============================================================================

alter table public.admins enable row level security;
alter table public.interns enable row level security;
alter table public.score_history enable row level security;

-- ----------------------------------------------------------------------------
-- ADMINS
-- ----------------------------------------------------------------------------
create policy "Admins can view own record"
  on public.admins for select
  to authenticated
  using (auth.uid() = id);

-- No insert/update/delete policy on admins for regular authenticated users —
-- admin accounts are provisioned manually (see docs/SETUP.md). This prevents
-- a compromised admin session from being able to grant itself/others access.

-- ----------------------------------------------------------------------------
-- INTERNS
-- ----------------------------------------------------------------------------

-- Public (anon) and logged-in users can read active interns only.
create policy "Anyone can view active interns"
  on public.interns for select
  using (is_deleted = false);

-- Admins can read soft-deleted rows too (for potential restore / audit).
create policy "Admins can view all interns including deleted"
  on public.interns for select
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can insert interns"
  on public.interns for insert
  to authenticated
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can update interns"
  on public.interns for update
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Delete policy exists for completeness, but the app should always perform
-- soft deletes (is_deleted = true) via UPDATE, never a real DELETE. Per
-- project rules, hard deletes should not be exposed in the UI.
create policy "Admins can hard-delete interns (not used by app UI)"
  on public.interns for delete
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- ----------------------------------------------------------------------------
-- SCORE_HISTORY
-- Read-only for admins from the app's perspective. Writes happen exclusively
-- through the log_score_change() trigger (security definer), so there is no
-- insert policy for authenticated users here by design.
-- ----------------------------------------------------------------------------
create policy "Admins can view score history"
  on public.score_history for select
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- ----------------------------------------------------------------------------
-- Grants
-- RLS policies above are the real gatekeeper; these grants just ensure the
-- anon/authenticated roles have table-level access to be evaluated against.
-- ----------------------------------------------------------------------------
grant select on public.interns to anon, authenticated;
grant insert, update, delete on public.interns to authenticated;
grant select on public.score_history to authenticated;
grant select on public.admins to authenticated;
grant select on public.leaderboard to anon, authenticated;
