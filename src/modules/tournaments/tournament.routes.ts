import { Router } from "express";
import { TournamentController } from "./tournament.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { authorizeTournamentOwnership } from "./tournament.middleware";
import rulesRouter from "./tournament-rules.routes";
import venueRouter from "./venues/venue.routes";
import financeRouter from "./finance/finance.routes";
import presentationRouter from "./presentation/presentation.routes";
import resultsRouter from "./results/results.routes";

const router = Router();

// Every tournament route requires a logged-in user; req.user drives ownership scoping.
router.use(authMiddleware);

// Collection-level routes (not tied to a specific tournament).
router.get("/", TournamentController.getAll);
router.post("/", TournamentController.create);

// Everything below operates on one tournament → admins, or the owner only.
router.use("/:id", authorizeTournamentOwnership);

router.get("/:id", TournamentController.getById);
router.put("/:id", TournamentController.update);
router.delete("/:id", TournamentController.remove);

// Finalize setup → moves status to registration_open after server-side validation.
router.post("/:id/submit", TournamentController.submit);

// --- Team Registrations ---
router.get("/:id/teams", TournamentController.getTeams);
router.post("/:id/teams/bulk", TournamentController.addTeamsBulk);
router.post("/:id/teams/:teamId", TournamentController.addTeam);
router.put("/:id/teams/:teamId/status", TournamentController.updateTeamStatus);
router.delete("/:id/teams/:teamId", TournamentController.removeTeam);

// --- Referees (tournament-level pool) ---
router.get("/:id/referees", TournamentController.getReferees);
router.post("/:id/referees", TournamentController.addReferee);
router.delete("/:id/referees/:refereeId", TournamentController.deleteReferee);

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
