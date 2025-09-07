// routes/registrationRoutes.ts
import { Router } from "express";
import {
  registerIndividualEvent,
  createTeamAndRegister,
  respondToTeamRequest,
  addEvent
} from "../controllers/events.ts";
import {
  getCompletedRegistrations,
  getIncompleteRegistrations,
} from "../controllers/user.ts";
import { userLogin } from "../middlewares/userLogin.ts";
import { getAllEvents } from "../controllers/Allevent/getAllEvents.ts";
import { getEventById } from "../controllers/Allevent/getEventId.ts";
import { getEventByType } from "../controllers/events.ts";
const router = Router();
router.get("/events",getEventByType);
router.get("/", getAllEvents);
router.get("/:id", getEventById);

// Individual event registration
router.post("/individual/:eventId", userLogin, registerIndividualEvent);

// Team creation & invitations
router.post("/team/:eventId", userLogin, createTeamAndRegister);

// Respond to team request
router.post(
  "/team/request/:requestId/respond",
  userLogin,
  respondToTeamRequest
);

// Post /create-events
router.post("/create-events",addEvent);

// GET /registrations/completed - Fetch completed registrations from user's registrations field
router.get("/registrations/completed", userLogin, getCompletedRegistrations);

// GET /registrations/incomplete - Fetch incomplete registrations from user's registrations field
router.get("/registrations/incomplete", userLogin, getIncompleteRegistrations);



export default router;
