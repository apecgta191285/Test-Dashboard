import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateDailyAdMetrics, generateDailyGA4Metrics } from './generators/metrics.generator';
import { MOCK_ALERT_TEMPLATES, generateAlertForDB } from './generators/alerts.generator';
import { MOCK_SYNC_LOGS, generateSyncLogForDB } from './generators/sync-logs.generator';
import { ALL_MOCK_CAMPAIGNS, getMockCampaignsByPlatform } from './data/mock-campaigns';

/**
 * MockDataSeeder Service
 * 
 * รวมศูนย์การสร้าง Mock Data ทั้งหมด
 * ใช้ Seed Pattern - สร้างครั้งเดียวและบันทึกลง database
 */
@Injectable()
export class MockDataSeederService {
    private readonly logger = new Logger(MockDataSeederService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ============================================
    // Campaign Metrics Seeding
    // ============================================

    async seedCampaignMetrics(campaignId: string, days: number = 30) {
        this.logger.log(`Seeding ${days} days of mock metrics for campaign ${campaignId}`);

        let createdCount = 0;
        let skippedCount = 0;

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const startDateUTC = new Date(todayUTC);
        startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);

        const currentDate = new Date(startDateUTC);

        while (currentDate <= todayUTC) {
            const dateKey = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
            ));

            const existing = await this.prisma.metric.findFirst({
                where: { campaignId, date: dateKey },
            });

            if (existing) {
                skippedCount++;
            } else {
                const dailyMock = generateDailyAdMetrics();
                await this.prisma.metric.create({
                    data: {
                        campaignId,
                        date: dateKey,
                        ...dailyMock,
                        isMockData: true,
                    },
                });
                createdCount++;
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        this.logger.log(`Seeded ${createdCount} mock metrics (${skippedCount} skipped) for campaign ${campaignId}`);
        return { success: true, createdCount, skippedCount, campaignId };
    }

    // ============================================
    // GA4 Metrics Seeding
    // ============================================

    async seedGA4Metrics(tenantId: string, propertyId: string, days: number = 30) {
        this.logger.log(`Seeding ${days} days of mock GA4 metrics for property ${propertyId}`);

        let createdCount = 0;
        let skippedCount = 0;

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const startDateUTC = new Date(todayUTC);
        startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);

        const currentDate = new Date(startDateUTC);

        while (currentDate <= todayUTC) {
            const dateKey = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
            ));

            const existing = await this.prisma.webAnalyticsDaily.findUnique({
                where: { tenantId_propertyId_date: { tenantId, propertyId, date: dateKey } },
            });

            if (existing) {
                skippedCount++;
            } else {
                const dailyMock = generateDailyGA4Metrics();
                await this.prisma.webAnalyticsDaily.create({
                    data: { tenantId, propertyId, date: dateKey, ...dailyMock, isMockData: true },
                });
                createdCount++;
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        this.logger.log(`Seeded ${createdCount} mock GA4 metrics for property ${propertyId}`);
        return { success: true, createdCount, skippedCount };
    }

    // ============================================
    // Alerts Seeding
    // ============================================

    async seedAlerts(tenantId: string, count: number = 8) {
        this.logger.log(`Seeding ${count} mock alerts for tenant ${tenantId}`);

        // Get or create default alert rule
        let alertRule = await this.prisma.alertRule.findFirst({
            where: { tenantId, name: 'Mock Alert Rule' },
        });

        if (!alertRule) {
            alertRule = await this.prisma.alertRule.create({
                data: {
                    tenantId,
                    name: 'Mock Alert Rule',
                    metric: 'roas',
                    operator: 'lt',
                    threshold: 1.0,
                    severity: 'WARNING',
                    isActive: true,
                },
            });
        }

        let createdCount = 0;
        const templates = MOCK_ALERT_TEMPLATES.slice(0, count);

        for (const template of templates) {
            const alertData = generateAlertForDB(tenantId, alertRule.id, template);

            // Check if similar alert already exists
            const existing = await this.prisma.alert.findFirst({
                where: {
                    tenantId,
                    message: alertData.message,
                },
            });

            if (!existing) {
                await this.prisma.alert.create({ data: alertData });
                createdCount++;
            }
        }

        this.logger.log(`Seeded ${createdCount} mock alerts for tenant ${tenantId}`);
        return { success: true, createdCount };
    }

    // ============================================
    // Sync Logs Seeding
    // ============================================

    async seedSyncLogs(tenantId: string, count: number = 12) {
        this.logger.log(`Seeding ${count} mock sync logs for tenant ${tenantId}`);

        let createdCount = 0;
        const templates = MOCK_SYNC_LOGS.slice(0, count);

        for (const template of templates) {
            const logData = generateSyncLogForDB(tenantId, template);
            await this.prisma.syncLog.create({ data: logData });
            createdCount++;
        }

        this.logger.log(`Seeded ${createdCount} mock sync logs for tenant ${tenantId}`);
        return { success: true, createdCount };
    }

    // ============================================
    // Multi-platform Campaigns Seeding
    // ============================================

    async seedCampaigns(tenantId: string, platforms?: string[]) {
        this.logger.log(`Seeding mock campaigns for tenant ${tenantId}`);

        const platformList = platforms || ['GOOGLE_ADS', 'FACEBOOK', 'TIKTOK', 'LINE_ADS'];
        let createdCount = 0;

        for (const platform of platformList) {
            const campaigns = getMockCampaignsByPlatform(platform);

            for (const campaign of campaigns) {
                // Check if campaign already exists
                const existing = await this.prisma.campaign.findFirst({
                    where: {
                        tenantId,
                        externalId: campaign.externalId,
                        platform: campaign.platform,
                    },
                });

                if (!existing) {
                    await this.prisma.campaign.create({
                        data: {
                            tenantId,
                            externalId: campaign.externalId,
                            name: campaign.name,
                            status: campaign.status,
                            budget: campaign.budget,
                            platform: campaign.platform,
                        },
                    });
                    createdCount++;
                }
            }
        }

        this.logger.log(`Seeded ${createdCount} mock campaigns for tenant ${tenantId}`);
        return { success: true, createdCount };
    }

    // ============================================
    // Seed All (Master Function)
    // ============================================

    async seedAll(tenantId: string, options?: {
        campaigns?: boolean;
        metrics?: boolean;
        alerts?: boolean;
        syncLogs?: boolean;
        metricDays?: number;
    }) {
        const opts = {
            campaigns: true,
            metrics: true,
            alerts: true,
            syncLogs: true,
            metricDays: 30,
            ...options,
        };

        this.logger.log(`Starting full mock data seed for tenant ${tenantId}`);
        const results: Record<string, unknown> = {};

        // 1. Seed Campaigns
        if (opts.campaigns) {
            results.campaigns = await this.seedCampaigns(tenantId);
        }

        // 2. Seed Metrics for each campaign
        if (opts.metrics) {
            const campaigns = await this.prisma.campaign.findMany({
                where: { tenantId },
                select: { id: true },
            });

            let totalMetrics = 0;
            for (const campaign of campaigns) {
                const result = await this.seedCampaignMetrics(campaign.id, opts.metricDays);
                totalMetrics += result.createdCount;
            }
            results.metrics = { success: true, totalCreated: totalMetrics };
        }

        // 3. Seed Alerts
        if (opts.alerts) {
            results.alerts = await this.seedAlerts(tenantId);
        }

        // 4. Seed Sync Logs
        if (opts.syncLogs) {
            results.syncLogs = await this.seedSyncLogs(tenantId);
        }

        this.logger.log(`Completed full mock data seed for tenant ${tenantId}`);
        return { success: true, results };
    }

    // ============================================
    // Clear Mock Data
    // ============================================

    async clearMockData(tenantId: string) {
        this.logger.log(`Clearing mock data for tenant ${tenantId}`);

        // Delete mock metrics
        const metricsDeleted = await this.prisma.metric.deleteMany({
            where: { isMockData: true, campaign: { tenantId } },
        });

        // Delete mock GA4 metrics
        const ga4Deleted = await this.prisma.webAnalyticsDaily.deleteMany({
            where: { tenantId, isMockData: true },
        });

        // Delete mock alerts (alerts with 'MOCK' in title)
        const alertsDeleted = await this.prisma.alert.deleteMany({
            where: { tenantId, title: { contains: 'Mock' } },
        });

        this.logger.log(`Cleared mock data: ${metricsDeleted.count} metrics, ${ga4Deleted.count} GA4 metrics, ${alertsDeleted.count} alerts`);

        return {
            success: true,
            deleted: {
                metrics: metricsDeleted.count,
                ga4Metrics: ga4Deleted.count,
                alerts: alertsDeleted.count,
            },
        };
    }

    // ============================================
    // Additional Methods (SRP - แยกหน้าที่ชัดเจน)
    // ============================================

    /**
     * Seed metrics สำหรับ campaigns ทั้งหมดของ tenant
     */
    async seedAllCampaignMetrics(tenantId: string, days: number = 30) {
        this.logger.log(`Seeding ${days} days of metrics for all campaigns in tenant ${tenantId}`);

        const campaigns = await this.prisma.campaign.findMany({
            where: { tenantId },
            select: { id: true, name: true },
        });

        let totalMetrics = 0;
        for (const campaign of campaigns) {
            const result = await this.seedCampaignMetrics(campaign.id, days);
            totalMetrics += result.createdCount;
        }

        this.logger.log(`Seeded ${totalMetrics} total metrics for ${campaigns.length} campaigns`);
        return { success: true, campaignsCount: campaigns.length, metricsCreated: totalMetrics };
    }

    /**
     * ลบเฉพาะ mock campaigns และ metrics
     */
    async clearCampaignsAndMetrics(tenantId: string) {
        this.logger.log(`Clearing campaigns and metrics for tenant ${tenantId}`);

        // Delete mock metrics first (foreign key constraint)
        const metricsDeleted = await this.prisma.metric.deleteMany({
            where: { isMockData: true, campaign: { tenantId } },
        });

        // Delete mock campaigns (campaigns that were seeded)
        const campaignsDeleted = await this.prisma.campaign.deleteMany({
            where: {
                tenantId,
                externalId: { startsWith: 'gads-' }, // Mock campaigns have specific IDs
            },
        });

        // Also delete FB, TikTok, LINE mock campaigns
        const fbDeleted = await this.prisma.campaign.deleteMany({
            where: { tenantId, externalId: { startsWith: 'fb-' } },
        });
        const tiktokDeleted = await this.prisma.campaign.deleteMany({
            where: { tenantId, externalId: { startsWith: 'tiktok-' } },
        });
        const lineDeleted = await this.prisma.campaign.deleteMany({
            where: { tenantId, externalId: { startsWith: 'line-' } },
        });

        const totalCampaigns = campaignsDeleted.count + fbDeleted.count + tiktokDeleted.count + lineDeleted.count;

        this.logger.log(`Cleared ${metricsDeleted.count} metrics, ${totalCampaigns} campaigns`);
        return {
            success: true,
            deleted: {
                metrics: metricsDeleted.count,
                campaigns: totalCampaigns,
            },
        };
    }
}

