// routes/registrationRoutes.ts
import { Router } from "express";
import { registerIndividualEvent, createTeamAndRegister, respondToTeamRequest } from "../controllers/events.ts";
import { userLogin } from "../middlewares/userLogin.ts";

const router = Router();

// Individual event registration
router.post("/individual/:eventId", userLogin, registerIndividualEvent);

// Team creation & invitations
router.post("/team/:eventId", userLogin, createTeamAndRegister);

// Respond to team request
router.post("/team/request/:requestId/respond", userLogin, respondToTeamRequest);

export default router;
