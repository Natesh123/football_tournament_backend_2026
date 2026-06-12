import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { getJwtSecret } from "../../utils/jwt.util";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        (req as any).user = decoded;
        next();
    } catch (ex) {
        res.status(401).json({ message: "Invalid token." });
    }
};

/** True when the authenticated user is a platform admin. */
export function isAdminUser(user: any): boolean {
    return user?.role?.toLowerCase() === "admin" || user?.roleId === 1;
}

/**
 * Restricts a route to platform admins. Must run after `authMiddleware`.
 * Used to lock down the shared global team registry (only admins manage it).
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!isAdminUser(user)) {
        return res.status(403).json({ message: "Admin access required." });
    }
    next();
};
