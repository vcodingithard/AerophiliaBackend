
import type { Request, Response } from "express";
import { db } from "../../firebase.ts";
import type { Team } from "../../types/teamSchema.ts";

export const getTeamById = async (req: Request, res: Response) => {
  try {
      if (!req.params.id) {
        return res.status(400).json({ error: "Team ID is required" });
      }
      const teamRef = db.collection("teams").doc(req.params.id);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const teamData = teamDoc.data() as Team;
    const userId = req.user?.uid;

    // Authorization: only leader or members can see
    if (!userId || (teamData?.leader !== userId && !teamData?.members.includes(userId))) {
      return res.status(403).json({ error: "Unauthorized to view this team" });
    }

    return res.json(teamData);
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err });
  }
};
