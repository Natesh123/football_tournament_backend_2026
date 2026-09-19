import { Request, Response } from "express";
import { notificationService } from "./notification.service";
import { isAdminUser } from "../auth/auth.middleware";

export class NotificationController {
    async getNotifications(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const isAdmin = isAdminUser(user);
            const { type, filter, startDate, endDate } = req.query;

            const notifications = await notificationService.getNotifications({
                userId: user.id,
                isAdmin,
                type: type as string,
                filter: filter as "all" | "unread" | "read",
                startDate: startDate as string,
                endDate: endDate as string,
            });

            res.json(notifications);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getUnreadCount(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const isAdmin = isAdminUser(user);
            const count = await notificationService.getUnreadCount(user.id, isAdmin);
            res.json({ unreadCount: count });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async markAsRead(req: Request, res: Response) {
        try {
            const id = parseInt(req.params['id'] as string);
            const updated = await notificationService.markAsRead(id);
            if (!updated) {
                return res.status(404).json({ message: "Notification not found" });
            }
            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async markAllAsRead(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const isAdmin = isAdminUser(user);
            await notificationService.markAllAsRead(user.id, isAdmin);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const notificationController = new NotificationController();
