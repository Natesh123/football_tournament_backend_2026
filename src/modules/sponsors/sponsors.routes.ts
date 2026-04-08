import { Router } from "express";
import { SponsorsController } from "./sponsors.controller";
import { uploadSponsorLogo } from "../../middleware/upload.middleware";

const router = Router();
const sponsorsController = new SponsorsController();

router.get("/", (req, res) => sponsorsController.getAll(req, res));
router.get("/:id", (req, res) => sponsorsController.getOne(req, res));
router.post("/", uploadSponsorLogo, (req, res) => sponsorsController.create(req, res));
router.put("/:id", uploadSponsorLogo, (req, res) => sponsorsController.update(req, res));
router.delete("/:id", (req, res) => sponsorsController.delete(req, res));

export default router;
