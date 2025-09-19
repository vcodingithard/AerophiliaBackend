// src/middleware/userLogin.ts
import type { Request, Response, NextFunction } from "express";
import { auth, db } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

// Extend Express Request type to include `user`
declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
  }
}

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  console.log(" [Auth Middleware] Starting authentication check...");

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  console.log(`- Authorization header: ${authHeader ? "Present" : "Missing"}`);
  console.log(`- Token extracted: ${token ? token.substring(0, 20) + "..." : "None"}`);

  if (!token) {
    console.log("No token provided. Access denied.");
    return res.status(401).json({
      success: false,
      message: "Not authenticated. Please login.",
    });
  }

  try {
    console.log("🔍 Verifying Firebase ID token...");
    const decodedToken = await auth.verifyIdToken(token);

    console.log(` Token verified successfully for UID: ${decodedToken.uid}`);
    req.user = decodedToken;

    // Verify user exists in Firestore
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    console.log("👤 Firestore user check:", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      exists: userDoc.exists,
      storedEmail: userDoc.exists ? userDoc.data()?.email : "N/A",
    });

    if (!userDoc.exists) {
      console.log("User profile not found in Firestore");
      return res.status(404).json({
        success: false,
        message: "User profile not found. Please register.",
      });
    }

    console.log(" Authentication and user check passed");
    next();
  } catch (error: any) {
    console.error(" Authentication error:", error?.message || error);
    return res.status(401).json({
      success: false,
      message: "Not authenticated. Please login.",
      error: error?.message || "Unknown error",
    });
  }
};
