import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationChannel, Notification, Alert } from '@prisma/client';

@Injectable()
export class NotificationService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new notification
     */
    async create(tenantId: string, dto: CreateNotificationDto): Promise<Notification> {
        return this.prisma.notification.create({
            data: {
                tenantId,
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                channel: dto.channel || NotificationChannel.IN_APP,
                priority: dto.priority || 'NORMAL',
                metadata: dto.metadata || null,
                alertId: dto.alertId || null,
                campaignId: dto.campaignId || null,
            },
        });
    }

    /**
     * Trigger notifications from an Alert
     * Creates a notification for each active user in the tenant
     */
    async triggerFromAlert(alert: Alert): Promise<void> {
        // Get all active users in the tenant
        const users = await this.prisma.user.findMany({
            where: { tenantId: alert.tenantId, isActive: true },
            select: { id: true },
        });

        // Create notification for each user
        const notifications = users.map((user) => ({
            tenantId: alert.tenantId,
            userId: user.id,
            type: 'ALERT',
            title: alert.title,
            message: alert.message,
            channel: NotificationChannel.IN_APP,
            priority: alert.severity === 'CRITICAL' ? 'HIGH' : 'NORMAL',
            alertId: alert.id,
            metadata: {
                alertType: alert.type,
                severity: alert.severity,
                actionUrl: `/dashboard/alerts/${alert.id}`,
                actionText: 'ดูรายละเอียด',
            },
        }));

        await this.prisma.notification.createMany({ data: notifications });
    }

    /**
     * Create system notification for a specific user
     */
    async sendSystemNotification(
        tenantId: string,
        userId: string,
        title: string,
        message: string,
        metadata?: Record<string, any>,
    ): Promise<Notification> {
        return this.prisma.notification.create({
            data: {
                tenantId,
                userId,
                type: 'SYSTEM',
                title,
                message,
                channel: NotificationChannel.IN_APP,
                priority: 'NORMAL',
                metadata: metadata || null,
            },
        });
    }

    /**
     * Notify when sync is complete
     */
    async notifySyncComplete(
        tenantId: string,
        userId: string,
        platform: string,
        recordsCount: number,
    ): Promise<Notification> {
        return this.prisma.notification.create({
            data: {
                tenantId,
                userId,
                type: 'SYNC_COMPLETE',
                title: `${platform} Sync Complete`,
                message: `Successfully synced ${recordsCount} records from ${platform}.`,
                channel: NotificationChannel.IN_APP,
                priority: 'LOW',
                metadata: {
                    platform,
                    recordsCount,
                    actionUrl: '/dashboard',
                    actionText: 'View Dashboard',
                },
            },
        });
    }

    /**
     * Get notifications for a user with pagination
     */
    async findAll(userId: string, query: NotificationQueryDto) {
        const { page = 1, limit = 20, isRead, type } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            userId,
            isDismissed: false,
        };

        if (isRead !== undefined) {
            where.isRead = isRead;
        }
        if (type) {
            where.type = type;
        }

        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    type: true,
                    title: true,
                    message: true,
                    channel: true,
                    priority: true,
                    metadata: true,
                    isRead: true,
                    readAt: true,
                    createdAt: true,
                    alertId: true,
                    campaignId: true,
                },
            }),
            this.prisma.notification.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.prisma.notification.count({
            where: { userId, isRead: false, isDismissed: false },
        });
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<{ count: number }> {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        return { count: result.count };
    }

    /**
     * Dismiss a notification (soft delete)
     */
    async dismiss(id: string, userId: string): Promise<Notification> {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        return this.prisma.notification.update({
            where: { id },
            data: { isDismissed: true },
        });
    }

    /**
     * Delete old notifications (for cleanup jobs)
     */
    async deleteOldNotifications(daysOld: number = 30): Promise<{ count: number }> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                isDismissed: true,
            },
        });

        return { count: result.count };
    }
}
