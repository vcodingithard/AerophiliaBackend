import type { Request, Response, NextFunction } from "express";
import { auth } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

// Extend Express Request to include `user` and `user_id`
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
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized to perform this task!" });
  }

  const token = header.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ error: "Token missing or invalid. Cannot login." });

  try {
    const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    req.user_id = decodedToken.uid; // attach uid
    next();
  } catch (error: unknown) {
    console.error("Firebase Token verification failed:", error);
    return res
      .status(403)
      .json({ error: "Invalid or expired token! Please login again." });
  }
};
