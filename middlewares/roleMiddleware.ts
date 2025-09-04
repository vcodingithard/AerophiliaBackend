// User Role or Admin Role Check
import type { Request, Response, NextFunction } from "express";
import * as admin from 'firebase-admin';
import ExpressError from "../utils/expressError.ts";

export const checkRole = (allowedRoles: String[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Unauthorized: No token provided" });
            }

            const idToken = authHeader.split("Bearer ")[1] ?? "";

            if (!idToken) {
                return res.status(401).json({ message: "Unauthorized: No token found" });
            }
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            const userRole = decodedToken.role;

            if (!userRole) {
                return res.status(403).json({ message: "Forbidden: No role assigned" });
            }

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ message: "Forbidden: Insufficient role" });
            }

            (req as any).user = decodedToken;
            next();
        } catch (error) {
            console.log("Error verifying role !: ", error);
            throw new ExpressError(401, "Unauthorized !");
        }
    }
}

