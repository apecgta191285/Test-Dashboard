import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleAdsApi, enums } from 'google-ads-api';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';
import { GoogleAdsClientService } from './services/google-ads-client.service';

@Injectable()
export class GoogleAdsCampaignService {
  private readonly logger = new Logger(GoogleAdsCampaignService.name);
  private oauth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly googleAdsClientService: GoogleAdsClientService,
  ) {
    // Initialize OAuth2 client for token refresh
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );
  }

  /**
   * Refresh access token if expired
   */
  private async refreshTokenIfNeeded(account: any): Promise<void> {
    const now = new Date();
    const shouldRefresh =
      !account.tokenExpiresAt ||
      account.tokenExpiresAt < now ||
      !account.accessToken;

    if (shouldRefresh && account.refreshToken) {
      try {
        this.logger.log(`Refreshing token for account ${account.id}`);
        this.oauth2Client.setCredentials({
          refresh_token: account.refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        await this.prisma.googleAdsAccount.update({
          where: { id: account.id },
          data: {
            accessToken: credentials.access_token,
            tokenExpiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : null,
          },
        });

        // Update account object
        account.accessToken = credentials.access_token;
        account.tokenExpiresAt = credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null;

        this.logger.log(`Token refreshed successfully for account ${account.id}`);
      } catch (error: any) {
        this.logger.error(`Failed to refresh token: ${error.message}`);
        throw new BadRequestException(
          'Token expired and refresh failed. Please reconnect your Google Ads account.',
        );
      }
    }
  }

  /**
   * Fetch campaigns from Google Ads API
   */
  /**
   * Fetch campaigns from Google Ads API
   */
  async fetchCampaigns(accountId: string) {
    // 1. Get Google Ads account from database
    const account = await this.prisma.googleAdsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.refreshToken) {
      throw new Error('Google Ads account not found or not connected');
    }

    // 2. Get Customer instance from GoogleAdsClientService
    const customer = this.googleAdsClientService.getCustomer(
      account.customerId,
      account.refreshToken,
    );

    // 3. GAQL Query (Google Ads Query Language)
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      ORDER BY campaign.id
    `;

    try {
      // 4. Execute query
      const results = await customer.query(query);

      // Helper function to map Google Ads status to string
      const mapStatus = (status: number): string => {
        switch (status) {
          case 2:
            return 'ENABLED';
          case 3:
            return 'PAUSED';
          case 4:
            return 'REMOVED';
          default:
            return 'UNKNOWN';
        }
      };

      // 5. Transform results
      return {
        accountId: account.id,
        accountName: account.customerName || account.customerId,
        customerId: account.customerId,
        campaigns: results.map((row: any) => ({
          externalId: row.campaign.id.toString(),
          name: row.campaign.name,
          status: mapStatus(row.campaign.status),
          platform: 'GOOGLE_ADS',
          channelType: row.campaign.advertising_channel_type,
          metrics: {
            clicks: row.metrics?.clicks || 0,
            impressions: row.metrics?.impressions || 0,
            cost: (row.metrics?.cost_micros || 0) / 1000000, // Convert micros to dollars
            conversions: row.metrics?.conversions || 0,
            ctr: row.metrics?.ctr || 0,
          },
        })),
        totalCampaigns: results.length,
      };
    } catch (error) {
      console.error('Google Ads API Error:', error);
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
  }

  /**
   * Sync campaigns to database
   */
  /**
   * Sync campaigns to database
   */
  async syncCampaigns(accountId: string) {
    // 1. Fetch campaigns from Google Ads
    const result = await this.fetchCampaigns(accountId);
    const campaigns = result.campaigns;

    // 2. Get Google Ads account
    const account = await this.prisma.googleAdsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Google Ads account not found');
    }

    // 3. Sync to database
    const syncedCampaigns = [];

    for (const campaign of campaigns) {
      // Check if campaign already exists
      const existing = await this.prisma.campaign.findFirst({
        where: {
          externalId: campaign.externalId,
          platform: 'GOOGLE_ADS',
        },
      });

      if (existing) {
        // Update existing campaign
        const updated = await this.prisma.campaign.update({
          where: { id: existing.id },
          data: {
            name: campaign.name,
            status: campaign.status,
            // Update metrics if needed
          },
        });
        syncedCampaigns.push(updated);
      } else {
        // Create new campaign
        const created = await this.prisma.campaign.create({
          data: {
            name: campaign.name,
            platform: 'GOOGLE_ADS',
            status: campaign.status,
            externalId: campaign.externalId,
            googleAdsAccountId: accountId,
            tenant: {
              connect: { id: account.tenantId },
            },
            // Add metrics if needed
          },
        });
        syncedCampaigns.push(created);
      }
    }

    return {
      synced: syncedCampaigns.length,
      campaigns: syncedCampaigns,
    };
  }

  /**
   * Map Google Ads campaign status to our status
   */
  private mapCampaignStatus(googleStatus: string): string {
    const statusMap: Record<string, string> = {
      ENABLED: 'ACTIVE',
      PAUSED: 'PAUSED',
      REMOVED: 'DELETED',
    };
    return statusMap[googleStatus] || 'PAUSED';
  }

  /**
   * Get all connected accounts
   */
  async getAccounts() {
    const accounts = await this.prisma.googleAdsAccount.findMany({
      select: {
        id: true,
        customerName: true,
        customerId: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts;
  }

  /**
   * Fetch campaign metrics from Google Ads API for a specific date range
   */
  async fetchCampaignMetrics(
    accountId: string,
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.log(
      `Fetching metrics for campaign ${campaignId} from ${startDate.toISOString()} to ${endDate.toISOString()} `,
    );

    // Get account from database
    const account = await this.prisma.googleAdsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Google Ads account not found: ${accountId} `);
    }

    if (!account.refreshToken) {
      throw new BadRequestException('Account not authenticated. Please reconnect your Google Ads account.');
    }

    // Refresh token if needed
    await this.refreshTokenIfNeeded(account);

    try {
      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: this.configService.get('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
        developer_token: this.configService.get('GOOGLE_ADS_DEVELOPER_TOKEN'),
      });

      // Create customer instance
      const customer = client.Customer({
        customer_id: account.customerId,
        refresh_token: account.refreshToken,
        login_customer_id: this.configService.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
      });

      // Format dates for Google Ads API (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Query metrics with date segments
      const metrics = await customer.query(`
    SELECT
    campaign.id,
      campaign.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cpm
        FROM campaign
    WHERE
    campaign.id = ${campaignId}
          AND campaign.status != 'REMOVED'
          AND segments.date >= '${startDateStr}'
          AND segments.date <= '${endDateStr}'
        ORDER BY segments.date ASC
      `);

      this.logger.log(`Fetched ${metrics.length} metric records`);

      // Transform metrics
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
        cpm: (row.metrics?.cpm || 0) / 1000000, // Convert micros to currency
      }));
    } catch (error: any) {
      // Better error logging
      let errorMessage = 'Unknown error';
      let errorCode = null;

      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.toString && error.toString() !== '[object Object]') {
          errorMessage = error.toString();
        }

        errorCode = error.code || error.status || null;

        // Handle specific Google Ads API errors
        if (errorMessage === 'invalid_grant') {
          errorMessage = 'Token expired or invalid. Please reconnect your Google Ads account.';
          this.logger.warn(`Token expired for account ${accountId}.User needs to reconnect.`);
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          errorMessage = 'Permission denied. Please check account access permissions.';
        } else if (errorMessage.includes('developer_token')) {
          errorMessage = 'Invalid developer token. Please check GOOGLE_ADS_DEVELOPER_TOKEN.';
        } else if (errorMessage.includes('customer_id')) {
          errorMessage = 'Invalid customer ID. Please check customer ID format.';
        }
      }

      const errorDetails = {
        message: errorMessage,
        code: errorCode,
        name: error?.name,
        accountId: accountId,
        campaignId: campaignId,
      };

      this.logger.error(`Error fetching metrics: ${errorMessage} `);
      this.logger.error(`Error details: ${JSON.stringify(errorDetails, null, 2)} `);

      if (error?.stack) {
        this.logger.error(`Stack trace: ${error.stack} `);
      }

      // Throw more descriptive error
      const descriptiveError = new Error(`Failed to fetch metrics: ${errorMessage} `);
      (descriptiveError as any).code = errorCode;
      (descriptiveError as any).originalError = error;
      throw descriptiveError;
    }
  }

  /**
   * Sync campaign metrics to database
   * This will fetch metrics from Google Ads API and save them to Metric table
   */
  async syncCampaignMetrics(
    accountId: string,
    campaignId: string,
    days: number = 30,
  ) {
    this.logger.log(
      `Syncing metrics for campaign ${campaignId}(last ${days} days)`,
    );

    // Get campaign from database
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        googleAdsAccountId: accountId,
      },
    });

    if (!campaign) {
      throw new NotFoundException(
        `Campaign ${campaignId} not found for account ${accountId}`,
      );
    }

    if (!campaign.externalId) {
      throw new Error(`Campaign ${campaignId} has no externalId(Google Ads ID)`);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch metrics from Google Ads API
    const metricsData = await this.fetchCampaignMetrics(
      accountId,
      campaign.externalId,
      startDate,
      endDate,
    );

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Save each metric record
    for (const metric of metricsData) {
      try {
        // Calculate ROAS (Return on Ad Spend)
        const roas =
          metric.cost > 0 ? metric.conversionValue / metric.cost : 0;

        // Upsert metric (unique by campaignId + date)
        // Use upsert to handle both create and update
        const metricData = {
          impressions: metric.impressions,
          clicks: metric.clicks,
          spend: metric.cost,
          conversions: Math.round(metric.conversions),
          revenue: metric.conversionValue,
          ctr: metric.ctr,
          cpc: metric.cpc,
          cpm: metric.cpm,
          roas: roas,
        };

        const existing = await this.prisma.metric.findFirst({
          where: {
            campaignId: campaign.id,
            date: metric.date,
          },
        });

        if (existing) {
          // Update existing metric
          await this.prisma.metric.update({
            where: { id: existing.id },
            data: metricData,
          });
          updatedCount++;
        } else {
          // Create new metric
          await this.prisma.metric.create({
            data: {
              campaignId: campaign.id,
              date: metric.date,
              ...metricData,
            },
          });
          createdCount++;
        }

        syncedCount++;
      } catch (error) {
        this.logger.error(
          `Error syncing metric for date ${metric.date.toISOString()}: ${error.message} `,
        );
      }
    }

    // Update campaign last synced time
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(
      `Metrics sync completed: ${syncedCount} total, ${createdCount} created, ${updatedCount} updated`,
    );

    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      syncedCount,
      createdCount,
      updatedCount,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Sync metrics for all campaigns in an account
   */
  async syncAllCampaignMetrics(accountId: string, days: number = 30) {
    this.logger.log(`Syncing metrics for all campaigns in account ${accountId} `);

    // Get account
    const account = await this.prisma.googleAdsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Google Ads account not found: ${accountId} `);
    }

    // Get all campaigns for this account
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        googleAdsAccountId: accountId,
        externalId: { not: null },
      },
    });

    this.logger.log(`Found ${campaigns.length} campaigns to sync`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Sync metrics for each campaign
    for (const campaign of campaigns) {
      try {
        const result = await this.syncCampaignMetrics(
          accountId,
          campaign.id,
          days,
        );
        results.push(result);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Error syncing metrics for campaign ${campaign.id}: ${error.message} `,
        );
        results.push({
          success: false,
          campaignId: campaign.id,
          campaignName: campaign.name,
          error: error.message,
        });
        errorCount++;
      }
    }

    // Update account last sync time
    await this.prisma.googleAdsAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    return {
      success: true,
      accountId,
      totalCampaigns: campaigns.length,
      successCount,
      errorCount,
      results,
      lastSyncedAt: new Date(),
    };
  }
}
