import { Router, type Request, type Response } from "express";
import { db } from "../firebase.ts";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";
import { FieldValue } from "firebase-admin/firestore";

const requestRouter = Router();

// GET /requests → return both received and sent requests
requestRouter.get("/", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) return res.status(401).json({ error: "Unauthorized" });

    const [receivedSnap, sentSnap] = await Promise.all([
      db.collection("requests").where("receiver_email", "==", email).get(),
      db.collection("requests").where("sender_id", "==", uid).get(),
    ]);

    const received: any[] = [];
    receivedSnap.forEach((doc) => {
      received.push({ id: doc.id, ...doc.data() });
    });

    const sent: any[] = [];
    sentSnap.forEach((doc) => {
      sent.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ received, sent });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /requests/received - Fetch all requests where 'to' matches logged-in user's email
requestRouter.get("/received", userLogin, async (req: Request, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });

    const receivedSnap = await db.collection("requests").where("receiver_email", "==", email).get();
    const received: any[] = [];
    receivedSnap.forEach((doc) => {
      received.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ received });
  } catch (error) {
    console.error("Error fetching received requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /requests/sent - Fetch all requests sent by a leader (from field)
requestRouter.get("/sent", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const sentSnap = await db.collection("requests").where("sender_id", "==", uid).get();
    const sent: any[] = [];
    sentSnap.forEach((doc) => {
      sent.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ sent });
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /requests/:id/accept → Accept team request
requestRouter.patch("/:id/accept", userLogin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;
    const userEmail = req.user?.email;

    if (!id) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    if (!uid || !userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the request document
    const requestDoc = await db.collection("requests").doc(id).get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const requestData = requestDoc.data();
    
    // Verify that this user is the recipient of the request
    if (requestData?.receiver_email !== userEmail) {
      return res.status(403).json({ error: "You are not authorized to accept this request" });
    }

    // Check if request is already processed
    if (requestData?.status !== "pending") {
      return res.status(400).json({ error: "Request has already been processed" });
    }

    // Get team ID from request
    const teamId = requestData?.teamId;
    if (!teamId) {
      return res.status(400).json({ error: "Invalid request: No team ID found" });
    }

    // Get team document
    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const teamData = teamDoc.data();
    const currentMembers = teamData?.members || [];
    const minSize = teamData?.minSize || 2;
    const maxSize = teamData?.maxSize || 5;

    // Check if team is already full
    if (currentMembers.length >= maxSize) {
      return res.status(400).json({ error: "Team is already full" });
    }

    // Check if user is already a member
    if (currentMembers.includes(uid)) {
      return res.status(400).json({ error: "You are already a member of this team" });
    }

    // Use a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      // Update request status to accepted
      transaction.update(requestDoc.ref, {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
      });

      // Add user to team members
      transaction.update(teamDoc.ref, {
        members: FieldValue.arrayUnion(uid),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Get the registration document for this team
      const registrationQuery = await db.collection("registrations")
        .where("teamId", "==", teamId)
        .limit(1)
        .get();

      if (!registrationQuery.empty) {
        const registrationDoc = registrationQuery.docs[0];
        if (registrationDoc && registrationDoc.exists) {
          const newMemberCount = currentMembers.length + 1;

          // If minimum criteria is met, update registration status to true
          if (newMemberCount >= minSize) {
            transaction.update(registrationDoc.ref, {
              status: true,
              updatedAt: FieldValue.serverTimestamp(),
              memberCount: newMemberCount
            });
          } else {
            // Just update member count
            transaction.update(registrationDoc.ref, {
              memberCount: newMemberCount,
              updatedAt: FieldValue.serverTimestamp()
            });
          }
        }
      }

      // Add the team to the accepting user's profile (if exists)
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        transaction.update(userDoc.ref, {
          teams: FieldValue.arrayUnion(teamId),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    // Get updated team data to return
    const updatedTeamDoc = await db.collection("teams").doc(teamId).get();
    const updatedTeamData = updatedTeamDoc.data();
    const finalMemberCount = updatedTeamData?.members?.length || 0;

    return res.status(200).json({
      success: true,
      message: "Team request accepted successfully",
      data: {
        requestId: id,
        teamId: teamId,
        newMemberCount: finalMemberCount,
        registrationEnabled: finalMemberCount >= minSize,
        team: updatedTeamData
      }
    });

  } catch (error) {
    console.error("Error accepting team request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /requests/:id/reject → Reject team request
requestRouter.patch("/:id/reject", userLogin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;
    const userEmail = req.user?.email;

    if (!id) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    if (!uid || !userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the request document
    const requestDoc = await db.collection("requests").doc(id).get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const requestData = requestDoc.data();
    
    // Verify that this user is the recipient of the request
    if (requestData?.receiver_email !== userEmail) {
      return res.status(403).json({ error: "You are not authorized to reject this request" });
    }

    // Check if request is already processed
    if (requestData?.status !== "pending") {
      return res.status(400).json({ error: "Request has already been processed" });
    }

    // Update request status to rejected (no team modifications)
    await requestDoc.ref.update({
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      rejectedBy: uid
    });

    return res.status(200).json({
      success: true,
      message: "Team request rejected successfully",
      data: {
        requestId: id,
        status: "rejected"
      }
    });

  } catch (error) {
    console.error("Error rejecting team request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default requestRouter;
