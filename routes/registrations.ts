import { Router, type Request, type Response } from "express";
import { db } from "../firebase.ts";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";

const registrationRouter = Router();

// GET /registrations/incomplete
registrationRouter.get("/incomplete", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const incompleteRegs: any[] = [];

    const indivSnapshot = await db
      .collection("registrations")
      .where("registrant", "==", uid)
      .where("status", "==", false)
      .get();

    indivSnapshot.forEach((doc) => {
      incompleteRegs.push({ id: doc.id, ...doc.data() });
    });

    const teamSnapshot = await db
      .collection("registrations")
      .where("teamId", "!=", null)
      .where("status", "==", false)
      .get();

    for (const doc of teamSnapshot.docs) {
      const regData = doc.data();
      const teamDoc = await db.collection("teams").doc(regData.teamId).get();
      if (!teamDoc.exists) continue;

      const teamData = teamDoc.data();
      if (!teamData) continue;
      if (
        teamData.leader === uid ||
        (teamData.members && teamData.members.includes(uid))
      ) {
        incompleteRegs.push({
          id: doc.id,
          ...regData,
          team: { id: teamDoc.id, ...teamData },
        });
      }
    }

    return res.json({ incompleteRegistrations: incompleteRegs });
  } catch (error) {
    console.error("Error fetching incomplete registrations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /registrations/completed
registrationRouter.get("/completed", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const completedRegs: any[] = [];

    const indivSnapshot = await db
      .collection("registrations")
      .where("registrant", "==", uid)
      .where("status", "==", true)
      .get();

    indivSnapshot.forEach((doc) => {
      completedRegs.push({ id: doc.id, ...doc.data() });
    });

    const teamSnapshot = await db
      .collection("registrations")
      .where("teamId", "!=", null)
      .where("status", "==", true)
      .get();

    for (const doc of teamSnapshot.docs) {
      const regData = doc.data();
      const teamDoc = await db.collection("teams").doc(regData.teamId).get();
      if (!teamDoc.exists) continue;

      const teamData = teamDoc.data();
      if (!teamData) continue;
      if (
        teamData.leader === uid ||
        (teamData.members && teamData.members.includes(uid))
      ) {
        completedRegs.push({
          id: doc.id,
          ...regData,
          team: { id: teamDoc.id, ...teamData },
        });
      }
    }

    return res.json({ completedRegistrations: completedRegs });
  } catch (error) {
    console.error("Error fetching completed registrations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default registrationRouter;
