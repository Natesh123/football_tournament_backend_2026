import { Request, Response } from "express";
import { TournamentService } from "./tournament.service";

export const TournamentController = {
    async getAll(req: Request, res: Response) {
        try {
            const tournaments = await TournamentService.findAll();
            res.json({ success: true, data: tournaments });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const tournament = await TournamentService.findById(req.params.id as string);
            if (!tournament) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const { name, description, startDate, endDate, maxTeams, status, shortName, type, visibility, sponsors, logo, coverImage, organizer, participantType, minTeams, regOpenDate, regCloseDate, approvalRequired, regFee, playerLimit, squadSize } = req.body;

            if (!name || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Name, start date, and end date are required",
                });
            }

            const tournament = await TournamentService.create({
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                maxTeams: maxTeams || 16,
                status,
                shortName,
                type,
                visibility,
                sponsors,
                logo,
                coverImage,
                organizer,
                participantType,
                minTeams,
                regOpenDate: regOpenDate ? new Date(regOpenDate) : undefined,
                regCloseDate: regCloseDate ? new Date(regCloseDate) : undefined,
                approvalRequired,
                regFee,
                playerLimit,
                squadSize,
            });

            res.status(201).json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const tournament = await TournamentService.update(req.params.id as string, req.body);
            if (!tournament) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async remove(req: Request, res: Response) {
        try {
            const deleted = await TournamentService.remove(req.params.id as string);
            if (!deleted) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, message: "Tournament deleted" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- Team Registrations ---

    async getTeams(req: Request, res: Response) {
        try {
            const teams = await TournamentService.getTeams(req.params.id as string);
            res.json({ success: true, data: teams });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async addTeam(req: Request, res: Response) {
        try {
            const data = await TournamentService.addTeam(req.params.id as string, req.params.teamId as string);
            if (!data) return res.status(404).json({ success: false, message: "Tournament or Team not found" });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateTeamStatus(req: Request, res: Response) {
        try {
            const { status, paymentStatus } = req.body;
            const data = await TournamentService.updateTeamStatus(req.params.id as string, req.params.teamId as string, status, paymentStatus);
            if (!data) return res.status(404).json({ success: false, message: "Registration not found" });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async removeTeam(req: Request, res: Response) {
        try {
            const deleted = await TournamentService.removeTeam(req.params.id as string, req.params.teamId as string);
            if (!deleted) {
                return res.status(404).json({ success: false, message: "Registration not found" });
            }
            res.json({ success: true, message: "Team removed from tournament" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
