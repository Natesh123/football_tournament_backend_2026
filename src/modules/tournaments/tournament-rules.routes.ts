import { Router, Request, Response, NextFunction } from "express";
import { TournamentRulesController } from "./tournament-rules.controller";
import { ExtraTimeRule, GoalkeeperRule } from "./tournament-rules.entity";

const rulesRouter = Router({ mergeParams: true });

// ── Native Validation Middleware ────────────────────────────────────────────────

const isPositiveInt = (val: any) => {
    if (!val || isNaN(Number(val))) return false;
    const num = Number(val);
    return Number.isInteger(num) && num >= 1;
};

const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
    if (!isPositiveInt(req.params["id"])) {
        res.status(422).json({ success: false, errors: [{ msg: "Tournament id must be a positive integer", param: "id" }] });
        return;
    }
    next();
};

const validateRulesBody = (req: Request, res: Response, next: NextFunction): void => {
    const errors: any[] = [];
    
    if (!isPositiveInt(req.params["id"])) {
        errors.push({ msg: "Tournament id must be a positive integer", param: "id" });
    }

    // Unpack using frontend keys
    const {
        govBody, ballSize, playersOnField, minPlayers, subsAllowed,
        offsideRule, extraTimeRule, penaltiesRule, yellowSuspensionLimit,
        redSuspensionLength, gkRules
    } = req.body;

    if (govBody !== undefined && (typeof govBody !== 'string' || govBody.trim().length === 0 || govBody.length > 255)) {
        errors.push({ msg: "govBody must be a non-empty string ≤ 255 chars", param: "govBody" });
    }

    if (ballSize !== undefined) {
        const num = Number(ballSize);
        if (!Number.isInteger(num) || num < 1 || num > 10) errors.push({ msg: "ballSize must be an integer between 1 and 10", param: "ballSize" });
    }

    if (playersOnField !== undefined) {
        const num = Number(playersOnField);
        if (!Number.isInteger(num) || num < 1 || num > 11) errors.push({ msg: "playersOnField must be 1–11", param: "playersOnField" });
    }

    if (minPlayers !== undefined) {
        const num = Number(minPlayers);
        if (!Number.isInteger(num) || num < 1 || num > 11) errors.push({ msg: "minPlayers must be 1–11", param: "minPlayers" });
    }

    if (subsAllowed !== undefined) {
        const num = Number(subsAllowed);
        if (!Number.isInteger(num) || num < 0 || num > 100) errors.push({ msg: "subsAllowed must be 0–100", param: "subsAllowed" });
    }

    if (offsideRule !== undefined && typeof offsideRule !== 'boolean' && offsideRule !== 'true' && offsideRule !== 'false') {
        errors.push({ msg: "offsideRule must be a boolean", param: "offsideRule" });
    }

    if (extraTimeRule !== undefined && !["None", "2x15", "Golden Goal"].includes(extraTimeRule)) {
        errors.push({ msg: "extraTimeRule must be 'None', '2x15', or 'Golden Goal'", param: "extraTimeRule" });
    }

    if (penaltiesRule !== undefined) {
        const isBool = typeof penaltiesRule === 'boolean' || penaltiesRule === 'true' || penaltiesRule === 'false';
        if (!isBool) {
            errors.push({ msg: "penaltiesRule must be a boolean", param: "penaltiesRule" });
        } else if ((penaltiesRule === true || penaltiesRule === 'true') && extraTimeRule === "None") {
            errors.push({ msg: "penaltiesRule cannot be true when extraTimeRule is 'None'", param: "penaltiesRule" });
        }
    }

    if (yellowSuspensionLimit !== undefined) {
        const num = Number(yellowSuspensionLimit);
        if (!Number.isInteger(num) || num < 1 || num > 10) errors.push({ msg: "yellowSuspensionLimit must be 1–10", param: "yellowSuspensionLimit" });
    }

    if (redSuspensionLength !== undefined) {
        const num = Number(redSuspensionLength);
        if (!Number.isInteger(num) || num < 1 || num > 10) errors.push({ msg: "redSuspensionLength must be 1–10", param: "redSuspensionLength" });
    }

    if (gkRules !== undefined && !["Standard", "No Pass Back", "Futsal Throw"].includes(gkRules)) {
        errors.push({ msg: "gkRules must be 'Standard', 'No Pass Back', or 'Futsal Throw'", param: "gkRules" });
    }

    if (errors.length > 0) {
        res.status(422).json({ success: false, errors });
        return;
    }
    next();
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /tournaments/:id/rules
 * PUT  /tournaments/:id/rules
 * Upsert match rules for a tournament.
 */
rulesRouter.post("/", validateRulesBody, TournamentRulesController.saveRules);
rulesRouter.put("/", validateRulesBody, TournamentRulesController.saveRules);

/**
 * GET /tournaments/:id/rules
 * Retrieve current match rules for a tournament.
 */
rulesRouter.get("/", validateIdParam, TournamentRulesController.getRules);

export default rulesRouter;
