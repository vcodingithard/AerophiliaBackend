import type { Request, Response } from "express";
import { db } from "../../firebase.ts";

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const eventsSnapshot = await db.collection("events").get();
    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events", details: err });
  }
};
