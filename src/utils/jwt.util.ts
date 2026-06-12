// @ts-ignore
import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set. Refusing to sign/verify tokens.");
    }
    return secret;
}

export function generateToken(payload: any) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: "1d" });
}

export function verifyToken(token: string) {
    return jwt.verify(token, getJwtSecret());
}
