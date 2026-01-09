import { Injectable, Logger } from '@nestjs/common';
import {
    MarketingPlatformAdapter,
    PlatformCredentials,
    DateRange
} from '../common/marketing-platform.adapter';
import { Campaign, Metric } from '@prisma/client';
import { GoogleAdsCampaignService } from './google-ads-campaign.service';

@Injectable()
export class GoogleAdsService implements MarketingPlatformAdapter {
    private readonly logger = new Logger(GoogleAdsService.name);

    constructor(
        private readonly campaignService: GoogleAdsCampaignService,
    ) { }

    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
        // TODO: Implement validation logic using GoogleAdsClientService or similar
        return true;
    }

    async fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]> {
        this.logger.log(`Fetching Google Ads campaigns for account ${credentials.accountId}`);
        try {
            const result = await this.campaignService.fetchCampaigns(credentials.accountId);
            return result.campaigns.map(c => ({
                ...c,
                platform: 'GOOGLE_ADS',
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch campaigns: ${error.message}`);
            throw error;
        }
    }

    async fetchMetrics(
        credentials: PlatformCredentials,
        campaignId: string,
        range: DateRange
    ): Promise<Partial<Metric>[]> {
        this.logger.log(`Fetching metrics for campaign ${campaignId}`);
        try {
            // Note: GoogleAdsCampaignService.fetchCampaignMetrics takes Date objects
            const metrics = await this.campaignService.fetchCampaignMetrics(
                credentials.accountId,
                campaignId,
                range.startDate,
                range.endDate
            );
            return metrics;
        } catch (error) {
            this.logger.error(`Failed to fetch metrics: ${error.message}`);
            return [];
        }
    }
}
