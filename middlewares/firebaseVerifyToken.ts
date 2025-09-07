// src/middleware/userLogin.ts
import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";
import ExpressError from "../utils/expressError.ts";

// Extend Express Request type to include `user`
declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
  }
}

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next(new ExpressError(401, "No token provided. Please log in."));
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    // Check if user exists in Firestore
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Auto-create user document in Firestore
      await userRef.set({
        id: decodedToken.uid,
        email: decodedToken.email || "",
        fullName: "", // optional, will update in completeProfile
        role: "user",
        team_id: "",
        events_registered: [],
        paid: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Firestore user created for UID: ${decodedToken.uid}`);
    }

    next();
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    return next(new ExpressError(401, "Invalid or expired token."));
  }
};
