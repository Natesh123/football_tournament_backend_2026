import { Router } from "express";
import { TournamentController } from "./tournament.controller";
import rulesRouter from "./tournament-rules.routes";
import venueRouter from "./venues/venue.routes";
import financeRouter from "./finance/finance.routes";
import presentationRouter from "./presentation/presentation.routes";
import resultsRouter from "./results/results.routes";

const router = Router();

router.get("/", TournamentController.getAll);
router.get("/:id", TournamentController.getById);
router.post("/", TournamentController.create);
router.put("/:id", TournamentController.update);
router.delete("/:id", TournamentController.remove);

// --- Team Registrations ---
router.get("/:id/teams", TournamentController.getTeams);
router.post("/:id/teams/bulk", TournamentController.addTeamsBulk);
router.post("/:id/teams/:teamId", TournamentController.addTeam);
router.put("/:id/teams/:teamId/status", TournamentController.updateTeamStatus);
router.delete("/:id/teams/:teamId", TournamentController.removeTeam);

// --- Tournament Structure Engine ---
router.post("/:id/generate-structure", TournamentController.generateStructure);
router.post("/:id/seed-results", TournamentController.seedResults);
router.get("/:id/structure", TournamentController.getStructure);

// --- Match Rules ---
router.use("/:id/rules", rulesRouter);

// --- Sub-resource Routes ---
router.use("/:id/venues", venueRouter);
router.use("/:id/finance", financeRouter);
router.use("/:id/presentation", presentationRouter);
router.use("/:id/results", resultsRouter);

export default router;
