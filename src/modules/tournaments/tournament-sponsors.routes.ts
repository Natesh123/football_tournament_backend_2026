import { Router } from "express";
import { TournamentSponsorsController } from "./tournament-sponsors.controller";

const router = Router();
const tsController = new TournamentSponsorsController();

router.get("/tournament/:tournamentId", (req, res) => tsController.getByTournament(req, res));
router.post("/", (req, res) => tsController.assign(req, res));
router.delete("/:id", (req, res) => tsController.remove(req, res));

export default router;
