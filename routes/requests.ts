import { Router, type Request, type Response } from "express";
import { db } from "../firebase.ts";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";

const requestRouter = Router();

// GET /requests → return both received and sent requests
requestRouter.get("/", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) return res.status(401).json({ error: "Unauthorized" });

    const [receivedSnap, sentSnap] = await Promise.all([
      db.collection("requests").where("to", "==", email).get(),
      db.collection("requests").where("from", "==", uid).get(),
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

export default requestRouter;
