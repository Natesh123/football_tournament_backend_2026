import { Router } from "express";
import { MatchController } from "./match.controller";

const router = Router();

router.post("/:id/result", MatchController.updateResult);

export default router;
