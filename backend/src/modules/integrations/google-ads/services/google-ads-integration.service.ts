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
  ) {}

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
    const isValid = await this.clientService.testConnection({
      clientId: dto.clientId,
      clientSecret: dto.clientSecret,
      developerToken: dto.developerToken,
      refreshToken: dto.refreshToken,
      customerId: dto.customerId,
    });

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

    // Fetch campaigns from Google Ads
    const campaigns = await this.clientService.getCampaigns({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      developerToken: credentials.developerToken,
      refreshToken: credentials.refreshToken,
      customerId: dto.customerId || credentials.customerId,
    });

    // Save campaigns to database
    const savedCampaigns = [];
    for (const campaign of campaigns) {
      const saved = await this.prisma.campaign.upsert({
        where: {
          tenantId_externalId: {
            tenantId,
            externalId: campaign.id,
          },
        },
        update: {
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: campaign.budget,
          startDate: new Date(campaign.startDate),
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
        },
        create: {
          tenantId,
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: campaign.budget,
          startDate: new Date(campaign.startDate),
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
          externalId: campaign.id,
        },
      });

      // Fetch and save metrics
      const metrics = await this.clientService.getCampaignMetrics(
        {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          developerToken: credentials.developerToken,
          refreshToken: credentials.refreshToken,
          customerId: dto.customerId || credentials.customerId,
        },
        campaign.id,
        dto.startDate,
        dto.endDate,
      );

      await this.prisma.metric.create({
        data: {
          campaignId: saved.id,
          date: new Date(),
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          spend: metrics.cost,
          revenue: metrics.conversionValue,
          conversions: metrics.conversions,
          ctr: (metrics.clicks / metrics.impressions) * 100,
          cpc: metrics.cost / metrics.clicks,
          roas: metrics.conversionValue / metrics.cost,
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

