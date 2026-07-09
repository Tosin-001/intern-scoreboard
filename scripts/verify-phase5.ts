/**
 * End-to-end Phase 5 verification: real session cookie, then exercises
 * /scores, /api/scores/history, a single score adjustment, and a bulk
 * update — checking that scoreHistory actually gets written each time.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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

async function getSessionCookie(): Promise<string> {
  const auth = getAuth();
  const users = await auth.listUsers(1);
  const uid = users.users[0]?.uid;
  if (!uid) throw new Error("No admin users found.");

  const customToken = await auth.createCustomToken(uid);
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exchangeData = await exchangeRes.json();
  if (!exchangeRes.ok) throw new Error(`Token exchange failed: ${JSON.stringify(exchangeData)}`);

  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: exchangeData.idToken }),
  });
  const setCookie = sessionRes.headers.get("set-cookie");
  if (!sessionRes.ok || !setCookie) throw new Error("Session creation failed.");
  return setCookie.split(";")[0] ?? "";
}

async function main() {
  const cookie = await getSessionCookie();
  console.log("Got session cookie, length:", cookie.length);

  // 1. /scores page loads
  const scoresPageRes = await fetch("http://localhost:3000/scores", {
    headers: { Cookie: cookie },
  });
  const scoresPageBody = await scoresPageRes.text();
  console.log("SCORES_PAGE_STATUS:", scoresPageRes.status);
  console.log("Contains 'Score Management':", scoresPageBody.includes("Score Management"));
  console.log(
    "Contains error overlay:",
    /Unhandled Runtime Error|Internal Server Error/.test(scoresPageBody)
  );

  // 2. GET /api/interns to find a real intern to test against
  const internsRes = await fetch("http://localhost:3000/api/interns", {
    headers: { Cookie: cookie },
  });
  const internsBody = await internsRes.json();
  console.log("INTERNS_API_STATUS:", internsRes.status, "count:", internsBody.interns?.length);

  const testIntern = internsBody.interns?.find((i: { isDeleted: boolean }) => !i.isDeleted);
  if (!testIntern) {
    console.error("NO_ACTIVE_INTERN_TO_TEST — seed data first (npm run seed).");
    process.exit(1);
  }
  console.log("Testing against intern:", testIntern.fullName, "current score:", testIntern.score);

  // 3. Single score adjustment via PATCH /api/interns/[id] (what the
  // Quick Adjust buttons on /scores actually call)
  const originalScore: number = testIntern.score;
  const newScore = originalScore <= 50 ? originalScore + 3 : originalScore - 3;

  const db = getFirestore();
  const historyBefore = await db
    .collection("scoreHistory")
    .where("internId", "==", testIntern.id)
    .get();

  const patchRes = await fetch(`http://localhost:3000/api/interns/${testIntern.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ score: newScore }),
  });
  console.log("SINGLE_ADJUST_STATUS:", patchRes.status);

  // Confirm the intern doc actually updated
  const updatedDoc = await db.collection("interns").doc(testIntern.id).get();
  console.log(
    "Score actually changed in Firestore:",
    updatedDoc.data()?.score === newScore,
    `(${originalScore} -> ${updatedDoc.data()?.score}, expected ${newScore})`
  );

  // Confirm a scoreHistory row was written
  const historyAfter = await db
    .collection("scoreHistory")
    .where("internId", "==", testIntern.id)
    .get();
  console.log(
    "scoreHistory row written:",
    historyAfter.size === historyBefore.size + 1,
    `(before: ${historyBefore.size}, after: ${historyAfter.size})`
  );

  const latestHistoryEntry = historyAfter.docs
    .map((d) => d.data())
    .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))[0];
  console.log(
    "Latest history entry has internName:",
    latestHistoryEntry?.internName === testIntern.fullName,
    `("${latestHistoryEntry?.internName}")`
  );
  console.log(
    "Latest history entry has updatedBy (admin UID):",
    !!latestHistoryEntry?.updatedBy
  );

  // 4. GET /api/scores/history — confirm it surfaces the change we just made
  const historyApiRes = await fetch("http://localhost:3000/api/scores/history?limit=5", {
    headers: { Cookie: cookie },
  });
  const historyApiBody = await historyApiRes.json();
  console.log("HISTORY_API_STATUS:", historyApiRes.status, "entries:", historyApiBody.history?.length);
  console.log(
    "Most recent entry matches our test change:",
    historyApiBody.history?.[0]?.internId === testIntern.id
  );

  // 5. Bulk update — revert our test intern back to its original score via
  // the bulk endpoint (also exercises bulk with just 1 item, cheaply)
  const bulkRes = await fetch("http://localhost:3000/api/scores/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      updates: [{ internId: testIntern.id, newScore: originalScore }],
    }),
  });
  const bulkBody = await bulkRes.json();
  console.log(
    "BULK_UPDATE_STATUS:",
    bulkRes.status,
    "succeeded:",
    bulkBody.succeeded,
    "failed:",
    bulkBody.failed
  );

  const revertedDoc = await db.collection("interns").doc(testIntern.id).get();
  console.log(
    "Score reverted back to original via bulk endpoint:",
    revertedDoc.data()?.score === originalScore
  );

  console.log("\nPHASE_5_VERIFICATION_COMPLETE");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("SCRIPT_FAILED:", err);
  process.exit(1);
});
