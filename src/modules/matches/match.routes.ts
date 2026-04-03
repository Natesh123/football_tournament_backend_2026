import { Router, Request, Response, NextFunction } from "express";
import { MatchController } from "./match.controller";
import { MatchEventType, MatchEventTeamSide } from "./match-event.entity";
import { MatchEventController } from "./match-event.controller";

/** Helper to check if a value is a positive integer string */
const isPositiveInt = (val: any) => {
    if (!val || isNaN(Number(val))) return false;
    const num = Number(val);
    return Number.isInteger(num) && num >= 1;
};

// ── Native Validation Middleware ────────────────────────────────────────────────

const validateMatchIdParam = (req: Request, res: Response, next: NextFunction): void => {
    if (!isPositiveInt(req.params["id"])) {
        res.status(422).json({ success: false, errors: [{ msg: "Match id must be a positive integer", param: "id" }] });
        return;
    }
    next();
};

const validateMatchEventIdParams = (req: Request, res: Response, next: NextFunction): void => {
    const errors: any[] = [];
    if (!isPositiveInt(req.params["id"])) errors.push({ msg: "Match id must be a positive integer", param: "id" });
    if (!isPositiveInt(req.params["eventId"])) errors.push({ msg: "Event id must be a positive integer", param: "eventId" });

    if (errors.length > 0) {
        res.status(422).json({ success: false, errors });
        return;
    }
    next();
};

const validateCreateMatchEvent = (req: Request, res: Response, next: NextFunction): void => {
    const errors: any[] = [];
    const { type, minute, playerName, teamSide, teamId, details } = req.body;

    if (!isPositiveInt(req.params["id"])) {
        errors.push({ msg: "Match id must be a positive integer", param: "id" });
    }

    if (!Object.values(MatchEventType).includes(type)) {
        errors.push({ msg: `type must be one of: ${Object.values(MatchEventType).join(", ")}`, param: "type" });
    }

    const minNum = Number(minute);
    if (minute === undefined || !Number.isInteger(minNum) || minNum < 0 || minNum > 120) {
        errors.push({ msg: "minute must be an integer between 0 and 120", param: "minute" });
    }

    if (playerName !== undefined && (typeof playerName !== 'string' || playerName.length > 255)) {
        errors.push({ msg: "playerName must be a string ≤ 255 chars", param: "playerName" });
    }

    if (teamSide !== undefined && !Object.values(MatchEventTeamSide).includes(teamSide)) {
        errors.push({ msg: "teamSide must be 'home' or 'away'", param: "teamSide" });
    }

    if (teamId !== undefined && !isPositiveInt(teamId)) {
        errors.push({ msg: "teamId must be a positive integer", param: "teamId" });
    }

    if (details !== undefined && typeof details !== 'string') {
        errors.push({ msg: "details must be a string", param: "details" });
    }

    if (errors.length > 0) {
        res.status(422).json({ success: false, errors });
        return;
    }
    next();
};

// ── Routes ──────────────────────────────────────────────────────────────────────
const router = Router();

// Match-level general routes
router.get("/", MatchController.getAll);
router.put("/:id", MatchController.updateMatch);
router.get("/:id/lineups", MatchController.getMatchLineups);
router.get("/:id/h2h", MatchController.getMatchH2H);
router.post("/:id/result", MatchController.updateResult);
router.patch("/:id/schedule", MatchController.updateSchedule);
router.patch("/:id/live", MatchController.updateLiveState);
router.get("/:id/stats", validateMatchIdParam, MatchController.getMatchStats);

// ── GET /:id — match with full events (service-backed) ──────────────────────────
router.get("/:id", validateMatchIdParam, MatchEventController.getMatchWithEvents);

// ── POST /:id/events — create a new match event ─────────────────────────────────
router.post("/:id/events", validateCreateMatchEvent, MatchEventController.createMatchEvent);

// ── PUT /:id/events/:eventId — update existing event ────────────────────────────
router.put("/:id/events/:eventId", MatchController.updateMatchEvent);

// ── DELETE /events/:id — remove an event (service-backed with score rollback) ───
router.delete("/:id/events/:eventId", validateMatchEventIdParams, MatchEventController.removeEvent);

export default router;
