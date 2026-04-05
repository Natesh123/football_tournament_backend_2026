import { Router } from "express";
import { register, verifyOtpController, login, resendOtp, validateTokenController } from "./auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtpController);
router.post("/login", login);
router.post("/resend-otp", resendOtp);
router.post("/validate-token", validateTokenController);

export default router;

