import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/jwt.util";

export interface AuthRequest extends Request {
    user?: any;
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        req.user = jwt.verify(token, getJwtSecret());
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
