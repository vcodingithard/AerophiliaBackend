import type {Request , Response , NextFunction} from "express";
import { auth } from "../firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

declare module "express-serve-static-core"{
    interface Request {
        user?: DecodedIdToken;
    }
}

export const userLogin = async(req: Request , res: Response , next : NextFunction) =>{
    const headers = req.headers.authorization;
    const token = headers?.startsWith("Bearer ") ? headers.split(" ")[1] : null;

    if(!token)
        return res.status(401).json({error : "Unauthorized to perform this task !"});

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error : unknown) {
        console.log("Firebase Token verification failed : ", error);
        return res.status(403).json({error: "Invalid or Expired Token ! Login in again .."})
    }
}


