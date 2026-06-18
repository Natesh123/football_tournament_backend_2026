import { Router } from "express";
import * as settingsController from "./settings.controller";
import { authMiddleware, requireAdmin } from "../auth/auth.middleware";

const router = Router();

// All settings endpoints require a logged-in user.
router.use(authMiddleware);

// Any authenticated user may change their own password (used by the profile modal).
router.post("/change-password", settingsController.changePassword);

// Role / user / permission administration is admin-only.
router.use(requireAdmin);

router.post("/roles", settingsController.addRole);
router.get("/roles", settingsController.getRoles);
router.delete("/roles/:id", settingsController.deleteRole);

router.get("/users", settingsController.getUsers);
router.post("/users", settingsController.saveUser);
router.delete("/users/:id", settingsController.deleteUser);

router.get("/permissions", settingsController.getPermissions);
router.post("/permissions", settingsController.savePermissions);
router.delete("/permissions/:id", settingsController.deletePermission);

export default router;
