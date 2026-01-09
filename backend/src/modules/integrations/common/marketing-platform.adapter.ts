import { Campaign, Metric } from '@prisma/client';

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface PlatformCredentials {
    accessToken: string;
    refreshToken?: string;
    accountId: string;
}

export interface MarketingPlatformAdapter {
    /**
     * Fetch campaigns from the platform
     */
    fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]>;

    /**
     * Fetch metrics for a specific campaign
     */
    fetchMetrics(
        credentials: PlatformCredentials,
        campaignId: string,
        range: DateRange,
    ): Promise<Partial<Metric>[]>;

    /**
     * Validate credentials and return account status
     */
    validateCredentials(credentials: PlatformCredentials): Promise<boolean>;
}
