# Setup Instructions

## 1. Create the Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Once provisioned, go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (server-only — never expose this to the client)

## 2. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in the three values from step 1.

## 3. Install dependencies
```bash
npm install
```

## 4. Run the database migrations
Using the Supabase CLI (recommended):
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```
This applies, in order:
- `supabase/migrations/0001_init_schema.sql` — tables, indexes, triggers, the `leaderboard` view
- `supabase/migrations/0002_rls_policies.sql` — Row Level Security policies

Alternatively, paste both files' contents into the Supabase dashboard's **SQL Editor** and run them in order if you don't want to use the CLI.

## 5. Seed sample data (optional, local/dev only)
Run `supabase/seed.sql` in the SQL Editor. Do **not** run this against a production project.

## 6. Creating the first admin
The `admins` table references `auth.users`, so a Supabase Auth user must exist first:

1. In the Supabase dashboard, go to **Authentication > Users > Add User** and create your admin's email/password (or have them sign up through the app once a sign-up flow exists).
2. Copy the new user's UUID.
3. In the SQL Editor, run:
   ```sql
   insert into public.admins (id, email, full_name)
   values ('paste-uuid-here', 'admin@example.com', 'Your Name');
   ```
4. That account can now log in at `/login` and will pass the `is admin` checks in RLS policies.

There's currently no self-service "become an admin" flow by design — admin accounts should be provisioned manually or through a future invite-only flow, not open sign-up.

## 7. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:3000` for the public leaderboard, `http://localhost:3000/login` for admin login.

## 8. Generate exact TypeScript types (once live)
```bash
npm run supabase:types
```
This overwrites `src/types/database.ts` with types generated directly from your live schema — do this after any migration change.

## 9. Deploying
Push to GitHub, import the repo in Vercel, and set the same three env vars from step 2 in the Vercel project settings. Vercel auto-detects Next.js — no custom build config needed.
