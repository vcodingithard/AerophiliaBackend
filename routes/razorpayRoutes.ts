import { Router } from "express";
import { initiatePayment, verifyPayment, getPayment } from "../controllers/razorpayController.ts";
import { userLogin } from "../middlewares/userLogin.ts";

const router = Router();

router.post("/create-order",userLogin, initiatePayment);
router.post("/verify-payment",userLogin, verifyPayment);
router.get("/:id", userLogin, getPayment);

export default router;
