import { Request, Response } from "express";
import { PlanService } from "./plan.service";

const planService = new PlanService();

export class PlanController {
    async getAll(req: Request, res: Response) {
        try {
            const plans = await planService.getAll(req.query as any);
            res.json(plans);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const plan = await planService.getOne(parseInt(req.params['id'] as string));
            if (!plan) return res.status(404).json({ message: "Plan not found" });
            res.json(plan);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const plan = await planService.create(req.body);
            res.status(201).json(plan);
        } catch (error: any) {
            res.status(error?.status || 500).json({ message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const plan = await planService.update(parseInt(req.params['id'] as string), req.body);
            res.json(plan);
        } catch (error: any) {
            res.status(error?.status || 500).json({ message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await planService.delete(parseInt(req.params['id'] as string));
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
