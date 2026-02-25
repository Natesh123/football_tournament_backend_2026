import { Router } from "express";
import * as settingsController from "./settings.controller";

const router = Router();

router.post("/roles", settingsController.addRole);
router.get("/roles", settingsController.getRoles);

router.get("/users", settingsController.getUsers);
router.post("/users", settingsController.saveUser);
router.delete("/users/:id", settingsController.deleteUser);

router.get("/permissions", settingsController.getPermissions);
router.post("/permissions", settingsController.savePermissions);
router.delete("/permissions/:id", settingsController.deletePermission);

export default router;
