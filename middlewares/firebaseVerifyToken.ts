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

  console.log('🔐 Authentication Debug:');
  console.log('- Headers:', req.headers.authorization ? 'Bearer token present' : 'No authorization header');
  console.log('- Token length:', token ? token.length : 0);
  console.log('- Token prefix:', token ? token.substring(0, 20) + '...' : 'N/A');

  if (!token) {
    console.log('❌ No token provided');
    throw new ExpressError(401, "No token provided. Please log in.");
  }

  try {
    console.log('🔍 Verifying token...');
    const decodedToken = await auth.verifyIdToken(token);
    console.log('✅ Token verified successfully for user:', decodedToken.uid);
    console.log('- Email:', decodedToken.email);
    req.user = decodedToken;

    // Check if user exists in Firestore
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    console.log('👤 User check:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      userExists: userDoc.exists,
      userData: userDoc.exists ? userDoc.data()?.email : 'N/A'
    });

    if (!userDoc.exists) {
      console.log('❌ User not found in Firestore');
      // create new user
      throw new ExpressError(404, "User profile not found. Please register.");
    }

    console.log('✅ Authentication successful');
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    throw new ExpressError(401, "Invalid or expired token.");
  }
};
