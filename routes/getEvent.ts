
import { Router } from "express";
import { getAllEvents } from "../controllers/Allevent/getAllEvents.ts";
import { getEventById } from "../controllers/Allevent/getEventId.ts";

const router = Router();

router.get("/events", getAllEvents);
router.get("/events/:id", getEventById);

export default router;
