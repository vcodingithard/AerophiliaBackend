import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts"; 
import type { DecodedIdToken } from "firebase-admin/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
  }
}

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  const headers = req.headers.authorization;
  const token = headers?.startsWith("Bearer ") ? headers.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    // Check if user exists in Firestore
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // create new user
      await userRef.set({
        userId: decodedToken.uid,
        email: decodedToken.email || "",
        name: decodedToken.name || "",
        registrations: [],
        createdAt: new Date(),
      });
      console.log(`✅ New user ${decodedToken.uid} created in Firestore`);
    }

    next();
  } catch (error: unknown) {
    console.error("❌ Firebase Token verification failed:", error);
    return res.status(403).json({ error: "Invalid or expired token. Please log in again." });
  }
};
