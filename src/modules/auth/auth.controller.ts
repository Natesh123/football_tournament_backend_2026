import { Request, Response } from "express";
import { registerUser, verifyOtp, loginUser, resendOtpService } from "./auth.service";


export async function register(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await registerUser(email, password);
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
        const { email, password } = req.body;
        const result = await loginUser(email, password);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
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

