import { Router, type Request, type Response } from "express";
import { db } from "../firebase.ts";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

// GET /users/me
router.get("/me", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    return res.json({ id: userDoc.id, ...userDoc.data() }); 
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /users/me
router.patch("/me", userLogin, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, phone, addRegistration } = req.body;

    if (req.body.userId || req.body.email || req.body.createdAt) {
      return res.status(400).json({ error: "Cannot modify protected fields" });
    }

    const userRef = db.collection("users").doc(uid);
    const updates: Record<string, unknown> = {};

    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    if (addRegistration) {
      updates.registrations = FieldValue.arrayUnion(addRegistration);
    }

    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
