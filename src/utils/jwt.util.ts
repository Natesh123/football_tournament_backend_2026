// @ts-ignore
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET environment variable is not set! Using default key (unsafe).");
}
const SECRET_KEY = JWT_SECRET || "default_unsafe_secret";

export function generateToken(payload: any) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: "1d" });
}

export function verifyToken(token: string) {
    return jwt.verify(token, SECRET_KEY);
}
