import { Request, Response } from "express";
import { userPlanService } from "./user-plan.service";

export class UserPlanController {
    async getMyPlan(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const details = await userPlanService.getMyPlanDetails(user);
            res.json(details);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async updatePlan(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { planName } = req.body;
            const result = await userPlanService.requestPlanUpdate(user, planName);
            if (result.blocked) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (error: any) {
            res.status(error?.status || 500).json({ message: error.message });
        }
    }
}

export const userPlanController = new UserPlanController();
