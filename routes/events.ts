import express from "express";
import { getCompletedRegistrations, getIncompleteRegistrations } from "../controllers/user.js";
import { userLogin } from "../middlewares/userLogin.js";

const router = express.Router();

// GET /registrations/completed - Fetch completed registrations from user's registrations field
router.get("/registrations/completed", userLogin, getCompletedRegistrations);

// GET /registrations/incomplete - Fetch incomplete registrations from user's registrations field
router.get("/registrations/incomplete", userLogin, getIncompleteRegistrations);

export default router;