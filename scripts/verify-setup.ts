/**
 * One-off connectivity check: confirms firebase-admin can reach both
 * Firestore and Firebase Auth using the credentials in .env.local, and
 * reports whether any admin accounts are provisioned yet.
 * Usage: npx tsx scripts/verify-setup.ts
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
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
  console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);

  try {
    const db = getFirestore();
    const internsSnap = await db.collection("interns").limit(5).get();
    console.log("FIRESTORE_OK: connected. interns docs found:", internsSnap.size);

    const adminsSnap = await db.collection("admins").limit(5).get();
    console.log("FIRESTORE_OK: admins docs found:", adminsSnap.size);
    if (adminsSnap.empty) {
      console.log("WARNING: no admin docs exist yet — login will fail for everyone until one is created (see docs/SETUP.md step 10).");
    } else {
      adminsSnap.forEach((doc) => console.log("  admin:", doc.id, doc.data().email));
    }
  } catch (err) {
    console.error("FIRESTORE_FAILED:", err instanceof Error ? err.message : err);
  }

  try {
    const auth = getAuth();
    const usersResult = await auth.listUsers(5);
    console.log("AUTH_OK: connected. Auth users found:", usersResult.users.length);
    usersResult.users.forEach((u) => console.log("  user:", u.uid, u.email));
  } catch (err) {
    console.error("AUTH_FAILED:", err instanceof Error ? err.message : err);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("SCRIPT_FAILED:", err);
  process.exit(1);
});
