# Setup Instructions (Firebase — Spark/free plan)

> Supersedes the old Supabase setup doc (`archive/supabase-implementation/`)
> and the earlier Blaze-plan version of this doc (see
> `backups/20260708_041644/docs/SETUP.md` if you need it). This version runs
> entirely on Firebase's free Spark plan — no billing account required.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and create a new project.
2. Enable **Google Analytics** or not — your call, not required for this app.
3. **Do not upgrade to Blaze.** Everything in this project (Auth, Firestore including transactions, Storage) works on the free Spark plan.

## 2. Enable the products you need
In the Firebase Console, for your new project:
- **Authentication** → Sign-in method → enable **Email/Password**.
- **Firestore Database** → Create database → start in **production mode** (we ship our own `firestore.rules`, don't use test mode).
- **Storage** → Get started (used later for PDF report exports; free tier covers this app's scale).

## 3. Get your client config
Firebase Console → Project Settings → General → "Your apps" → add a Web app → copy the config values into `.env.local` (see step 5).

## 4. Get your Admin SDK credentials
Firebase Console → Project Settings → Service Accounts → **Generate new private key**. This downloads a JSON file containing `project_id`, `client_email`, and `private_key`. **Treat this file as a secret — never commit it.** This is used by Server Actions/Route Handlers (`lib/firebase/admin.ts`), not by any Cloud Function — there are none in this project.

## 5. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in:
- The `NEXT_PUBLIC_FIREBASE_*` values from step 3
- The `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` values from the service account JSON in step 4 (keep the `\n` sequences literal in `FIREBASE_PRIVATE_KEY` — the code converts them at runtime)

## 6. Install dependencies
```bash
npm install
```
That's it — there's no separate `functions/` subproject to install anymore.

## 7. Install the Firebase CLI (if you don't have it)
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project, give it an alias like "default"
```

## 8. Deploy Firestore rules and indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
No `--only functions` — there's nothing to deploy there. This applies `firestore.rules` and `firestore.indexes.json`. Both are free on Spark.

## 9. Seed sample data (optional, local/dev only)
```bash
npm run seed
```
Runs `scripts/seed.ts` against your Firestore project using the Admin SDK. Safe to re-run — skips interns that already exist by email. **Do not run against a production project.**

## 10. Creating the first admin
Admin accounts are provisioned manually — no self-service sign-up:
1. Firebase Console → Authentication → Users → **Add user** (email + password).
2. Copy the new user's UID.
3. Firebase Console → Firestore Database → start a collection called `admins` (if it doesn't exist) → add a document with **Document ID = the UID you copied** → fields:
   - `email` (string): the admin's email
   - `fullName` (string): their name
   - `createdAt` (timestamp): now
4. That account can now sign in at `/login` — the session route checks for exactly this `admins/{uid}` doc before minting a session cookie.

## 11. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:3000` for the public leaderboard, `http://localhost:3000/login` for admin login.

**Optional — local emulators:** `npm run emulators` runs Auth/Firestore/Storage emulators locally (see `firebase.json`) if you want to develop without touching the real project. No Functions emulator — there's nothing to emulate there.

## 12. Deploying
- **App:** push to GitHub, import in Vercel. Set all `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` env vars in Vercel project settings (paste the private key exactly as in `.env.local`, Vercel handles the `\n` correctly when set via their dashboard).
- **Firebase side:** re-run step 8 (`firebase deploy --only firestore:rules,firestore:indexes`) any time rules or indexes change. That's the entire Firebase-side deploy surface now — no Functions to build or deploy, no Blaze plan billing to think about.

## Where score history logging happens now
There's no Cloud Function watching for score changes. Score updates and their audit-log entries are written together, atomically, inside a Firestore transaction in `src/lib/actions/scores.ts` — triggered directly by whichever Server Action/Route Handler the admin dashboard calls. See `docs/SPARK_PLAN_REFACTOR.md` for the full reasoning.
