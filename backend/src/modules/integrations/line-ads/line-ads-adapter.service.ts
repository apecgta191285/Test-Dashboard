import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketingPlatformAdapter, PlatformCredentials, DateRange } from '../common/marketing-platform.adapter';
import { Campaign, Metric } from '@prisma/client';
import { getMockCampaignsByPlatform } from '../../mock-data/data/mock-campaigns';
import { generateMetricsForDateRange } from '../../mock-data/generators/metrics.generator';

@Injectable()
export class LineAdsAdapterService implements MarketingPlatformAdapter {
    private readonly logger = new Logger(LineAdsAdapterService.name);

    // Feature flag - ควบคุมผ่าน environment variable
    private readonly useMockData: boolean;

    constructor(private readonly configService: ConfigService) {
        this.useMockData = this.configService.get('LINE_ADS_USE_MOCK', 'true') === 'true';
        this.logger.log(`[LINE Ads] Mock Data Mode: ${this.useMockData}`);
    }

    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
        return !!credentials.accessToken;
    }

    async fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]> {
        if (this.useMockData) {
            // ใช้ mock data จาก centralized module
            const campaigns = getMockCampaignsByPlatform('LINE_ADS');
            this.logger.log(`[LINE Ads] Fetched ${campaigns.length} mock campaigns`);
            return campaigns;
        }
        // TODO: Implement real LINE Ads API call here
        return [];
    }

    async fetchMetrics(
        credentials: PlatformCredentials,
        campaignId: string,
        range: DateRange,
    ): Promise<Partial<Metric>[]> {
        if (this.useMockData) {
            // คำนวณจำนวนวัน
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            // ใช้ generator จาก centralized module
            const metrics = generateMetricsForDateRange(days, 'ads');
            this.logger.log(`[LINE Ads] Generated ${metrics.length} days of mock metrics`);
            return metrics;
        }
        // TODO: Implement real LINE Ads API call here
        return [];
    }
}

