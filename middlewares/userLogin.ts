import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";
import ExpressError from "../utils/expressError.ts";

// Extend Express Request to include `user` and `user_id`
declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
    user_id?: string;
  }
}

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("AuthHeader : ", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ExpressError(401, "No token provided. Please log in.");
    }

    const token = authHeader.split(" ")[1];
    console.log(token)
    if (!token) {
      throw new ExpressError(401, "Token missing or invalid. Cannot log in.");
    }

    console.log("🔍 Verifying Firebase token...");
    const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
    console.log(`Token verified for UID: ${decodedToken.uid}`);

    req.user = decodedToken;
    console.log("User id is ",req.user?.uid)
    req.user_id = decodedToken.uid;

    // Optional: Check if user exists in Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      throw new ExpressError(404, "User profile not found. Please register.");
    }

    console.log("👤 User exists in Firestore. Authentication successful.");
    next();
  } catch (err: unknown) {
    console.error(" Firebase token verification failed:", err);

    if (err instanceof ExpressError) {
      return res.status(err.status).json({ error: err.message });
    }

    return res
      .status(401)
      .json({ error: "Invalid or expired token! Please log in again." });
  }
};
