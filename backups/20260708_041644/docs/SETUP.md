# Setup Instructions (Firebase)

> Supersedes the old Supabase setup doc, preserved at
> `archive/supabase-implementation/` if you ever need to reference it.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and create a new project.
2. Enable **Google Analytics** or not — your call, not required for this app.

## 2. Enable the products you need
In the Firebase Console, for your new project:
- **Authentication** → Sign-in method → enable **Email/Password**.
- **Firestore Database** → Create database → start in **production mode** (we ship our own `firestore.rules`, don't use test mode).
- **Storage** → Get started (used later for PDF report exports).

## 3. Upgrade to the Blaze plan
Cloud Functions (used for the score-history audit trigger) require the **Blaze (pay-as-you-go)** plan — the free Spark plan can't run Firestore triggers. At this app's scale, expect close to $0/month, but you do need a billing account attached. See `docs/MIGRATION_NOTES.md` §2 for why this is needed.

## 4. Get your client config
Firebase Console → Project Settings → General → "Your apps" → add a Web app → copy the config values into `.env.local` (see step 6).

## 5. Get your Admin SDK credentials
Firebase Console → Project Settings → Service Accounts → **Generate new private key**. This downloads a JSON file containing `project_id`, `client_email`, and `private_key`. **Treat this file as a secret — never commit it.**

## 6. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in:
- The `NEXT_PUBLIC_FIREBASE_*` values from step 4
- The `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` values from the service account JSON in step 5 (keep the `\n` sequences literal in `FIREBASE_PRIVATE_KEY` — the code converts them at runtime)

## 7. Install dependencies
```bash
npm install
cd functions && npm install && cd ..
```

## 8. Install the Firebase CLI (if you don't have it)
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project, give it an alias like "default"
```

## 9. Deploy Firestore rules, indexes, and the Cloud Function
```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```
This applies `firestore.rules`, `firestore.indexes.json`, and deploys the `logScoreChange` function from `functions/src/index.ts`.

## 10. Seed sample data (optional, local/dev only)
```bash
npm run seed
```
Runs `scripts/seed.ts` against your Firestore project using the Admin SDK. Safe to re-run — skips interns that already exist by email. **Do not run against a production project.**

## 11. Creating the first admin
Admin accounts are provisioned manually, same philosophy as before — no self-service sign-up:
1. Firebase Console → Authentication → Users → **Add user** (email + password).
2. Copy the new user's UID.
3. Firebase Console → Firestore Database → start a collection called `admins` (if it doesn't exist) → add a document with **Document ID = the UID you copied** → fields:
   - `email` (string): the admin's email
   - `fullName` (string): their name
   - `createdAt` (timestamp): now
4. That account can now sign in at `/login` — the session route checks for exactly this `admins/{uid}` doc before minting a session cookie.

## 12. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:3000` for the public leaderboard, `http://localhost:3000/login` for admin login.

**Optional — local emulators:** `npm run emulators` runs Auth/Firestore/Functions/Storage emulators locally (see `firebase.json`) if you want to develop without touching the real project.

## 13. Deploying
- **App:** push to GitHub, import in Vercel. Set all `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` env vars in Vercel project settings (paste the private key exactly as in `.env.local`, Vercel handles the `\n` correctly when set via their dashboard).
- **Firebase side:** re-run step 9 (`firebase deploy --only firestore:rules,firestore:indexes,functions`) any time rules, indexes, or the Cloud Function change — Vercel only deploys the Next.js app, not the Firebase project config.
