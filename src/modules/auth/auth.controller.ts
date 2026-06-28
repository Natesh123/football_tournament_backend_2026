import { Request, Response } from "express";
import { registerUser, verifyOtp, loginUser, resendOtpService, validateTokenService, requestPasswordReset, resetPassword, verifyResetToken } from "./auth.service";


export async function register(req: Request, res: Response) {
    try {
        const { email, password, user_name, phone_number } = req.body;
        const result = await registerUser(email, password, user_name, phone_number);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function verifyOtpController(req: Request, res: Response) {
    try {
        const { email, otp } = req.body;
        const result = await verifyOtp(email, otp);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function login(req: Request, res: Response) {
    try {
        console.log("[Login Controller] Request body:", req.body);
        const { email, password } = req.body;
        const result = await loginUser(email, password);
        res.json(result);
    } catch (err: any) {
        console.error("[Login Controller] Error during login:", err);
        res.status(400).json({ error: err.message || "Unknown login error" });
    }
}

export async function resendOtp(req: Request, res: Response) {
    try {
        const { email } = req.body;
        const result = await resendOtpService(email);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function validateTokenController(req: Request, res: Response) {
    try {
        const { token } = req.body;
        const result = await validateTokenService(token);
        res.json(result);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}

export async function forgotPasswordController(req: Request, res: Response) {
    try {
        const { email, platform } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });
        const client = platform === "mobile" ? "mobile" : "web";
        const result = await requestPasswordReset(email, client);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function verifyResetTokenController(req: Request, res: Response) {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Token is required." });
        const result = await verifyResetToken(token);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function resetPasswordController(req: Request, res: Response) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required." });
        if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
        const result = await resetPassword(token, newPassword);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}
