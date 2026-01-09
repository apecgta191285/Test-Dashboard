import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MockDataSeeder Service
 * 
 * Responsible for generating and persisting mock/demo data to database.
 * This follows the Seed Pattern - mock data is generated ONCE and saved,
 * rather than generated on-the-fly in API responses.
 * 
 * Benefits:
 * - Consistent data across page refreshes
 * - API layer doesn't need to handle mock generation
 * - Easier to test
 * - Clear separation of concerns
 */
@Injectable()
export class MockDataSeederService {
    private readonly logger = new Logger(MockDataSeederService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate mock metrics for a single day
     */
    private generateDailyMetrics() {
        const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
        const ctr = 0.02 + Math.random() * 0.03; // 2-5% CTR
        const clicks = Math.floor(baseImpressions * ctr);
        const spend = Math.floor(Math.random() * 500) + 100;
        const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.03)); // 2-5% conversion
        const revenue = conversions * (50 + Math.random() * 100);
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpm = baseImpressions > 0 ? (spend / baseImpressions) * 1000 : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        return {
            impressions: baseImpressions,
            clicks,
            spend,
            conversions,
            revenue,
            ctr: ctr * 100,
            cpc,
            cpm,
            roas,
        };
    }

    /**
     * Seed mock metrics for a campaign for the specified number of days
     * This is called when:
     * 1. A new campaign is synced from Google Ads
     * 2. No real metrics are available from the API
     * 
     * @param campaignId - Database campaign ID
     * @param days - Number of days to generate (default: 90 for comprehensive data)
     * @returns Seeding result with counts
     */
    async seedCampaignMetrics(campaignId: string, days: number = 30): Promise<{
        success: boolean;
        createdCount: number;
        skippedCount: number;
        campaignId: string;
    }> {
        this.logger.log(`Seeding ${days} days of mock metrics for campaign ${campaignId}`);

        let createdCount = 0;
        let skippedCount = 0;

        // ✅ Use UTC dates for consistent Prisma/PostgreSQL matching
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

        const startDateUTC = new Date(todayUTC);
        startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);

        // Revert to Forward Loop (Oldest -> Newest) to ensure stability
        const currentDate = new Date(startDateUTC);

        while (currentDate <= todayUTC) {
            // ✅ Create UTC midnight date for consistent DB storage
            const dateKey = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
                0, 0, 0, 0
            ));

            // Check if metric already exists for this date
            const existing = await this.prisma.metric.findFirst({
                where: {
                    campaignId,
                    date: dateKey,
                },
            });

            if (existing) {
                // Skip - don't overwrite real data
                skippedCount++;
            } else {
                // Generate and save mock metric
                const dailyMock = this.generateDailyMetrics();

                await this.prisma.metric.create({
                    data: {
                        campaignId,
                        date: dateKey,
                        impressions: dailyMock.impressions,
                        clicks: dailyMock.clicks,
                        spend: dailyMock.spend,
                        conversions: dailyMock.conversions,
                        revenue: dailyMock.revenue,
                        ctr: dailyMock.ctr,
                        cpc: dailyMock.cpc,
                        cpm: dailyMock.cpm,
                        roas: dailyMock.roas,
                        isMockData: true,
                    },
                });
                createdCount++;
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        this.logger.log(`Seeded ${createdCount} mock metrics (${skippedCount} skipped) for campaign ${campaignId}`);

        return {
            success: true,
            createdCount,
            skippedCount,
            campaignId,
        };
    }

    /**
     * Seed mock metrics for all campaigns of an account
     * Used after initial Google Ads connection
     */
    async seedAccountMetrics(accountId: string, days: number = 90): Promise<{
        success: boolean;
        totalCampaigns: number;
        totalMetricsCreated: number;
    }> {
        this.logger.log(`Seeding mock metrics for all campaigns in account ${accountId}`);

        // Get all campaigns for this account
        const campaigns = await this.prisma.campaign.findMany({
            where: { googleAdsAccountId: accountId },
            select: { id: true, name: true },
        });

        let totalMetricsCreated = 0;

        for (const campaign of campaigns) {
            const result = await this.seedCampaignMetrics(campaign.id, days);
            totalMetricsCreated += result.createdCount;
        }

        this.logger.log(`Account ${accountId}: Seeded ${totalMetricsCreated} total mock metrics for ${campaigns.length} campaigns`);

        return {
            success: true,
            totalCampaigns: campaigns.length,
            totalMetricsCreated,
        };
    }

    /**
     * Check if a campaign has any metrics in DB
     */
    async hasCampaignMetrics(campaignId: string): Promise<boolean> {
        const count = await this.prisma.metric.count({
            where: { campaignId },
        });
        return count > 0;
    }

    /**
     * Check if a campaign needs mock data seeding
     * (no metrics in the last 90 days)
     */
    async needsSeeding(campaignId: string, days: number = 90): Promise<boolean> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const count = await this.prisma.metric.count({
            where: {
                campaignId,
                date: { gte: startDate },
            },
        });

        return count === 0;
    }
    /**
     * Generate mock GA4 metrics for a single day
     */
    private generateGA4DailyMetrics() {
        const activeUsers = Math.floor(Math.random() * 1000) + 100;
        const newUsers = Math.floor(activeUsers * (0.3 + Math.random() * 0.2)); // 30-50% new
        const sessions = Math.floor(activeUsers * (1.2 + Math.random() * 0.5)); // 1.2-1.7 sessions per user
        const screenPageViews = Math.floor(sessions * (2 + Math.random() * 3)); // 2-5 views per session
        const engagementRate = 0.4 + Math.random() * 0.3; // 40-70%
        const bounceRate = 1 - engagementRate;
        const avgSessionDuration = 60 + Math.random() * 180; // 60-240 seconds

        return {
            activeUsers,
            newUsers,
            sessions,
            screenPageViews,
            engagementRate,
            bounceRate,
            avgSessionDuration,
        };
    }

    /**
     * Seed mock GA4 metrics for a property
     */
    async seedGA4Metrics(tenantId: string, propertyId: string, days: number = 30): Promise<{
        success: boolean;
        createdCount: number;
        skippedCount: number;
    }> {
        this.logger.log(`Seeding ${days} days of mock GA4 metrics for property ${propertyId}`);

        let createdCount = 0;
        let skippedCount = 0;

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

        const startDateUTC = new Date(todayUTC);
        startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);

        const currentDate = new Date(startDateUTC);

        while (currentDate <= todayUTC) {
            const dateKey = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
                0, 0, 0, 0
            ));

            // Check if metric already exists
            const existing = await this.prisma.webAnalyticsDaily.findUnique({
                where: {
                    tenantId_propertyId_date: {
                        tenantId,
                        propertyId,
                        date: dateKey,
                    },
                },
            });

            if (existing) {
                skippedCount++;
            } else {
                const dailyMock = this.generateGA4DailyMetrics();

                await this.prisma.webAnalyticsDaily.create({
                    data: {
                        tenantId,
                        propertyId,
                        date: dateKey,
                        ...dailyMock,
                        isMockData: true,
                    },
                });
                createdCount++;
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        this.logger.log(`Seeded ${createdCount} mock GA4 metrics (${skippedCount} skipped) for property ${propertyId}`);

        return {
            success: true,
            createdCount,
            skippedCount,
        };
    }
}
