
import type { Request, Response } from "express";
import { db } from "../../firebase.ts";
import type { Team } from "../../types/teamSchema.ts";

export const updateTeam = async (req: Request, res: Response) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Team ID is required" });
    }
    const teamRef = db.collection("teams").doc(req.params.id);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const teamData = teamDoc.data();
    const userId = req.user?.uid;

    if (teamData?.leader !== userId) {
      return res.status(403).json({ error: "Only leader can update team" });
    }

  // Validate and sanitize input using Team interface
  const updateData: Partial<Team> = {};
  const { teamName, members, requests, eventId } = req.body;
  if (typeof teamName === "string" && teamName.trim() !== "") updateData.teamName = teamName.trim();
  if (typeof eventId === "string" && eventId.trim() !== "") updateData.eventId = eventId.trim();
  if (Array.isArray(members)) updateData.members = members.filter((id: any) => typeof id === "string" && id.trim() !== "");
  if (Array.isArray(requests)) updateData.requests = requests.filter((id: any) => typeof id === "string" && id.trim() !== "");
  updateData.updatedAt = new Date();

  await teamRef.update(updateData);

  return res.json({ message: "Team updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Update failed", details: err });
  }
};
