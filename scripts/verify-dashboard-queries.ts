/**
 * Verifies the exact queries used in (admin)/dashboard/page.tsx succeed —
 * lets us confirm the new composite index is live without needing a
 * browser session.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, AggregateField } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

async function main() {
  const db = getFirestore();
  const activeInterns = db.collection("interns").where("isDeleted", "==", false);

  try {
    const [countSnap, avgSnap, highestSnap, lowestSnap] = await Promise.all([
      activeInterns.count().get(),
      activeInterns.aggregate({ avgScore: AggregateField.average("score") }).get(),
      activeInterns.orderBy("score", "desc").limit(1).get(),
      activeInterns.orderBy("score", "asc").limit(1).get(),
    ]);

    console.log("ALL_QUERIES_OK");
    console.log("total:", countSnap.data().count);
    console.log("average:", avgSnap.data().avgScore);
    console.log("highest:", highestSnap.empty ? "none" : highestSnap.docs[0].data().score);
    console.log("lowest:", lowestSnap.empty ? "none" : lowestSnap.docs[0].data().score);
  } catch (err) {
    console.error("QUERY_FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
