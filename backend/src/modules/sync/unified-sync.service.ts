import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationFactory } from '../integrations/common/integration.factory';
import { AdPlatform } from '@prisma/client';
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
            [AdPlatform.GOOGLE_ADS]: await this.syncPlatform(AdPlatform.GOOGLE_ADS),
            [AdPlatform.FACEBOOK]: await this.syncPlatform(AdPlatform.FACEBOOK),
            [AdPlatform.GOOGLE_ANALYTICS]: await this.syncPlatform(AdPlatform.GOOGLE_ANALYTICS),
            [AdPlatform.TIKTOK]: await this.syncPlatform(AdPlatform.TIKTOK),
            [AdPlatform.LINE_ADS]: await this.syncPlatform(AdPlatform.LINE_ADS),
        };

        this.logger.log('Unified sync completed', results);
        return results;
    }

    /**
     * Sync all accounts for a specific platform
     */
    async syncPlatform(platform: AdPlatform) {
        this.logger.log(`Syncing all accounts for platform: ${platform}`);
        let accounts: any[] = [];

        // Fetch accounts based on platform
        // TODO: In the future, we should have a unified Account table or a polymorphic relation
        switch (platform) {
            case AdPlatform.GOOGLE_ADS:
                accounts = await this.prisma.googleAdsAccount.findMany({ where: { status: 'ENABLED' } });
                break;
            case AdPlatform.FACEBOOK:
                accounts = await this.prisma.facebookAdsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case AdPlatform.GOOGLE_ANALYTICS:
                accounts = await this.prisma.googleAnalyticsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case AdPlatform.TIKTOK:
                accounts = await this.prisma.tikTokAdsAccount.findMany({ where: { status: 'ACTIVE' } });
                break;
            case AdPlatform.LINE_ADS:
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
    async syncAccount(platform: AdPlatform, accountId: string, tenantId: string, accountData?: any) {
        const adapter = this.integrationFactory.getAdapter(platform);

        // 1. Prepare Credentials
        if (!accountData) {
            accountData = await this.fetchAccountData(platform, accountId);
        }

        const credentials = {
            accessToken: accountData.accessToken,
            refreshToken: accountData.refreshToken,
            accountId: platform === AdPlatform.GOOGLE_ANALYTICS ? accountData.propertyId : (accountData.customerId || accountData.accountId),
        };

        // 2. Fetch Campaigns (if applicable)
        const campaigns = await adapter.fetchCampaigns(credentials);

        // 3. Save Campaigns to DB
        for (const campaign of campaigns) {
            await this.saveCampaign(tenantId, platform, accountId, campaign);
        }

        // 4. Fetch & Save Metrics
        if (platform === AdPlatform.GOOGLE_ANALYTICS) {
            // GA4 Logic: Fetch Account Level Metrics
            const dateRange = {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate: new Date(),
            };

            const metrics = await adapter.fetchMetrics(credentials, credentials.accountId, dateRange);
            await this.saveWebAnalytics(tenantId, credentials.accountId, metrics);

        } else {
            // Ads Logic: Fetch Campaign Level Metrics
            const dbCampaigns = await this.prisma.campaign.findMany({
                where: {
                    tenantId,
                    platform,
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

    private async fetchAccountData(platform: AdPlatform, accountId: string) {
        switch (platform) {
            case AdPlatform.GOOGLE_ADS:
                return this.prisma.googleAdsAccount.findUnique({ where: { id: accountId } });
            case AdPlatform.FACEBOOK:
                return this.prisma.facebookAdsAccount.findUnique({ where: { id: accountId } });
            case AdPlatform.GOOGLE_ANALYTICS:
                return this.prisma.googleAnalyticsAccount.findUnique({ where: { id: accountId } });
            case AdPlatform.TIKTOK:
                return this.prisma.tikTokAdsAccount.findUnique({ where: { id: accountId } });
            case AdPlatform.LINE_ADS:
                return this.prisma.lineAdsAccount.findUnique({ where: { id: accountId } });
            default:
                throw new Error(`Unknown platform ${platform}`);
        }
    }

    private async saveCampaign(tenantId: string, platform: AdPlatform, accountId: string, data: any) {
        // Common logic to upsert campaign
        const fkField = platform === AdPlatform.GOOGLE_ADS ? 'googleAdsAccountId' : 'facebookAdsAccountId';

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
            await this.prisma.webAnalyticsDaily.upsert({
                where: {
                    tenantId_propertyId_date: {
                        tenantId,
                        propertyId,
                        date: m.date,
                    }
                },
                update: {
                    activeUsers: m.impressions,
                    sessions: m.clicks,
                    newUsers: 0,
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

    private async updateLastSync(platform: AdPlatform, accountId: string) {
        const now = new Date();
        switch (platform) {
            case AdPlatform.GOOGLE_ADS:
                await this.prisma.googleAdsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
            case AdPlatform.FACEBOOK:
                await this.prisma.facebookAdsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
            case AdPlatform.GOOGLE_ANALYTICS:
                await this.prisma.googleAnalyticsAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } });
                break;
        }
    }
}
