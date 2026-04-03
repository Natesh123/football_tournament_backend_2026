import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authGuard } from "../../middleware/auth.middleware";

const router = Router();

router.get("/stats",    authGuard as any, DashboardController.getStats);
router.get("/live",     authGuard as any, DashboardController.getLiveMatches);
router.get("/upcoming", authGuard as any, DashboardController.getUpcomingMatches);
router.get("/past",     authGuard as any, DashboardController.getPastMatches);
router.get("/scorers",  authGuard as any, DashboardController.getTopScorers);

export default router;
