import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";
import ExpressError from "../utils/expressError.ts";

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
  const headers = req.headers.authorization;
  const token = headers?.startsWith("Bearer ") ? headers.split(" ")[1] : null;

  if (!token) {
    throw new ExpressError(401, "No token provided. Please log in.");
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    // Check if user exists in Firestore
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // create new user
      throw new ExpressError(404, "User profile not found. Please register.");
    }

    next();
  } catch (error) {
    throw new ExpressError(401, "Invalid or expired token.");
  }
};
