import { Request, Response } from "express";
import { tournamentRulesService } from "./tournament-rules.service";
import { ExtraTimeRule, GoalkeeperRule } from "./tournament-rules.entity";

export const TournamentRulesController = {

    // ── POST /tournaments/:id/rules ───────────────────────────────────────────
    async saveRules(req: Request, res: Response): Promise<void> {
        try {
            const tournamentId = parseInt(req.params["id"] as string, 10);
            
            // Map frontend enum values to backend Enum
            let mappedExtraTime: ExtraTimeRule | undefined;
            if (req.body.extraTimeRule === "None") mappedExtraTime = ExtraTimeRule.NO_EXTRA_TIME;
            else if (req.body.extraTimeRule === "2x15") mappedExtraTime = ExtraTimeRule.FULL_EXTRA_TIME;
            else if (req.body.extraTimeRule === "Golden Goal") mappedExtraTime = ExtraTimeRule.GOLDEN_GOAL;

            let mappedGk: GoalkeeperRule | undefined;
            if (req.body.gkRules === "Standard") mappedGk = GoalkeeperRule.STANDARD_FIFA;
            else if (req.body.gkRules === "No Pass Back") mappedGk = GoalkeeperRule.NO_RESTRICTION;
            else if (req.body.gkRules === "Futsal Throw") mappedGk = GoalkeeperRule.ROLLING_KEEPER;

            const dto = {
                governingBody:        req.body.govBody              as string | undefined, // mapped govBody
                ballSize:             req.body.ballSize             !== undefined ? Number(req.body.ballSize)             : undefined,
                playersOnField:       req.body.playersOnField       !== undefined ? Number(req.body.playersOnField)       : undefined,
                minPlayers:           req.body.minPlayers           !== undefined ? Number(req.body.minPlayers)           : undefined,
                substitutionRules:    req.body.subsAllowed          !== undefined ? Number(req.body.subsAllowed)          : undefined, // mapped subsAllowed
                applyOffsideRule:     req.body.offsideRule          !== undefined ? Boolean(req.body.offsideRule)         : undefined, // mapped offsideRule
                extraTimeRules:       mappedExtraTime               as ExtraTimeRule | undefined, // mapped enum
                penaltiesShootout:    req.body.penaltiesRule        !== undefined ? Boolean(req.body.penaltiesRule)       : undefined, // mapped penaltiesRule
                yellowCardSuspension: req.body.yellowSuspensionLimit!== undefined ? Number(req.body.yellowSuspensionLimit): undefined, // mapped
                redCardPenalty:       req.body.redSuspensionLength  !== undefined ? Number(req.body.redSuspensionLength)  : undefined, // mapped
                goalkeeperRules:      mappedGk                      as GoalkeeperRule | undefined, // mapped enum
            };

            const rules = await tournamentRulesService.saveRules(tournamentId, dto);
            
            // Respond with empty success; the client can re-fetch or use its own state
            res.status(200).json({ success: true, data: rules });
        } catch (error: any) {
            const status = error.message?.includes("not found") ? 404 : 500;
            res.status(status).json({ success: false, message: error.message });
        }
    },

    // ── GET /tournaments/:id/rules ────────────────────────────────────────────
    async getRules(req: Request, res: Response): Promise<void> {
        try {
            const tournamentId = parseInt(req.params["id"] as string, 10);
            const rules = await tournamentRulesService.getRules(tournamentId);

            if (!rules) {
                res.status(200).json({ success: true, data: null, message: "No rules saved yet for this tournament" });
                return;
            }

            // Reverse map enums
            let feExtraTime = "None";
            if (rules.extraTimeRules === ExtraTimeRule.FULL_EXTRA_TIME) feExtraTime = "2x15";
            else if (rules.extraTimeRules === ExtraTimeRule.GOLDEN_GOAL) feExtraTime = "Golden Goal";

            let feGk = "Standard";
            if (rules.goalkeeperRules === GoalkeeperRule.NO_RESTRICTION) feGk = "No Pass Back";
            else if (rules.goalkeeperRules === GoalkeeperRule.ROLLING_KEEPER) feGk = "Futsal Throw";

            // Map backend entity to frontend [(ngModel)] structure
            const feData = {
                govBody:               rules.governingBody,
                ballSize:              rules.ballSize,
                playersOnField:        rules.playersOnField,
                minPlayers:            rules.minPlayers,
                subsAllowed:           rules.substitutionRules,
                offsideRule:           Boolean(rules.applyOffsideRule), // MySQL sometimes returns 1/0
                extraTimeRule:         feExtraTime,
                penaltiesRule:         Boolean(rules.penaltiesShootout),
                yellowSuspensionLimit: rules.yellowCardSuspension,
                redSuspensionLength:   rules.redCardPenalty,
                gkRules:               feGk
            };

            res.status(200).json({ success: true, data: feData });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
