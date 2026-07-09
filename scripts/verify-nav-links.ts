import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) });

async function main() {
  const auth = getAuth();
  const uid = (await auth.listUsers(1)).users[0]!.uid;
  const customToken = await auth.createCustomToken(uid);
  const exchange = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }).then((r) => r.json());
  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: exchange.idToken }),
  });
  const cookie = (sessionRes.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

  for (const path of ["/scores", "/dashboard", "/interns"]) {
    const res = await fetch(`http://localhost:3000${path}`, { headers: { Cookie: cookie } });
    const body = await res.text();
    console.log(`\n${path}:`);
    console.log("  href=/scores present:", body.includes('href="/scores"'));
    console.log("  href=/interns present:", body.includes('href="/interns"'));
    console.log("  href=/reports present:", body.includes('href="/reports"'));
    console.log("  href=/dashboard present:", body.includes('href="/dashboard"'));
  }
}
main().then(() => process.exit(0));
