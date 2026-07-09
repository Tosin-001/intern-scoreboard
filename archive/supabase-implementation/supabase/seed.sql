-- ============================================================================
-- Seed data — local/dev use only. Do NOT run against production.
-- Run after 0001_init_schema.sql and 0002_rls_policies.sql.
--
-- NOTE: admins seeding is intentionally left out of this file. An admin row
-- requires a matching auth.users row, which must be created via Supabase
-- Auth (sign-up or the dashboard) first. See docs/SETUP.md, step
-- "Creating the first admin".
-- ============================================================================

insert into public.interns (full_name, email, department, score) values
  ('John Doe',        'john.doe@example.com',        'Engineering', 95),
  ('Amara Okafor',    'amara.okafor@example.com',    'Design',      88),
  ('Chidi Eze',       'chidi.eze@example.com',       'Engineering', 82),
  ('Blessing Adeyemi','blessing.adeyemi@example.com','Marketing',   76),
  ('Tunde Bakare',    'tunde.bakare@example.com',    'Engineering', 71),
  ('Ngozi Umeh',      'ngozi.umeh@example.com',      'Product',     65),
  ('Fatima Bello',    'fatima.bello@example.com',    'Design',      58),
  ('Segun Adebayo',   'segun.adebayo@example.com',   'Marketing',   47),
  ('Ifeoma Nwosu',    'ifeoma.nwosu@example.com',    'Product',     39),
  ('Emeka Chukwu',    'emeka.chukwu@example.com',    'Engineering', 91)
on conflict (email) do nothing;
