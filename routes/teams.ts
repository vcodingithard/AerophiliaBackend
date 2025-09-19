import { Router } from "express";
import { getTeamById } from "../controllers/teams/getTeam.ts";
import { updateTeam } from "../controllers/teams/patchTeam.ts";
import { leaveTeam } from "../controllers/events.ts";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";

const router = Router();

router.get("/:id", userLogin, getTeamById);
router.patch("/:id", userLogin, updateTeam);
router.delete("/:teamId/leave", userLogin, leaveTeam);

export default router;
