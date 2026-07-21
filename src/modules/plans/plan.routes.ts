import { Router } from "express";
import { PlanController } from "./plan.controller";
import { authMiddleware, requireAdmin } from "../auth/auth.middleware";

const router = Router();
const planController = new PlanController();

// Plan administration is admin-only.
router.use(authMiddleware, requireAdmin);

router.get("/", (req, res) => planController.getAll(req, res));
router.get("/:id", (req, res) => planController.getOne(req, res));
router.post("/", (req, res) => planController.create(req, res));
router.put("/:id", (req, res) => planController.update(req, res));
router.delete("/:id", (req, res) => planController.delete(req, res));

export default router;
