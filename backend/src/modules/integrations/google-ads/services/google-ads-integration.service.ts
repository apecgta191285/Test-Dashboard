import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsAuthService } from './google-ads-auth.service';
import { GoogleAdsClientService } from './google-ads-client.service';
import { ConnectGoogleAdsDto, SyncCampaignsDto } from '../dto';

@Injectable()
export class GoogleAdsIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: GoogleAdsAuthService,
    private readonly clientService: GoogleAdsClientService,
  ) { }

  async connect(tenantId: string, dto: ConnectGoogleAdsDto) {
    // Save API connection
    const connection = await this.prisma.aPIConnection.create({
      data: {
        tenantId,
        platform: 'GOOGLE_ADS',
        credentials: JSON.stringify({
          clientId: dto.clientId,
          clientSecret: dto.clientSecret,
          developerToken: dto.developerToken,
          refreshToken: dto.refreshToken,
          customerId: dto.customerId,
        }),
        isActive: true,
      },
    });

    // Test connection
    let isValid = false;
    try {
      const customer = this.clientService.getCustomer(
        dto.customerId,
        dto.refreshToken,
      );
      // Simple query to verify access
      await customer.query('SELECT customer.id FROM customer LIMIT 1');
      isValid = true;
    } catch (error) {
      console.error('Connection test failed:', error);
      isValid = false;
    }

    if (!isValid) {
      await this.prisma.aPIConnection.update({
        where: { id: connection.id },
        data: { isActive: false },
      });
    }

    return {
      ...connection,
      connectionValid: isValid,
    };
  }

  async syncCampaigns(tenantId: string, dto: SyncCampaignsDto) {
    // Get API connection
    const connection = await this.prisma.aPIConnection.findFirst({
      where: {
        tenantId,
        platform: 'GOOGLE_ADS',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const credentials = JSON.parse(connection.credentials);

    // Fetch campaigns and metrics from Google Ads using GAQL
    const customer = this.clientService.getCustomer(
      credentials.customerId,
      credentials.refreshToken,
    );

    const startDateStr = new Date(dto.startDate).toISOString().split('T')[0];
    const endDateStr = new Date(dto.endDate).toISOString().split('T')[0];

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE campaign.status != 'REMOVED'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
      ORDER BY campaign.id
    `;

    let rows = [];
    try {
      rows = await customer.query(query);
    } catch (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    // Save campaigns to database
    const savedCampaigns = [];
    for (const row of rows) {
      const campaign = row.campaign;
      const metrics = row.metrics;

      const saved = await this.prisma.campaign.upsert({
        where: {
          tenantId_externalId: {
            tenantId,
            externalId: campaign.id.toString(),
          },
        },
        update: {
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: (metrics?.cost_micros || 0) / 1000000,
          startDate: campaign.start_date ? new Date(campaign.start_date) : new Date(),
          endDate: campaign.end_date ? new Date(campaign.end_date) : null,
        },
        create: {
          tenantId,
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: (metrics?.cost_micros || 0) / 1000000,
          startDate: campaign.start_date ? new Date(campaign.start_date) : new Date(),
          endDate: campaign.end_date ? new Date(campaign.end_date) : null,
          externalId: campaign.id.toString(),
        },
      });

      // Save metrics
      await this.prisma.metric.create({
        data: {
          campaignId: saved.id,
          date: new Date(),
          impressions: metrics?.impressions || 0,
          clicks: metrics?.clicks || 0,
          spend: (metrics?.cost_micros || 0) / 1000000,
          revenue: metrics?.conversions_value || 0,
          conversions: metrics?.conversions || 0,
          ctr: (metrics?.ctr || 0) * 100,
          cpc: (metrics?.average_cpc || 0) / 1000000,
          roas: metrics?.cost_micros > 0 ? (metrics?.conversions_value || 0) / ((metrics?.cost_micros || 0) / 1000000) : 0,
        },
      });

      savedCampaigns.push(saved);
    }

    return {
      synced: savedCampaigns.length,
      campaigns: savedCampaigns,
    };
  }

  async getAuthUrl() {
    return {
      authUrl: this.authService.getAuthUrl(),
    };
  }

  async handleCallback(code: string) {
    const tokens = await this.authService.getTokensFromCode(code);
    return tokens;
  }
}

