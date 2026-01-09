import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketingPlatformAdapter, PlatformCredentials, DateRange } from '../common/marketing-platform.adapter';
import { Campaign, Metric } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class TikTokAdsService implements MarketingPlatformAdapter {
  private readonly logger = new Logger(TikTokAdsService.name);
  private readonly baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  constructor(private readonly configService: ConfigService) {}

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      // Simple check: try to fetch advertiser info
      const response = await axios.get(`${this.baseUrl}/advertiser/get/`, {
        headers: {
          'Access-Token': credentials.accessToken,
        },
        params: {
          app_id: this.configService.get('TIKTOK_APP_ID'),
          advertiser_ids: JSON.stringify([credentials.accountId]),
        },
      });
      return response.data?.code === 0;
    } catch (error) {
      this.logger.error(`TikTok Credentials Validation Failed: ${error.message}`);
      return false;
    }
  }

  async fetchCampaigns(credentials: PlatformCredentials): Promise<Partial<Campaign>[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/campaign/get/`, {
        headers: {
          'Access-Token': credentials.accessToken,
        },
        params: {
          advertiser_id: credentials.accountId,
          page_size: 1000,
        },
      });

      if (response.data?.code !== 0) {
        throw new Error(`TikTok API Error: ${response.data?.message}`);
      }

      const campaigns = response.data.data.list || [];
      return campaigns.map((c: any) => ({
        externalId: c.campaign_id,
        name: c.campaign_name,
        status: c.operation_status, // ENABLE, DISABLE
        budget: parseFloat(c.budget || '0'),
        platform: 'TIKTOK',
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch TikTok campaigns: ${error.message}`);
      throw error;
    }
  }

  async fetchMetrics(
    credentials: PlatformCredentials,
    campaignId: string,
    range: DateRange,
  ): Promise<Partial<Metric>[]> {
    try {
      // TikTok Reporting API
      const response = await axios.get(`${this.baseUrl}/report/integrated/get/`, {
        headers: {
          'Access-Token': credentials.accessToken,
        },
        params: {
          advertiser_id: credentials.accountId,
          report_type: 'BASIC',
          data_level: 'AUCTION_CAMPAIGN',
          dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
          metrics: JSON.stringify([
            'impressions',
            'clicks',
            'spend',
            'conversion',
            'ctr',
            'cpc',
            'cpm',
          ]),
          start_date: range.startDate.toISOString().split('T')[0],
          end_date: range.endDate.toISOString().split('T')[0],
          filters: JSON.stringify([
            {
              field_name: 'campaign_ids',
              filter_type: 'IN',
              filter_value: [campaignId],
            },
          ]),
          page_size: 1000,
        },
      });

      if (response.data?.code !== 0) {
        throw new Error(`TikTok API Error: ${response.data?.message}`);
      }

      const list = response.data.data.list || [];
      return list.map((row: any) => ({
        date: new Date(row.metrics.stat_time_day),
        impressions: parseInt(row.metrics.impressions),
        clicks: parseInt(row.metrics.clicks),
        spend: parseFloat(row.metrics.spend),
        conversions: parseInt(row.metrics.conversion),
        ctr: parseFloat(row.metrics.ctr),
        cpc: parseFloat(row.metrics.cpc),
        cpm: parseFloat(row.metrics.cpm),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch TikTok metrics: ${error.message}`);
      return [];
    }
  }
}
