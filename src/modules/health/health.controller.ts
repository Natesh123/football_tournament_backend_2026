import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";

export class HealthController {
    static async check(req: Request, res: Response) {
        const dbStatus = AppDataSource.isInitialized ? "connected" : "disconnected";
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            database: dbStatus,
        });
    }
}
