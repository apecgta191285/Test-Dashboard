/**
 * Notification Service Unit Tests
 * @module notification.service.spec
 * @description Comprehensive tests for notification system including:
 *   - Create notification (default isRead=false)
 *   - Get unread count
 *   - Mark as read/dismiss
 *   - Trigger from Alert
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel, AlertSeverity } from '@prisma/client';

// =============================================================================
// Mock Data
// =============================================================================

const mockNotification = {
    id: 'notif-001',
    tenantId: 'tenant-001',
    userId: 'user-001',
    type: 'ALERT',
    title: 'CTR Alert',
    message: 'CTR dropped below 2%',
    channel: NotificationChannel.IN_APP,
    priority: 'NORMAL',
    metadata: null,
    isRead: false,
    isDismissed: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    alertId: null,
    campaignId: null,
};

const mockAlert = {
    id: 'alert-001',
    tenantId: 'tenant-001',
    title: 'High Spend Alert',
    message: 'Campaign spend exceeded budget',
    severity: AlertSeverity.CRITICAL,
    type: 'BUDGET',
};

// =============================================================================
// Mock Prisma Service
// =============================================================================

const mockPrismaService = {
    notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        findMany: jest.fn(),
    },
};

// =============================================================================
// Test Suite
// =============================================================================

describe('NotificationService', () => {
    let service: NotificationService;
    let prismaService: typeof mockPrismaService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        prismaService = mockPrismaService;
    });

    // ===========================================================================
    // Create Notification Tests
    // ===========================================================================

    describe('create', () => {
        // -------------------------------------------------------------------------
        // NOTIF-001: Create notification with default isRead=false
        // -------------------------------------------------------------------------
        describe('NOTIF-001: Create IN_APP notification', () => {
            it('should create notification with isRead: false by default', async () => {
                prismaService.notification.create.mockResolvedValue(mockNotification);

                const result = await service.create('tenant-001', {
                    userId: 'user-001',
                    type: 'ALERT',
                    title: 'CTR Alert',
                    message: 'CTR dropped below 2%',
                });

                expect(result.isRead).toBe(false);
                expect(prismaService.notification.create).toHaveBeenCalled();
            });

            it('should use IN_APP channel by default', async () => {
                prismaService.notification.create.mockResolvedValue(mockNotification);

                await service.create('tenant-001', {
                    userId: 'user-001',
                    type: 'ALERT',
                    title: 'Test',
                    message: 'Test message',
                });

                expect(prismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        channel: NotificationChannel.IN_APP,
                    }),
                });
            });

            it('should use NORMAL priority by default', async () => {
                prismaService.notification.create.mockResolvedValue(mockNotification);

                await service.create('tenant-001', {
                    userId: 'user-001',
                    type: 'ALERT',
                    title: 'Test',
                    message: 'Test message',
                });

                expect(prismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        priority: 'NORMAL',
                    }),
                });
            });
        });

        // -------------------------------------------------------------------------
        // NOTIF-002: Create notification with metadata
        // -------------------------------------------------------------------------
        describe('NOTIF-002: Create notification with metadata', () => {
            it('should store metadata as JSON', async () => {
                const metadata = {
                    campaignId: 'camp-123',
                    actionUrl: '/dashboard/alerts/001',
                    severity: 'WARNING',
                };

                prismaService.notification.create.mockResolvedValue({
                    ...mockNotification,
                    metadata,
                });

                await service.create('tenant-001', {
                    userId: 'user-001',
                    type: 'ALERT',
                    title: 'Test',
                    message: 'Test message',
                    metadata,
                });

                expect(prismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        metadata,
                    }),
                });
            });
        });

        // -------------------------------------------------------------------------
        // Custom channel
        // -------------------------------------------------------------------------
        describe('Create notification with custom channel', () => {
            it('should respect specified channel', async () => {
                prismaService.notification.create.mockResolvedValue({
                    ...mockNotification,
                    channel: NotificationChannel.EMAIL,
                });

                await service.create('tenant-001', {
                    userId: 'user-001',
                    type: 'REPORT',
                    title: 'Report Ready',
                    message: 'Your report is ready',
                    channel: NotificationChannel.EMAIL,
                });

                expect(prismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        channel: NotificationChannel.EMAIL,
                    }),
                });
            });
        });
    });

    // ===========================================================================
    // Get Unread Notifications Tests
    // ===========================================================================

    describe('findAll', () => {
        // -------------------------------------------------------------------------
        // NOTIF-003: Get unread notifications
        // -------------------------------------------------------------------------
        describe('NOTIF-003: Get unread notifications for user', () => {
            it('should return only non-dismissed notifications', async () => {
                prismaService.notification.findMany.mockResolvedValue([mockNotification]);
                prismaService.notification.count.mockResolvedValue(1);

                const result = await service.findAll('user-001', { page: 1, limit: 20 });

                expect(prismaService.notification.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            userId: 'user-001',
                            isDismissed: false,
                        }),
                    }),
                );
                expect(result.data).toHaveLength(1);
            });

            it('should filter by isRead when specified', async () => {
                prismaService.notification.findMany.mockResolvedValue([mockNotification]);
                prismaService.notification.count.mockResolvedValue(1);

                await service.findAll('user-001', { page: 1, limit: 20, isRead: false });

                expect(prismaService.notification.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            isRead: false,
                        }),
                    }),
                );
            });

            it('should return pagination metadata', async () => {
                prismaService.notification.findMany.mockResolvedValue([mockNotification]);
                prismaService.notification.count.mockResolvedValue(50);

                const result = await service.findAll('user-001', { page: 1, limit: 20 });

                expect(result.meta).toEqual({
                    total: 50,
                    page: 1,
                    limit: 20,
                    totalPages: 3,
                });
            });
        });
    });

    // ===========================================================================
    // Get Unread Count Tests
    // ===========================================================================

    describe('getUnreadCount', () => {
        // -------------------------------------------------------------------------
        // NOTIF-007: Get unread count
        // -------------------------------------------------------------------------
        describe('NOTIF-007: Get unread count', () => {
            it('should return correct count of unread notifications', async () => {
                prismaService.notification.count.mockResolvedValue(5);

                const result = await service.getUnreadCount('user-001');

                expect(result).toBe(5);
                expect(prismaService.notification.count).toHaveBeenCalledWith({
                    where: { userId: 'user-001', isRead: false, isDismissed: false },
                });
            });

            it('should return 0 when no unread notifications', async () => {
                prismaService.notification.count.mockResolvedValue(0);

                const result = await service.getUnreadCount('user-001');

                expect(result).toBe(0);
            });
        });
    });

    // ===========================================================================
    // Mark As Read Tests
    // ===========================================================================

    describe('markAsRead', () => {
        // -------------------------------------------------------------------------
        // NOTIF-004: Mark notification as read
        // -------------------------------------------------------------------------
        describe('NOTIF-004: Mark notification as read', () => {
            it('should update isRead to true and set readAt', async () => {
                prismaService.notification.findFirst.mockResolvedValue(mockNotification);
                prismaService.notification.update.mockResolvedValue({
                    ...mockNotification,
                    isRead: true,
                    readAt: new Date(),
                });

                const result = await service.markAsRead('notif-001', 'user-001');

                expect(result.isRead).toBe(true);
                expect(result.readAt).toBeDefined();
                expect(prismaService.notification.update).toHaveBeenCalledWith({
                    where: { id: 'notif-001' },
                    data: { isRead: true, readAt: expect.any(Date) },
                });
            });

            it('should throw NotFoundException if notification not found', async () => {
                prismaService.notification.findFirst.mockResolvedValue(null);

                await expect(
                    service.markAsRead('nonexistent', 'user-001'),
                ).rejects.toThrow(NotFoundException);
            });

            it('should verify notification belongs to user', async () => {
                prismaService.notification.findFirst.mockResolvedValue(null);

                await expect(
                    service.markAsRead('notif-001', 'wrong-user'),
                ).rejects.toThrow(NotFoundException);

                expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
                    where: { id: 'notif-001', userId: 'wrong-user' },
                });
            });
        });
    });

    // ===========================================================================
    // Mark All As Read Tests
    // ===========================================================================

    describe('markAllAsRead', () => {
        // -------------------------------------------------------------------------
        // NOTIF-005: Mark all as read
        // -------------------------------------------------------------------------
        describe('NOTIF-005: Mark all as read', () => {
            it('should mark all unread notifications as read', async () => {
                prismaService.notification.updateMany.mockResolvedValue({ count: 10 });

                const result = await service.markAllAsRead('user-001');

                expect(result.count).toBe(10);
                expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
                    where: { userId: 'user-001', isRead: false },
                    data: { isRead: true, readAt: expect.any(Date) },
                });
            });

            it('should return 0 when no unread notifications', async () => {
                prismaService.notification.updateMany.mockResolvedValue({ count: 0 });

                const result = await service.markAllAsRead('user-001');

                expect(result.count).toBe(0);
            });
        });
    });

    // ===========================================================================
    // Dismiss Tests
    // ===========================================================================

    describe('dismiss', () => {
        // -------------------------------------------------------------------------
        // NOTIF-006: Dismiss notification
        // -------------------------------------------------------------------------
        describe('NOTIF-006: Dismiss notification', () => {
            it('should update isDismissed to true', async () => {
                prismaService.notification.findFirst.mockResolvedValue(mockNotification);
                prismaService.notification.update.mockResolvedValue({
                    ...mockNotification,
                    isDismissed: true,
                });

                const result = await service.dismiss('notif-001', 'user-001');

                expect(result.isDismissed).toBe(true);
                expect(prismaService.notification.update).toHaveBeenCalledWith({
                    where: { id: 'notif-001' },
                    data: { isDismissed: true },
                });
            });

            it('should throw NotFoundException if notification not found', async () => {
                prismaService.notification.findFirst.mockResolvedValue(null);

                await expect(
                    service.dismiss('nonexistent', 'user-001'),
                ).rejects.toThrow(NotFoundException);
            });
        });
    });

    // ===========================================================================
    // Trigger From Alert Tests
    // ===========================================================================

    describe('triggerFromAlert', () => {
        // -------------------------------------------------------------------------
        // NOTIF-008: Create notification from Alert trigger
        // -------------------------------------------------------------------------
        describe('NOTIF-008: Create notification from Alert trigger', () => {
            it('should create notifications for all active users in tenant', async () => {
                prismaService.user.findMany.mockResolvedValue([
                    { id: 'user-001' },
                    { id: 'user-002' },
                    { id: 'user-003' },
                ]);
                prismaService.notification.createMany.mockResolvedValue({ count: 3 });

                await service.triggerFromAlert(mockAlert as any);

                expect(prismaService.user.findMany).toHaveBeenCalledWith({
                    where: { tenantId: 'tenant-001', isActive: true },
                    select: { id: true },
                });
                expect(prismaService.notification.createMany).toHaveBeenCalled();
            });

            it('should link notification to alertId', async () => {
                prismaService.user.findMany.mockResolvedValue([{ id: 'user-001' }]);
                prismaService.notification.createMany.mockResolvedValue({ count: 1 });

                await service.triggerFromAlert(mockAlert as any);

                expect(prismaService.notification.createMany).toHaveBeenCalledWith({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            alertId: 'alert-001',
                        }),
                    ]),
                });
            });

            it('should use HIGH priority for CRITICAL alerts', async () => {
                prismaService.user.findMany.mockResolvedValue([{ id: 'user-001' }]);
                prismaService.notification.createMany.mockResolvedValue({ count: 1 });

                await service.triggerFromAlert(mockAlert as any);

                expect(prismaService.notification.createMany).toHaveBeenCalledWith({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            priority: 'HIGH',
                        }),
                    ]),
                });
            });

            it('should include actionUrl in metadata', async () => {
                prismaService.user.findMany.mockResolvedValue([{ id: 'user-001' }]);
                prismaService.notification.createMany.mockResolvedValue({ count: 1 });

                await service.triggerFromAlert(mockAlert as any);

                expect(prismaService.notification.createMany).toHaveBeenCalledWith({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            metadata: expect.objectContaining({
                                actionUrl: '/dashboard/alerts/alert-001',
                            }),
                        }),
                    ]),
                });
            });
        });
    });

    // ===========================================================================
    // Delete Old Notifications Tests
    // ===========================================================================

    describe('deleteOldNotifications', () => {
        it('should delete dismissed notifications older than specified days', async () => {
            prismaService.notification.deleteMany.mockResolvedValue({ count: 100 });

            const result = await service.deleteOldNotifications(30);

            expect(result.count).toBe(100);
            expect(prismaService.notification.deleteMany).toHaveBeenCalledWith({
                where: {
                    createdAt: { lt: expect.any(Date) },
                    isDismissed: true,
                },
            });
        });
    });
});
