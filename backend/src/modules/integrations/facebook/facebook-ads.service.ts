
import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import {
    MarketingPlatformAdapter,
    PlatformCredentials,
    DateRange
} from '../common/marketing-platform.adapter';
import { firstValueFrom } from 'rxjs';
import { Campaign, Metric, CampaignStatus, AdPlatform } from '@prisma/client';
import { FacebookCampaignResponse, FacebookInsightsResponse } from './interfaces/facebook-api.types';

@Injectable()
export class FacebookAdsService implements MarketingPlatformAdapter {
    private readonly logger = new Logger(FacebookAdsService.name);
    private readonly apiVersion: string;
    private readonly baseUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.apiVersion = this.config.get<string>('FACEBOOK_API_VERSION', 'v18.0');
        this.baseUrl = this.config.get<string>('FACEBOOK_API_BASE_URL', 'https://graph.facebook.com');
    }

    /**
     * Validate Facebook Access Token
     */
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/${this.apiVersion}/me`;
            await firstValueFrom(
                this.httpService.get(url, {
                    params: { access_token: credentials.accessToken },
                }),
            );
            return true;
        } catch (error) {
            this.logger.error(`Credential validation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Fetch Campaigns from Facebook Marketing API
     */
    async fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]> {
        this.logger.log(`Fetching Facebook campaigns for account ${credentials.accountId}`);

        try {
            const url = `${this.baseUrl}/${this.apiVersion}/${credentials.accountId}/campaigns`;
            const { data } = await firstValueFrom(
                this.httpService.get<{ data: FacebookCampaignResponse[] }>(url, {
                    params: {
                        access_token: credentials.accessToken,
                        fields: 'id,name,status,objective,start_time,stop_time,daily_budget,lifetime_budget',
                        limit: 100,
                    },
                }),
            );

            return data.data.map((c) => ({
                externalId: c.id,
                name: c.name,
                status: this.mapStatus(c.status),
                platform: AdPlatform.FACEBOOK,
                budget: c.daily_budget ? Number(c.daily_budget) / 100 : (c.lifetime_budget ? Number(c.lifetime_budget) / 100 : 0),
                startDate: c.start_time ? new Date(c.start_time) : null,
                endDate: c.stop_time ? new Date(c.stop_time) : null,
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch campaigns: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch Metrics (Insights) from Facebook Marketing API
     */
    async fetchMetrics(
        credentials: PlatformCredentials,
        campaignId: string,
        range: DateRange
    ): Promise<Partial<Metric>[]> {
        this.logger.log(`Fetching metrics for campaign ${campaignId}`);

        try {
            const url = `${this.baseUrl}/${this.apiVersion}/${campaignId}/insights`;
            const { data } = await firstValueFrom(
                this.httpService.get<{ data: FacebookInsightsResponse[] }>(url, {
                    params: {
                        access_token: credentials.accessToken,
                        fields: 'impressions,clicks,spend,conversions,purchase_roas,actions',
                        time_range: {
                            since: range.startDate.toISOString().split('T')[0],
                            until: range.endDate.toISOString().split('T')[0],
                        },
                        time_increment: 1, // Daily breakdown
                    },
                }),
            );

            return data.data.map((m) => {
                const spend = Number(m.spend) || 0;
                const revenue = m.purchase_roas ? (spend * Number(m.purchase_roas[0]?.value || 0)) : 0;
                const impressions = Number(m.impressions) || 0;
                const clicks = Number(m.clicks) || 0;

                return {
                    date: new Date(m.date_start),
                    impressions,
                    clicks,
                    spend,
                    conversions: Number(m.conversions?.[0]?.value || 0), // Simplified
                    revenue,
                    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                    cpc: clicks > 0 ? spend / clicks : 0,
                    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                    roas: spend > 0 ? revenue / spend : 0,
                };
            });
        } catch (error) {
            this.logger.error(`Failed to fetch metrics: ${error.message}`);
            // Optimization: Throw error instead of returning empty array to let caller handle it
            throw error;
        }
    }

    /**
     * Exchange short-lived token for long-lived token
     */
    async exchangeToken(shortLivedToken: string): Promise<string> {
        // TODO: Implement token exchange
        return shortLivedToken;
    }

    /**
     * Map Facebook status to CampaignStatus enum
     */
    private mapStatus(fbStatus: string): CampaignStatus {
        switch (fbStatus?.toUpperCase()) {
            case 'ACTIVE':
                return CampaignStatus.ACTIVE;
            case 'PAUSED':
                return CampaignStatus.PAUSED;
            case 'DELETED':
            case 'ARCHIVED':
                return CampaignStatus.DELETED;
            default:
                return CampaignStatus.PAUSED;
        }
    }
}
