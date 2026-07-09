/**
 * End-to-end auth verification: mints a custom token for an existing admin,
 * exchanges it for an ID token via the Identity Toolkit REST API (same
 * mechanism the client SDK uses), posts it to /api/auth/session exactly
 * like the real login page does, then uses the resulting cookie to hit
 * /dashboard directly — confirming the full auth pipeline end-to-end
 * without needing the admin's actual password.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

async function main() {
  const db = getAuth();
  const usersResult = await db.listUsers(1);
  if (usersResult.users.length === 0) {
    console.error("NO_ADMIN_USERS_FOUND — cannot test auth flow.");
    process.exit(1);
  }
  const firstUser = usersResult.users[0];
  if (!firstUser) {
    console.error("No admin users found.");
    process.exit(1);
  }

  const uid = firstUser.uid;
  console.log("Testing with admin UID:", uid, firstUser.email);

  // Step 1: mint a custom token (Admin SDK)
  const customToken = await db.createCustomToken(uid);

  // Step 2: exchange for an ID token (same call the client SDK makes internally)
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exchangeData = await exchangeRes.json();
  if (!exchangeRes.ok) {
    console.error("TOKEN_EXCHANGE_FAILED:", exchangeData);
    process.exit(1);
  }
  const idToken = exchangeData.idToken;
  console.log("Got ID token, length:", idToken.length);

  // Step 3: POST to /api/auth/session, exactly like the real login page
  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const setCookie = sessionRes.headers.get("set-cookie");
  console.log("Session route status:", sessionRes.status);
  if (!sessionRes.ok || !setCookie) {
    console.error("SESSION_CREATE_FAILED:", await sessionRes.text());
    process.exit(1);
  }
  const cookie = setCookie.split(";")[0] ?? "";

  // Step 4: use the cookie to hit /dashboard directly
  const dashRes = await fetch("http://localhost:3000/dashboard", {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  console.log("DASHBOARD_STATUS:", dashRes.status);
  const body = await dashRes.text();
  console.log("Contains 'Signed in as':", body.includes("Signed in as"));
  console.log("Contains error overlay:", /Unhandled Runtime Error|Internal Server Error/.test(body));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("SCRIPT_FAILED:", err);
  process.exit(1);
});
