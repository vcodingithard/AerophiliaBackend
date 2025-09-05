import admin from "firebase-admin";
import { initializeApp, cert } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccountJson from "./aerophilia-dev-firebase-adminsdk-fbsvc-1d68ec927a.json" with { type: "json" };


const serviceAccount = serviceAccountJson as ServiceAccount;

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL || "", 
});

export const auth = getAuth();

export const db = getFirestore();