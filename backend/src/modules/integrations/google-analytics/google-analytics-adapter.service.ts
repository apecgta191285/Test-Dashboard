import { Injectable, Logger } from '@nestjs/common';
import {
    MarketingPlatformAdapter,
    PlatformCredentials,
    DateRange
} from '../common/marketing-platform.adapter';
import { Campaign, Metric } from '@prisma/client';
import { GoogleAnalyticsApiService } from './google-analytics-api.service';

@Injectable()
export class GoogleAnalyticsAdapterService implements MarketingPlatformAdapter {
    private readonly logger = new Logger(GoogleAnalyticsAdapterService.name);

    constructor(
        private readonly apiService: GoogleAnalyticsApiService,
    ) { }

    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
        try {
            // Simple validation by trying to run a lightweight report or just checking token
            // Since we don't have a dedicated "validate" endpoint in apiService, 
            // we'll assume if we have credentials and can instantiate the client, it's valid enough for now.
            // A better approach would be to call a list properties endpoint.
            return !!credentials.accessToken;
        } catch (error) {
            this.logger.error(`Credential validation failed: ${error.message}`);
            return false;
        }
    }

    async fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]> {
        // GA4 is not campaign-centric in the same way as Ad platforms.
        // We return an empty array to satisfy the interface.
        return [];
    }

    async fetchMetrics(
        credentials: PlatformCredentials,
        campaignId: string,
        range: DateRange
    ): Promise<Partial<Metric>[]> {
        this.logger.log(`Fetching GA4 metrics for property ${credentials.accountId}`);
        try {
            // We reuse the logic from GoogleAnalyticsService but adapted for this interface.
            // Note: campaignId here is likely the Property ID for GA4 context if misused, 
            // but strictly speaking GA4 doesn't have campaigns to fetch metrics FOR in this context.
            // However, if we want to sync "Account Level" metrics, we can use this.

            const response = await this.apiService.runReport({
                propertyId: credentials.accountId,
                accessToken: credentials.accessToken,
                refreshToken: credentials.refreshToken,
            }, {
                dateRanges: [{
                    startDate: range.startDate.toISOString().split('T')[0],
                    endDate: range.endDate.toISOString().split('T')[0]
                }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'conversions' },
                    { name: 'totalRevenue' },
                ],
            });

            if (!response || !response.rows) {
                return [];
            }

            return response.rows.map((row: any) => ({
                date: this.parseDate(row.dimensionValues[0].value),
                impressions: Number(row.metricValues[0].value), // Mapping Active Users -> Impressions (approx)
                clicks: Number(row.metricValues[1].value),      // Mapping Sessions -> Clicks (approx)
                conversions: Number(row.metricValues[2].value),
                revenue: Number(row.metricValues[3].value),
                spend: 0, // GA4 doesn't track ad spend directly unless linked
                ctr: 0,
                cpc: 0,
                cpm: 0,
                roas: 0,
            }));

        } catch (error) {
            this.logger.error(`Failed to fetch metrics: ${error.message}`);
            return [];
        }
    }

    private parseDate(dateStr: string): Date {
        // GA4 returns YYYYMMDD
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
    }
}
