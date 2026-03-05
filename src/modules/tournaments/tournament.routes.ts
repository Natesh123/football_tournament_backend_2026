import { Router } from "express";
import { TournamentController } from "./tournament.controller";

const router = Router();

router.get("/", TournamentController.getAll);
router.get("/:id", TournamentController.getById);
router.post("/", TournamentController.create);
router.put("/:id", TournamentController.update);
router.delete("/:id", TournamentController.remove);

// --- Team Registrations ---
router.get("/:id/teams", TournamentController.getTeams);
router.post("/:id/teams/:teamId", TournamentController.addTeam);
router.put("/:id/teams/:teamId/status", TournamentController.updateTeamStatus);
router.delete("/:id/teams/:teamId", TournamentController.removeTeam);

// --- Tournament Structure Engine ---
router.post("/:id/generate-structure", TournamentController.generateStructure);
router.get("/:id/structure", TournamentController.getStructure);

export default router;
