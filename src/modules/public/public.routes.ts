import { Router } from "express";
import { PublicController } from "./public.controller";

const router = Router();

// GET /api/public/tournament/:id/portal
router.get("/tournament/:id/portal", PublicController.getPortalData);

// GET /api/public/match/:id
router.get("/match/:id", PublicController.getMatchData);

// GET /api/public/tournament/latest/id
router.get("/tournament/latest/id", PublicController.getLatestTournamentId);

export default router;
