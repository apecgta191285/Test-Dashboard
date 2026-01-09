import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleAdsMapperService {
    /**
     * Map Google Ads campaign status to our status
     */
    mapCampaignStatus(googleStatus: number | string): string {
        // If status is already a string (from some API versions or manual mapping)
        if (typeof googleStatus === 'string') {
            const statusMap: Record<string, string> = {
                ENABLED: 'ACTIVE',
                PAUSED: 'PAUSED',
                REMOVED: 'DELETED',
            };
            return statusMap[googleStatus] || 'PAUSED';
        }

        // Map numeric status from Google Ads API
        switch (googleStatus) {
            case 2:
                return 'ACTIVE'; // ENABLED
            case 3:
                return 'PAUSED'; // PAUSED
            case 4:
                return 'DELETED'; // REMOVED
            default:
                return 'UNKNOWN';
        }
    }

    /**
     * Transform API campaign results to internal format
     */
    transformCampaigns(results: any[]) {
        return results.map((row: any) => ({
            externalId: row.campaign.id.toString(),
            name: row.campaign.name,
            status: this.mapCampaignStatus(row.campaign.status),
            platform: 'GOOGLE_ADS',
            channelType: row.campaign.advertising_channel_type,
            metrics: {
                clicks: row.metrics?.clicks || 0,
                impressions: row.metrics?.impressions || 0,
                cost: (row.metrics?.cost_micros || 0) / 1000000, // Convert micros to dollars
                conversions: row.metrics?.conversions || 0,
                ctr: row.metrics?.ctr || 0,
            },
            budget: 0, // Initialize budget for type safety
        }));
    }

    /**
     * Transform API metric results to internal format
     */
    transformMetrics(metrics: any[]) {
        return metrics.map((row: any) => ({
            date: new Date(row.segments.date),
            campaignId: row.campaign.id.toString(),
            campaignName: row.campaign.name,
            impressions: parseInt(row.metrics?.impressions || '0'),
            clicks: parseInt(row.metrics?.clicks || '0'),
            cost: (row.metrics?.cost_micros || 0) / 1000000, // Convert micros to currency
            conversions: parseFloat(row.metrics?.conversions || '0'),
            conversionValue: parseFloat(row.metrics?.conversions_value || '0'),
            ctr: parseFloat(row.metrics?.ctr || '0') * 100, // Convert to percentage
            cpc: (row.metrics?.average_cpc || 0) / 1000000, // Convert micros to currency
            cpm: 0, // CPM not available in this report type
        }));
    }
}
