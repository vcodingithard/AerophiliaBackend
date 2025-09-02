import { Router } from "express";
import { getTeamById } from "../controllers/teams/getTeam.ts";
import { updateTeam } from "../controllers/teams/patchTeam.ts";
import { requireAuth } from "../middlewares/teamAuth.ts";

const router = Router();

router.get("/:id", requireAuth, getTeamById);
router.patch("/:id", requireAuth, updateTeam);

export default router;
