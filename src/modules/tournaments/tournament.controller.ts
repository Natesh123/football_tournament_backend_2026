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
            const { name, description, startDate, endDate, maxTeams, status } = req.body;

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
};
