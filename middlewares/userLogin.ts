import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts"; // your firebase admin setup
import type { DecodedIdToken } from "firebase-admin/auth";
import ExpressError from "../utils/expressError.ts";

// Extend Express Request to include `user`
declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
    user_id?: string;
  }
}

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw new ExpressError(401, "No token provided. Please log in.");
    }

    const token = header.split(" ")[1];
    if (!token) {
      throw new ExpressError(401, "Token missing or invalid. Cannot login.");
    }

    // Verify Firebase token
    const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    req.user_id = decodedToken.uid;

    // Optional: Check if user exists in Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      throw new ExpressError(404, "User profile not found. Please register.");
    }

    next();
  } catch (err: unknown) {
    console.error("Firebase Token verification failed:", err);

    if (err instanceof ExpressError) {
      return res.status(err.status).json({ error: err.message });
    }

    return res
      .status(401)
      .json({ error: "Invalid or expired token! Please log in again." });
  }
};
