/**
 * Seeds Firestore with sample intern data for local dev/testing.
 * Replaces the old supabase/seed.sql — Firestore has no SQL to run a seed
 * file against, so this is a small Node script using firebase-admin instead.
 *
 * Usage: npm run seed
 * Requires .env.local to have the FIREBASE_* admin credentials set (see
 * docs/SETUP.md). Safe to re-run — uses each intern's email as a
 * deterministic doc ID check to avoid duplicates.
 *
 * Do NOT run this against a production project.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

const db = getFirestore();

const sampleInterns = [
  { fullName: "John Doe", email: "john.doe@example.com", department: "Engineering", score: 95 },
  { fullName: "Amara Okafor", email: "amara.okafor@example.com", department: "Design", score: 88 },
  { fullName: "Chidi Eze", email: "chidi.eze@example.com", department: "Engineering", score: 82 },
  { fullName: "Blessing Adeyemi", email: "blessing.adeyemi@example.com", department: "Marketing", score: 76 },
  { fullName: "Tunde Bakare", email: "tunde.bakare@example.com", department: "Engineering", score: 71 },
  { fullName: "Ngozi Umeh", email: "ngozi.umeh@example.com", department: "Product", score: 65 },
  { fullName: "Fatima Bello", email: "fatima.bello@example.com", department: "Design", score: 58 },
  { fullName: "Segun Adebayo", email: "segun.adebayo@example.com", department: "Marketing", score: 47 },
  { fullName: "Ifeoma Nwosu", email: "ifeoma.nwosu@example.com", department: "Product", score: 39 },
  { fullName: "Emeka Chukwu", email: "emeka.chukwu@example.com", department: "Engineering", score: 91 },
];

async function seed() {
  const internsRef = db.collection("interns");
  let created = 0;
  let skipped = 0;

  for (const intern of sampleInterns) {
    const existing = await internsRef.where("email", "==", intern.email).limit(1).get();
    if (!existing.empty) {
      skipped++;
      continue;
    }

    await internsRef.add({
      ...intern,
      fullNameLower: intern.fullName.toLowerCase(),
      isDeleted: false,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created++;
  }

  console.log(`Seed complete: ${created} interns created, ${skipped} skipped (already existed).`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
