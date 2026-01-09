import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationFactory } from '../integrations/common/integration.factory';
import { PlatformType } from '../../common/enums/platform-type.enum';
import { MarketingPlatformAdapter } from '../integrations/common/marketing-platform.adapter';

@Injectable()
export class UnifiedSyncService {
    private readonly logger = new Logger(UnifiedSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly integrationFactory: IntegrationFactory,
    ) { }

    /**
     * Sync all connected accounts across all platforms
     */
    async syncAll() {
        this.logger.log('Starting unified sync for all platforms...');

        const results = {
            [PlatformType.GOOGLE_ADS]: await this.syncPlatform(PlatformType.GOOGLE_ADS),
            [PlatformType.FACEBOOK]: await this.syncPlatform(PlatformType.FACEBOOK),
            [PlatformType.GOOGLE_ANALYTICS]: await this.syncPlatform(PlatformType.GOOGLE_ANALYTICS),
            [PlatformType.TIKTOK]: await this.syncPlatform(PlatformType.TIKTOK),
            [PlatformType.LINE_ADS]: await this.syncPlatform(PlatformType.LINE_ADS),
        };

        this.logger.log('Unified sync completed', results);
        return results;
    }

    /**
     * Sync all accounts for a specific platform
     */
    async syncPlatform(platform: string) {
        this.logger.log(`Syncing all accounts for platform: ${platform}`);
        let accounts: any[] = [];

        // Fetch accounts based on platform
        // TODO: In the future, we should have a unified Account table or a polymorphic relation
        switch (platform) {
            case PlatformType.GOOGLE_ADS:
                accounts = await this.prisma.googleAdsAccount.findMany({ where: { status: 'ENABLED' } });
                break;
            case PlatformType.FACEBOOK:
                accounts = await this.prisma.facebookAdsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case PlatformType.GOOGLE_ANALYTICS:
                accounts = await this.prisma.googleAnalyticsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case PlatformType.TIKTOK:
                accounts = await this.prisma.tikTokAdsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case PlatformType.LINE_ADS:
                accounts = await this.prisma.lineAdsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            default:
                this.logger.warn(`Platform ${platform} not supported for batch sync`);
                return { success: 0, failed: 0 };
        }

        let success = 0;
        let failed = 0;

        for (const account of accounts) {
            try {
                await this.syncAccount(platform, account.id, account.tenantId, account);
                success++;
            } catch (error) {
                this.logger.error(`Failed to sync account ${account.id} (${platform}): ${error.message}`);
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Sync a specific account using the Adapter Pattern
     */
    async syncAccount(platform: string, accountId: string, tenantId: string, accountData?: any) {
        const adapter = this.integrationFactory.getAdapter(platform);

        // 1. Prepare Credentials
        // Note: Each platform model has slightly different field names, we need to normalize them
        // or fetch them if not provided.
        if (!accountData) {
            accountData = await this.fetchAccountData(platform, accountId);
        }

        const credentials = {
            accessToken: accountData.accessToken,
            refreshToken: accountData.refreshToken,
            accountId: platform === PlatformType.GOOGLE_ANALYTICS ? accountData.propertyId : (accountData.customerId || accountData.accountId),
        };

        // 2. Fetch Campaigns (if applicable)
        // GA4 returns empty array here as per our adapter implementation
        const campaigns = await adapter.fetchCampaigns(credentials);

        // 3. Save Campaigns to DB
        for (const campaign of campaigns) {
            await this.saveCampaign(tenantId, platform, accountId, campaign);
        }

        // 4. Fetch & Save Metrics
        // For Ads: Loop through campaigns and fetch metrics
        // For GA4: Fetch account-level metrics (treated as a "campaign" or just direct metrics)

        if (platform === PlatformType.GOOGLE_ANALYTICS) {
            // GA4 Logic: Fetch Account Level Metrics
            // We treat the "Property" as the entity to fetch metrics for
            const dateRange = {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate: new Date(),
            };

            const metrics = await adapter.fetchMetrics(credentials, credentials.accountId, dateRange);
            await this.saveWebAnalytics(tenantId, credentials.accountId, metrics);

        } else {
            // Ads Logic: Fetch Campaign Level Metrics
            // We need to re-fetch campaigns from DB to get the internal ID
            const dbCampaigns = await this.prisma.campaign.findMany({
                where: {
                    tenantId,
                    platform,
                    // For Google Ads, we link via googleAdsAccountId
                    // For Facebook, we link via facebookAdsAccountId
                    // This is a bit messy due to schema design, but we handle it.
                    OR: [
                        { googleAdsAccountId: accountId },
                        { facebookAdsAccountId: accountId }
                    ]
                }
            });

            for (const campaign of dbCampaigns) {
                if (!campaign.externalId) continue;

                const dateRange = {
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    endDate: new Date(),
                };

                const metrics = await adapter.fetchMetrics(credentials, campaign.externalId, dateRange);
                await this.saveCampaignMetrics(campaign.id, metrics);
            }
        }

        // Update Last Sync Time
        await this.updateLastSync(platform, accountId);
    }

    private async fetchAccountData(platform: string, accountId: string) {
        switch (platform) {
            case PlatformType.GOOGLE_ADS:
                return this.prisma.googleAdsAccount.findUnique({ where: { id: accountId } });
            case PlatformType.FACEBOOK:
                return this.prisma.facebookAdsAccount.findUnique({ where: { id: accountId } });
            case PlatformType.GOOGLE_ANALYTICS:
                return this.prisma.googleAnalyticsAccount.findUnique({ where: { id: accountId } });
            case PlatformType.TIKTOK:
                return this.prisma.tikTokAdsAccount.findUnique({ where: { id: accountId } });
            case PlatformType.LINE_ADS:
                return this.prisma.lineAdsAccount.findUnique({ where: { id: accountId } });
            default:
                throw new Error(`Unknown platform ${platform}`);
        }
    }

    private async saveCampaign(tenantId: string, platform: string, accountId: string, data: any) {
        // Common logic to upsert campaign
        // We need to handle the specific foreign key based on platform
        const fkField = platform === PlatformType.GOOGLE_ADS ? 'googleAdsAccountId' : 'facebookAdsAccountId';

        // Check existence
        const existing = await this.prisma.campaign.findFirst({
            where: {
                tenantId,
                externalId: data.externalId,
                platform,
            }
        });

        const campaignData = {
            name: data.name,
            status: data.status,
            budget: data.budget,
            startDate: data.startDate,
            endDate: data.endDate,
            [fkField]: accountId,
        };

        if (existing) {
            return this.prisma.campaign.update({
                where: { id: existing.id },
                data: campaignData
            });
        } else {
            return this.prisma.campaign.create({
                data: {
                    ...campaignData,
                    tenantId,
                    externalId: data.externalId,
                    platform,
                }
            });
        }
    }

    private async saveCampaignMetrics(campaignId: string, metrics: any[]) {
        for (const m of metrics) {
            await this.prisma.metric.upsert({
                where: {
                    campaignId_date: {
                        campaignId,
                        date: m.date,
                    }
                },
                update: {
                    impressions: m.impressions,
                    clicks: m.clicks,
                    spend: m.spend,
                    conversions: m.conversions,
                    revenue: m.revenue,
                    ctr: m.ctr,
                    cpc: m.cpc,
                    cpm: m.cpm,
                    roas: m.roas,
                },
                create: {
                    campaignId,
                    date: m.date,
                    impressions: m.impressions,
                    clicks: m.clicks,
                    spend: m.spend,
                    conversions: m.conversions,
                    revenue: m.revenue,
                    ctr: m.ctr,
                    cpc: m.cpc,
                    cpm: m.cpm,
                    roas: m.roas,
                }
            });
        }
    }

    private async saveWebAnalytics(tenantId: string, propertyId: string, metrics: any[]) {
        for (const m of metrics) {
            // GA4 Adapter returns metrics in a generic format, we map them to WebAnalyticsDaily
            await this.prisma.webAnalyticsDaily.upsert({
                where: {
                    tenantId_propertyId_date: {
                        tenantId,
                        propertyId,
                        date: m.date,
                    }
                },
                update: {
                    activeUsers: m.impressions, // Mapped from Adapter
                    sessions: m.clicks,         // Mapped from Adapter
                    newUsers: 0, // Adapter might not return this yet, need to enhance Adapter if needed
                    engagementRate: 0,
                },
                create: {
                    tenantId,
                    propertyId,
                    date: m.date,
                    activeUsers: m.impressions,
                    sessions: m.clicks,
                }
            });
        }
    }

    private async updateLastSync(platform: string, accountId: string) {
        const now = new Date();
        switch (platform) {
            case PlatformType.GOOGLE_ADS:
                await this.prisma.googleAdsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
            case PlatformType.FACEBOOK:
                await this.prisma.facebookAdsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
            case PlatformType.GOOGLE_ANALYTICS:
                await this.prisma.googleAnalyticsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
        }
    }
}
