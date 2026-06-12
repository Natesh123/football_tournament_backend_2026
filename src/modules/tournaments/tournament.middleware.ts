import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../../config/data-source";
import { Tournament } from "./tournament.entity";
import { isAdminUser } from "../auth/auth.middleware";

/**
 * Multivendor ownership gate for a single tournament (`/:id` and everything
 * nested beneath it). Must run after `authMiddleware`.
 *
 * - Admins may manage any tournament.
 * - Everyone else may only manage tournaments they own (`ownerId === user.id`).
 *
 * The loaded tournament is attached to `req.tournament` so handlers can reuse it.
 */
export const authorizeTournamentOwnership = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const id = parseInt(String(req.params.id), 10);

    if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid tournament id" });
    }

    const tournament = await AppDataSource.getRepository(Tournament).findOne({ where: { id } });
    if (!tournament) {
        return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    if (!isAdminUser(user) && tournament.ownerId !== user?.id) {
        return res.status(403).json({ success: false, message: "You do not have access to this tournament." });
    }

    (req as any).tournament = tournament;
    next();
};
