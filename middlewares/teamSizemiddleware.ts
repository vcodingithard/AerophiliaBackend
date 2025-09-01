// Min and max size will be in the team document
import type { Request, Response, NextFunction } from "express";
import * as admin from 'firebase-admin';
import ExpressError from "../utils/expressError.ts";

const db = admin.firestore();

export const checkTeamSize = (action: 'add' | 'remove') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { teamId } = req.params;

            if (!teamId) {
                return res.status(400).json({ message: "Team ID is required" });
            }

            const teamdoc = await db.collection('teams').doc(teamId).get();

            if (!teamdoc.exists) {
                return res.status(404).json({ message: "Team not found" });
            }

            const teamData = teamdoc.data();
            if (!teamData) {
                return res.status(404).json({ message: "Invalid team data" });
            }

            const members : String[] = teamData.members || [];
            const minSize : number = teamData.minSize ?? 1;
            const maxSize : number = teamData.maxSize ?? 5;

            if(action === 'add' && members.length >= maxSize){
                return res.status(403).json({message : `Team is full only ${maxSize} members are allowed !`});
            }

            if(action === 'remove' && members.length <= minSize){
                return res.status(403).json({message : `Team must have a minimum of ${minSize} members !`});
            }

            (req as any).team = teamData;
            next();

        } catch (error) {
            console.error("Error checking team size:", error);
            throw new ExpressError(500, "Internal Server Error");
        }
    }
}