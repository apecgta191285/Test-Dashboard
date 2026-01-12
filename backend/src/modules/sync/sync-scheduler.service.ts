import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UnifiedSyncService } from './unified-sync.service';
import { AdPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncSchedulerService {
    private readonly logger = new Logger(SyncSchedulerService.name);

    constructor(
        private readonly unifiedSyncService: UnifiedSyncService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Scheduled sync for Google Ads - runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledGoogleAdsSync() {
        this.logger.log('Starting scheduled Google Ads sync (Unified Engine)...');
        await this.unifiedSyncService.syncPlatform(AdPlatform.GOOGLE_ADS);
        this.logger.log('Scheduled Google Ads sync completed');
    }

    /**
     * Scheduled sync for GA4 - runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledGA4Sync() {
        this.logger.log('Starting scheduled GA4 sync (Unified Engine)...');
        await this.unifiedSyncService.syncPlatform(AdPlatform.GOOGLE_ANALYTICS);
        this.logger.log('Scheduled GA4 sync completed');
    }

    /**
     * Scheduled sync for Facebook Ads - runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledFacebookAdsSync() {
        this.logger.log('Starting scheduled Facebook Ads sync (Unified Engine)...');
        await this.unifiedSyncService.syncPlatform(AdPlatform.FACEBOOK);
        this.logger.log('Scheduled Facebook Ads sync completed');
    }

    /**
     * Scheduled sync for TikTok Ads - runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledTikTokAdsSync() {
        this.logger.log('Starting scheduled TikTok Ads sync (Unified Engine)...');
        await this.unifiedSyncService.syncPlatform(AdPlatform.TIKTOK);
        this.logger.log('Scheduled TikTok Ads sync completed');
    }

    /**
     * Scheduled sync for LINE Ads - runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledLineAdsSync() {
        this.logger.log('Starting scheduled LINE Ads sync (Unified Engine)...');
        await this.unifiedSyncService.syncPlatform(AdPlatform.LINE_ADS);
        this.logger.log('Scheduled LINE Ads sync completed');
    }

    /**
     * Get sync status for a tenant
     */
    async getSyncStatus(tenantId: string) {
        const latestLogs = await this.prisma.syncLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const googleAdsLog = latestLogs.find(log => log.platform === AdPlatform.GOOGLE_ADS);
        const ga4Log = latestLogs.find(log => log.platform === AdPlatform.GOOGLE_ANALYTICS);
        const facebookLog = latestLogs.find(log => log.platform === AdPlatform.FACEBOOK);
        const tiktokLog = latestLogs.find(log => log.platform === AdPlatform.TIKTOK);
        const lineLog = latestLogs.find(log => log.platform === AdPlatform.LINE_ADS);

        const formatStatus = (log: any) => log ? {
            lastSyncAt: log.completedAt,
            status: log.status,
            errorMessage: log.errorMessage,
        } : null;

        return {
            googleAds: formatStatus(googleAdsLog),
            ga4: formatStatus(ga4Log),
            facebook: formatStatus(facebookLog),
            tiktok: formatStatus(tiktokLog),
            line: formatStatus(lineLog),
            recentLogs: latestLogs,
        };
    }
}
