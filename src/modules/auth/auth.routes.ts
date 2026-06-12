import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, verifyOtpController, login, resendOtp, validateTokenController, forgotPasswordController, resetPasswordController } from "./auth.controller";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: "Too many registration attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: { error: "Too many OTP requests. Please wait before trying again." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", registerLimiter, register);
router.post("/verify-otp", otpLimiter, verifyOtpController);
router.post("/login", loginLimiter, login);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/validate-token", validateTokenController);
router.post("/forgot-password", otpLimiter, forgotPasswordController);
router.post("/reset-password", resetPasswordController);

export default router;

