import { Router } from "express";
import { userPlanController } from "./user-plan.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/my-plan", (req, res) => userPlanController.getMyPlan(req, res));
router.post("/update-plan", (req, res) => userPlanController.updatePlan(req, res));

export default router;
