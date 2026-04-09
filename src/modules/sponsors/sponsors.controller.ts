import { Request, Response } from "express";
import { SponsorsService } from "./sponsors.service";

const sponsorsService = new SponsorsService();

export class SponsorsController {
    async getAll(req: Request, res: Response) {
        try {
            console.log('[SponsorsController] Fetching all sponsors with query:', req.query);
            const sponsors = await sponsorsService.getAll(req.query);
            console.log(`[SponsorsController] Found ${sponsors.length} sponsors`);
            res.json(sponsors);
        } catch (error: any) {
            console.error('[SponsorsController] Error fetching sponsors:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const sponsor = await sponsorsService.getOne(parseInt(req.params['id'] as string));
            if (!sponsor) return res.status(404).json({ message: "Sponsor not found" });
            res.json(sponsor);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const data = req.body;
            if (req.file) {
                data.logo = `/uploads/sponsors/${req.file.filename}`;
            }
            const sponsor = await sponsorsService.create(data);
            res.status(201).json(sponsor);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const data = req.body;
            if (req.file) {
                data.logo = `/uploads/sponsors/${req.file.filename}`;
            }
            const sponsor = await sponsorsService.update(parseInt(req.params['id'] as string), data);
            res.json(sponsor);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await sponsorsService.delete(parseInt(req.params['id'] as string));
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
