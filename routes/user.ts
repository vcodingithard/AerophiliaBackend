// routes/registrationRoutes.ts
import { Router } from "express";
import {
  registerIndividualEvent,
  createTeamAndSendRequests,
  respondToTeamRequest,
  registerTeam,
} from "../controllers/user.ts";
import { userLogin } from "../middlewares/userLogin.ts";

const router = Router();

// 1️⃣ Individual Event Registration
router.post("/individual/:eventId", userLogin, registerIndividualEvent);

// 2️⃣ Team Creation & Sending Requests
router.post("/team/create/:eventId", userLogin, createTeamAndSendRequests);

// 3️⃣ Respond to Team Invitation (Accept / Decline)
router.patch("/team/request/:requestId/respond", userLogin, respondToTeamRequest);

// 4️⃣ Team Registration
router.post("/team/:teamId/register", userLogin, registerTeam);

export default router;
