import { AppDataSource } from "../../config/data-source";
import { Notification } from "../../entities/notification.entity";

export interface CreateNotificationDTO {
    userId: number;
    type?: string;
    title: string;
    message: string;
    referenceId?: number | null;
    referenceType?: string | null;
    status?: string;
}

export interface GetNotificationsFilter {
    userId?: number;
    isAdmin?: boolean;
    type?: string;
    filter?: "all" | "unread" | "read";
    startDate?: string;
    endDate?: string;
}

export class NotificationService {
    private notificationRepo = AppDataSource.getRepository(Notification);

    /**
     * Create a notification record.
     */
    async createNotification(data: CreateNotificationDTO): Promise<Notification> {
        const notif = this.notificationRepo.create({
            userId: data.userId,
            type: data.type || "plan_update",
            title: data.title,
            message: data.message,
            referenceId: data.referenceId || null,
            referenceType: data.referenceType || null,
            status: data.status || "pending",
            isRead: false
        });
        return this.notificationRepo.save(notif);
    }

    /**
     * Get notifications with optional filtering by read state and date range.
     */
    async getNotifications(params: GetNotificationsFilter): Promise<Notification[]> {
        const qb = this.notificationRepo.createQueryBuilder("n");

        if (!params.isAdmin && params.userId) {
            qb.andWhere("n.userId = :userId", { userId: params.userId });
        }

        if (params.type) {
            qb.andWhere("n.type = :type", { type: params.type });
        }

        if (params.filter === "unread") {
            qb.andWhere("n.isRead = :isRead", { isRead: false });
        } else if (params.filter === "read") {
            qb.andWhere("n.isRead = :isRead", { isRead: true });
        }

        if (params.startDate && params.endDate) {
            const start = new Date(params.startDate);
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            qb.andWhere("n.createdAt BETWEEN :start AND :end", { start, end });
        } else if (params.startDate) {
            const start = new Date(params.startDate);
            qb.andWhere("n.createdAt >= :start", { start });
        } else if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            qb.andWhere("n.createdAt <= :end", { end });
        }

        qb.orderBy("n.createdAt", "DESC");
        return qb.getMany();
    }

    /**
     * Get count of unread notifications.
     */
    async getUnreadCount(userId?: number, isAdmin?: boolean): Promise<number> {
        const qb = this.notificationRepo.createQueryBuilder("n")
            .where("n.isRead = :isRead", { isRead: false });

        if (!isAdmin && userId) {
            qb.andWhere("n.userId = :userId", { userId });
        }

        return qb.getCount();
    }

    /**
     * Mark a single notification as read.
     */
    async markAsRead(id: number): Promise<Notification | null> {
        const notif = await this.notificationRepo.findOneBy({ id });
        if (!notif) return null;

        notif.isRead = true;
        return this.notificationRepo.save(notif);
    }

    /**
     * Mark all notifications as read for admin or a specific user.
     */
    async markAllAsRead(userId?: number, isAdmin?: boolean): Promise<void> {
        const qb = this.notificationRepo.createQueryBuilder()
            .update(Notification)
            .set({ isRead: true })
            .where("is_read = :isRead", { isRead: false });

        if (!isAdmin && userId) {
            qb.andWhere("user_id = :userId", { userId });
        }

        await qb.execute();
    }
}

export const notificationService = new NotificationService();
