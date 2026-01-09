import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MockDataSeederService } from '../../../dashboard/mock-data-seeder.service';
import { GoogleAdsApiService } from './google-ads-api.service';
import { GoogleAdsMapperService } from './google-ads-mapper.service';

@Injectable()
export class GoogleAdsSyncService {
    private readonly logger = new Logger(GoogleAdsSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly googleAdsApiService: GoogleAdsApiService,
        private readonly googleAdsMapperService: GoogleAdsMapperService,
        private readonly mockDataSeeder: MockDataSeederService,
    ) { }

    /**
     * Sync campaigns to database
     */
    async syncCampaigns(accountId: string) {
        // 1. Get Google Ads account
        const account = await this.prisma.googleAdsAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new Error('Google Ads account not found');
        }

        // 2. Fetch campaigns from Google Ads
        const results = await this.googleAdsApiService.fetchCampaigns(account);
        const campaigns = this.googleAdsMapperService.transformCampaigns(results);

        // 3. Sync to database
        const syncedCampaigns = [];
        let createdCount = 0;
        let updatedCount = 0;

        this.logger.log(`Syncing ${campaigns.length} campaigns for account ${accountId}`);

        for (const campaign of campaigns) {
            // Check if campaign already exists
            const existing = await this.prisma.campaign.findFirst({
                where: {
                    externalId: campaign.externalId,
                    platform: 'GOOGLE_ADS',
                    tenantId: account.tenantId, // Ensure tenant isolation
                },
            });

            if (existing) {
                // Update existing campaign
                const updated = await this.prisma.campaign.update({
                    where: { id: existing.id },
                    data: {
                        name: campaign.name,
                        status: campaign.status,
                        googleAdsAccount: {
                            connect: { id: accountId },
                        },
                    },
                });
                syncedCampaigns.push(updated);
                updatedCount++;
            } else {
                // Create new campaign
                const created = await this.prisma.campaign.create({
                    data: {
                        name: campaign.name,
                        platform: 'GOOGLE_ADS',
                        status: campaign.status,
                        externalId: campaign.externalId,
                        googleAdsAccount: {
                            connect: { id: accountId },
                        },
                        tenant: {
                            connect: { id: account.tenantId },
                        },
                    },
                });
                syncedCampaigns.push(created);
                createdCount++;
            }
        }

        this.logger.log(`Campaign sync result: ${createdCount} created, ${updatedCount} updated`);

        // Sync metrics for all campaigns (including generating mock data)
        await this.syncAllCampaignMetrics(accountId);

        return {
            synced: syncedCampaigns.length,
            campaigns: syncedCampaigns,
            createdCount,
            updatedCount,
        };
    }

    /**
     * Sync campaign metrics to database
     */
    async syncCampaignMetrics(
        accountId: string,
        campaignId: string,
        days: number = 30,
    ) {
        this.logger.log(
            `Syncing metrics for campaign ${campaignId} (last ${days} days)`,
        );

        // Get campaign from database
        const campaign = await this.prisma.campaign.findFirst({
            where: {
                id: campaignId,
                googleAdsAccountId: accountId,
            },
        });

        if (!campaign) {
            throw new NotFoundException(
                `Campaign ${campaignId} not found for account ${accountId}`,
            );
        }

        if (!campaign.externalId) {
            throw new Error(`Campaign ${campaignId} has no externalId (Google Ads ID)`);
        }

        // Get account for token
        const account = await this.prisma.googleAdsAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new NotFoundException(`Google Ads account not found: ${accountId}`);
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Fetch metrics from Google Ads API
        const rawMetrics = await this.googleAdsApiService.fetchCampaignMetrics(
            account,
            campaign.externalId,
            startDate,
            endDate,
        );

        const metricsData = this.googleAdsMapperService.transformMetrics(rawMetrics);

        let syncedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;

        for (const metric of metricsData) {
            try {
                const roas = metric.cost > 0 ? metric.conversionValue / metric.cost : 0;

                // Upsert metric (unique by campaignId + date)
                const metricDataToSave = {
                    impressions: metric.impressions,
                    clicks: metric.clicks,
                    spend: metric.cost,
                    conversions: Math.round(metric.conversions),
                    revenue: metric.conversionValue,
                    ctr: metric.ctr,
                    cpc: metric.cpc,
                    cpm: metric.cpm,
                    roas: roas,
                    isMockData: false,
                };

                const existing = await this.prisma.metric.findFirst({
                    where: {
                        campaignId: campaign.id,
                        date: metric.date,
                    },
                });

                if (existing) {
                    // Update existing metric
                    await this.prisma.metric.update({
                        where: { id: existing.id },
                        data: metricDataToSave,
                    });
                    updatedCount++;
                } else {
                    // Create new metric
                    await this.prisma.metric.create({
                        data: {
                            campaignId: campaign.id,
                            date: metric.date,
                            ...metricDataToSave,
                        },
                    });
                    createdCount++;
                }

                syncedCount++;
            } catch (error: any) {
                this.logger.error(
                    `Error syncing metric for date ${metric.date.toISOString()}: ${error.message}`,
                );
            }
        }

        // Update campaign last synced time
        await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { lastSyncedAt: new Date() },
        });

        this.logger.log(
            `Metrics sync completed: ${syncedCount} total, ${createdCount} created, ${updatedCount} updated`,
        );

        return {
            success: true,
            campaignId: campaign.id,
            campaignName: campaign.name,
            syncedCount,
            createdCount,
            updatedCount,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            lastSyncedAt: new Date(),
        };
    }

    /**
     * Sync metrics for all campaigns in an account
     */
    async syncAllCampaignMetrics(accountId: string, days: number = 90) {
        this.logger.log(`Syncing metrics for all campaigns in account ${accountId}`);

        // Get account
        const account = await this.prisma.googleAdsAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new NotFoundException(`Google Ads account not found: ${accountId}`);
        }

        // Get all campaigns for this account
        const campaigns = await this.prisma.campaign.findMany({
            where: {
                googleAdsAccountId: accountId,
                externalId: { not: null },
            },
        });

        this.logger.log(`Found ${campaigns.length} campaigns to sync`);

        // ✅ Use Promise.allSettled for parallel sync (optimized)
        const syncPromises = campaigns.map(campaign =>
            this.syncCampaignMetrics(accountId, campaign.id, days)
                .then(result => ({ success: true, ...result }))
                .catch(error => ({
                    success: false,
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    error: error.message,
                }))
        );

        const results = await Promise.all(syncPromises);
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;

        if (errorCount > 0) {
            this.logger.warn(`${errorCount} campaigns failed to sync metrics`);
        }

        // Update account last sync time
        await this.prisma.googleAdsAccount.update({
            where: { id: accountId },
            data: { lastSyncAt: new Date() },
        });

        return {
            success: true,
            accountId,
            totalCampaigns: campaigns.length,
            successCount,
            errorCount,
            results,
            lastSyncedAt: new Date(),
        };
    }
}
