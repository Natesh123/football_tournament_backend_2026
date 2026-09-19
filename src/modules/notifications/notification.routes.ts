import { Router } from "express";
import { notificationController } from "./notification.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", (req, res) => notificationController.getNotifications(req, res));
router.get("/unread-count", (req, res) => notificationController.getUnreadCount(req, res));
router.patch("/read-all", (req, res) => notificationController.markAllAsRead(req, res));
router.patch("/:id/read", (req, res) => notificationController.markAsRead(req, res));

export default router;
