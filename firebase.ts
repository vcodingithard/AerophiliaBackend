import { initializeApp, cert } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import serviceAccountJson from "./aerophilia-backend-firebase.json" with { type: "json" };

const serviceAccount = serviceAccountJson as ServiceAccount;

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL || "",
});

export const auth = getAuth();
export const db = getFirestore();
export const firestore = { FieldValue };
