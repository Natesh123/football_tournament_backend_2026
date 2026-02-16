import { Router } from "express";
import { TournamentController } from "./tournament.controller";

const router = Router();

router.get("/", TournamentController.getAll);
router.get("/:id", TournamentController.getById);
router.post("/", TournamentController.create);
router.put("/:id", TournamentController.update);
router.delete("/:id", TournamentController.remove);

export default router;
