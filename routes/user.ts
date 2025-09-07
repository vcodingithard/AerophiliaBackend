import { Router } from "express";
import { userLogin } from "../middlewares/firebaseVerifyToken.ts";
import {
  getMe,
  updateMe,
  completeProfile,
  getCompletedRegistrations,
  getIncompleteRegistrations,
  handleInitialUserSignUp,
  getProfile
} from "../controllers/user.ts";

const router = Router();

// Base user routes
router.get("/me", userLogin, getMe);
router.patch("/me", userLogin, updateMe);

// Extended profile routes
router.post("/complete", userLogin, completeProfile);
router.get("/profile", userLogin, getProfile);

router.post("/initial-signup",userLogin, handleInitialUserSignUp);

// Registration routes
router.get("/registrations/completed", userLogin, getCompletedRegistrations);
router.get("/registrations/incomplete", userLogin, getIncompleteRegistrations);

export default router;
