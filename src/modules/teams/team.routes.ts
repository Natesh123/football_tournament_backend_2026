import { Router } from "express";
import { TeamController } from "./team.controller";
import { uploadTempLogo, uploadGalleryPhotos, uploadMemberPhoto } from "../../middleware/upload.middleware";
import { authMiddleware, requireAdmin } from "../auth/auth.middleware";

const router = Router();
const teamController = new TeamController();

// Teams are a shared global registry: logged-in users may browse/view them.
// Organizers can register new teams within their subscription plan limits, while Admins have unlimited access.
router.use(authMiddleware);

// ── Team CRUD ─────────────────────────────────────────────────────────────────
router.get("/", teamController.getAll);
router.get("/:id", teamController.getById);
router.get("/:id/stats", teamController.getStats);
router.post("/", uploadTempLogo, teamController.create);
router.put("/:id", requireAdmin, uploadTempLogo, teamController.update);
router.delete("/:id", requireAdmin, teamController.delete);

// ── Gallery ───────────────────────────────────────────────────────────────────
router.get("/:teamId/gallery", teamController.getGallery);
router.post("/:teamId/gallery", requireAdmin, uploadGalleryPhotos, teamController.uploadGallery);
router.delete("/:teamId/gallery/:filename", requireAdmin, teamController.deleteGalleryPhoto);

// ── Team Members ──────────────────────────────────────────────────────────────
import { TeamMemberController } from "./team-member.controller";
const memberController = new TeamMemberController();

router.get("/:teamId/members", memberController.getByTeamId);
router.post("/:teamId/members/photo", uploadMemberPhoto, memberController.uploadPhoto);
router.post("/:teamId/members", memberController.create);
router.put("/members/:id", memberController.update);
router.delete("/members/:id", memberController.delete);

export const teamRoutes = router;
