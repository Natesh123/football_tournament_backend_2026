import { Router } from "express";
import { TeamController } from "./team.controller";
import { uploadTempLogo, uploadGalleryPhotos } from "../../middleware/upload.middleware";

const router = Router();
const teamController = new TeamController();

// ── Team CRUD ─────────────────────────────────────────────────────────────────
router.get("/", teamController.getAll);
router.get("/:id", teamController.getById);
router.post("/", uploadTempLogo, teamController.create);

// ── Gallery ───────────────────────────────────────────────────────────────────
router.get("/:teamId/gallery", teamController.getGallery);
router.post("/:teamId/gallery", uploadGalleryPhotos, teamController.uploadGallery);
router.delete("/:teamId/gallery/:filename", teamController.deleteGalleryPhoto);

// ── Team Members ──────────────────────────────────────────────────────────────
import { TeamMemberController } from "./team-member.controller";
const memberController = new TeamMemberController();

router.get("/:teamId/members", memberController.getByTeamId);
router.post("/:teamId/members", memberController.create);
router.delete("/members/:id", memberController.delete);

export const teamRoutes = router;
