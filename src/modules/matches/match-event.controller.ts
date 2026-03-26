import { Request, Response } from "express";
import { matchEventService } from "./match-event.service";
import { MatchEventType, MatchEventTeamSide } from "./match-event.entity";

/**
 * Controller for the new service-backed match event endpoints.
 * Validation is handled upstream in match.routes.ts via native middleware.
 */
export const MatchEventController = {

    // ── GET /:id — full match with sorted events ─────────────────────────────
    async getMatchWithEvents(req: Request, res: Response): Promise<void> {
        try {
            const matchId = parseInt(req.params["id"] as string, 10);
            const match = await matchEventService.getMatchWithEvents(matchId);
            res.json({ success: true, data: match });
        } catch (error: any) {
            const status = error.message?.includes("not found") ? 404 : 500;
            res.status(status).json({ success: false, message: error.message });
        }
    },

    // ── POST /:id/events — create new event ──────────────────────────────────
    async createMatchEvent(req: Request, res: Response): Promise<void> {
        try {
            const matchId = parseInt(req.params["id"] as string, 10);
            const dto = {
                type:       req.body.type       as MatchEventType,
                minute:     parseInt(req.body.minute, 10),
                playerName: req.body.playerName as string | undefined,
                teamSide:   req.body.teamSide   as MatchEventTeamSide | undefined,
                teamId:     req.body.teamId     ? parseInt(req.body.teamId, 10) : undefined,
                details:    req.body.details    as string | undefined,
            };

            const event = await matchEventService.createMatchEvent(matchId, dto);
            res.status(201).json({ success: true, data: event });
        } catch (error: any) {
            const status = error.message?.includes("not found") ? 404 : 500;
            res.status(status).json({ success: false, message: error.message });
        }
    },

    // ── DELETE /:id/events/:eventId — remove event + roll back score ──────────
    async removeEvent(req: Request, res: Response): Promise<void> {
        try {
            const matchId  = parseInt(req.params["id"] as string, 10);
            const eventId  = parseInt(req.params["eventId"] as string, 10);
            await matchEventService.removeEvent(eventId, matchId);
            res.json({ success: true, message: "Event deleted successfully" });
        } catch (error: any) {
            const status = error.message?.includes("not found") ? 404 : 500;
            res.status(status).json({ success: false, message: error.message });
        }
    },

    // ── GET /:id/goals — scoring events only ─────────────────────────────────
    async getGoals(req: Request, res: Response): Promise<void> {
        try {
            const matchId = parseInt(req.params["id"] as string, 10);
            const goals = await matchEventService.getGoals(matchId);
            res.json({ success: true, data: goals });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
