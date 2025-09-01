import type { Request, Response } from "express";
import { db } from "../../firebase.ts";

export const getEventById = async (req: Request, res: Response) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Event ID is required" });
    }
      const eventId = req.params.id;
      if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
        return res.status(400).json({ error: "Event ID is required" });
      }

      const eventsSnapshot = await db.collection("events").where("eventId", "==", eventId).get();
      if (eventsSnapshot.empty || !eventsSnapshot.docs.length) {
        return res.status(404).json({ error: "Event not found" });
      }

      const eventDoc = eventsSnapshot.docs[0];
      if (!eventDoc || !eventDoc.exists) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json({ id: eventDoc.id, ...eventDoc.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event", details: err });
  }
};
