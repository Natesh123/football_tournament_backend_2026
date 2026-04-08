import { Request, Response } from "express";
import { TournamentSponsorsService } from "./tournament-sponsors.service";

const tsService = new TournamentSponsorsService();

export class TournamentSponsorsController {
    async getByTournament(req: Request, res: Response) {
        try {
            const tournamentId = parseInt(req.params['tournamentId'] as string);
            const sponsors = await tsService.getSponsorsByTournament(tournamentId);
            res.json(sponsors);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async assign(req: Request, res: Response) {
        try {
            const { tournamentId, sponsorId } = req.body;
            const mapping = await tsService.assignSponsor(tournamentId, sponsorId);
            res.status(201).json(mapping);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const id = parseInt(req.params['id'] as string);
            await tsService.removeSponsor(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
