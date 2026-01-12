import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { MockDataSeederService } from './mock-data-seeder.service';
import { CampaignStatus, AdPlatform, Prisma } from '@prisma/client';

/**
 * DashboardService - Clean version following Seed Pattern
 * 
 * This service ONLY reads from database.
 * Mock data is seeded by MockDataSeederService during sync, NOT generated on-the-fly.
 */
@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private readonly mockDataSeeder: MockDataSeederService,
  ) { }

  async getSummary(tenantId: string, days: number = 30) {
    const { startDate: currentStartDate, endDate: today } = DateRangeUtil.getDateRange(days);
    const { startDate: previousStartDate } = DateRangeUtil.getPreviousPeriodDateRange(currentStartDate, days);

    // Get campaigns
    const totalCampaigns = await this.prisma.campaign.count({
      where: { tenantId },
    });
    const activeCampaigns = await this.prisma.campaign.count({
      where: {
        tenantId,
        status: CampaignStatus.ACTIVE
      },
    });

    // Get previous period for comparison
    const previousTotalCampaigns = await this.prisma.campaign.count({
      where: {
        tenantId,
        createdAt: {
          lte: currentStartDate,
        },
      },
    });

    // Get metrics for current period (from DB - seeded or real)
    const currentMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: { tenantId },
        date: {
          gte: currentStartDate,
          lte: today,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
      },
    });

    // Get metrics for previous period (for trend calculation)
    const previousMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: { tenantId },
        date: {
          gte: previousStartDate,
          lt: currentStartDate,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
      },
    });

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    // Check if any of the metrics are mock data
    const hasMockData = await this.prisma.metric.findFirst({
      where: {
        campaign: { tenantId },
        date: {
          gte: currentStartDate,
          lte: today,
        },
        isMockData: true,
      },
    });

    return {
      totalCampaigns,
      activeCampaigns,
      totalSpend: currentMetrics._sum.spend || 0,
      totalImpressions: currentMetrics._sum.impressions || 0,
      totalClicks: currentMetrics._sum.clicks || 0,
      totalConversions: currentMetrics._sum.conversions || 0,
      isMockData: !!hasMockData,
      trends: {
        campaigns: calculateTrend(totalCampaigns, previousTotalCampaigns),
        spend: calculateTrend(
          currentMetrics._sum.spend || 0,
          previousMetrics._sum.spend || 0,
        ),
        impressions: calculateTrend(
          currentMetrics._sum.impressions || 0,
          previousMetrics._sum.impressions || 0,
        ),
        clicks: calculateTrend(
          currentMetrics._sum.clicks || 0,
          previousMetrics._sum.clicks || 0,
        ),
      },
    };
  }

  /**
   * Get summary metrics filtered by platform
   * @param platform - 'ALL' | 'GOOGLE_ADS' | 'FACEBOOK' | 'TIKTOK' | 'LINE_ADS'
   */
  async getSummaryByPlatform(tenantId: string, days: number = 30, platform: string = 'ALL') {
    const { startDate: currentStartDate, endDate: today } = DateRangeUtil.getDateRange(days);
    const { startDate: previousStartDate } = DateRangeUtil.getPreviousPeriodDateRange(currentStartDate, days);

    // Build where clause based on platform - properly type cast
    const campaignFilter: Prisma.CampaignWhereInput = { tenantId };
    const campaignFilterActive: Prisma.CampaignWhereInput = { tenantId, status: CampaignStatus.ACTIVE };

    if (platform !== 'ALL') {
      campaignFilter.platform = platform as AdPlatform;
      campaignFilterActive.platform = platform as AdPlatform;
    }

    // Get campaigns filtered by platform
    const totalCampaigns = await this.prisma.campaign.count({
      where: campaignFilter,
    });
    const activeCampaigns = await this.prisma.campaign.count({
      where: campaignFilterActive,
    });

    // Get metrics for current period
    const currentMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: campaignFilter,
        date: { gte: currentStartDate, lte: today },
      },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true },
    });

    // Get metrics for previous period
    const previousMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: campaignFilter,
        date: { gte: previousStartDate, lt: currentStartDate },
      },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true },
    });

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    // Check if mock data
    const hasMockData = await this.prisma.metric.findFirst({
      where: {
        campaign: campaignFilter,
        date: { gte: currentStartDate, lte: today },
        isMockData: true,
      },
    });

    return {
      platform,
      totalCampaigns,
      activeCampaigns,
      totalSpend: currentMetrics._sum.spend || 0,
      totalImpressions: currentMetrics._sum.impressions || 0,
      totalClicks: currentMetrics._sum.clicks || 0,
      totalConversions: currentMetrics._sum.conversions || 0,
      isMockData: !!hasMockData,
      trends: {
        spend: calculateTrend(currentMetrics._sum.spend || 0, previousMetrics._sum.spend || 0),
        impressions: calculateTrend(currentMetrics._sum.impressions || 0, previousMetrics._sum.impressions || 0),
        clicks: calculateTrend(currentMetrics._sum.clicks || 0, previousMetrics._sum.clicks || 0),
      },
    };
  }

  async getTopCampaigns(tenantId: string, limit = 5, days = 30) {
    const { startDate } = DateRangeUtil.getDateRange(days);

    // 1. Aggregate metrics by campaignId using Database GroupBy
    const aggregatedMetrics = await this.prisma.metric.groupBy({
      by: ['campaignId'],
      where: {
        campaign: { tenantId },
        date: { gte: startDate },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
        revenue: true,
      },
      orderBy: {
        _sum: {
          spend: 'desc',
        },
      },
      take: limit,
    });

    // 2. Fetch Campaign Details for the top campaigns
    const campaignIds = aggregatedMetrics.map(m => m.campaignId);
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, name: true, platform: true, status: true },
    });

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    // 3. Combine Data
    return aggregatedMetrics.map(m => {
      const campaign = campaignMap.get(m.campaignId);
      const totals = m._sum;
      const spend = totals.spend || 0;
      const revenue = totals.revenue || 0;
      const impressions = totals.impressions || 0;
      const clicks = totals.clicks || 0;

      return {
        id: m.campaignId,
        name: campaign?.name || 'Unknown',
        platform: campaign?.platform || 'UNKNOWN',
        status: campaign?.status || 'UNKNOWN',
        metrics: {
          impressions,
          clicks,
          spend,
          conversions: totals.conversions || 0,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        },
      };
    });
  }

  async getTrends(tenantId: string, days = 30) {
    const { startDate, endDate: today } = DateRangeUtil.getDateRange(days);

    const metrics = await this.prisma.metric.groupBy({
      by: ['date'],
      where: {
        campaign: { tenantId },
        date: {
          gte: startDate,
          lte: today,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return metrics.map((m) => ({
      date: m.date,
      impressions: m._sum.impressions || 0,
      clicks: m._sum.clicks || 0,
      spend: m._sum.spend || 0,
      conversions: m._sum.conversions || 0,
    }));
  }
  async getOnboardingStatus(tenantId: string) {
    // 1. Check Google Ads Connection
    const googleAdsCount = await this.prisma.googleAdsAccount.count({
      where: { tenantId, status: 'ENABLED' },
    });

    // 2. Check GA4 Connection
    const ga4Count = await this.prisma.googleAnalyticsAccount.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    // 3. Check KPI Targets (in Tenant settings)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    let hasTargets = false;
    if (tenant?.settings) {
      try {
        // Handle both string and object JSON values
        const settings = typeof tenant.settings === 'string'
          ? JSON.parse(tenant.settings as string)
          : tenant.settings;
        hasTargets = !!settings?.kpiTargets;
      } catch (e) {
        // Invalid JSON
      }
    }

    // 4. Check Team Members (User count > 1)
    const userCount = await this.prisma.user.count({
      where: { tenantId },
    });

    return {
      googleAds: googleAdsCount > 0,
      googleAnalytics: ga4Count > 0,
      kpiTargets: hasTargets,
      teamMembers: userCount > 1,
    };
  }

  async seedMockData(tenantId: string) {
    // 1. Seed Google Ads Campaigns
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
    });

    let adsCount = 0;
    for (const campaign of campaigns) {
      const result = await this.mockDataSeeder.seedCampaignMetrics(campaign.id, 90);
      adsCount += result.createdCount;
    }

    // 2. Seed GA4 Properties
    const ga4Accounts = await this.prisma.googleAnalyticsAccount.findMany({
      where: { tenantId },
    });

    let ga4Count = 0;
    for (const account of ga4Accounts) {
      if (account.propertyId) {
        const result = await this.mockDataSeeder.seedGA4Metrics(tenantId, account.propertyId, 90);
        ga4Count += result.createdCount;
      }
    }

    return {
      success: true,
      seeded: {
        adsMetrics: adsCount,
        ga4Metrics: ga4Count,
      }
    };
  }

  async getPerformanceByPlatform(tenantId: string, days = 30) {
    const { startDate, endDate: today } = DateRangeUtil.getDateRange(days);

    // 1. Get Campaign Metrics (Google Ads, Facebook Ads)
    const campaignMetrics = await this.prisma.metric.groupBy({
      by: ['campaignId'],
      where: {
        campaign: { tenantId },
        date: {
          gte: startDate,
          lte: today,
        },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // Fetch campaign details to map to platform
    const campaignIds = campaignMetrics.map(m => m.campaignId);
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, platform: true },
    });

    const campaignPlatformMap = new Map(campaigns.map(c => [c.id, c.platform]));

    // Aggregate by platform
    const platformData = {
      GOOGLE_ADS: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
      FACEBOOK: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
      TIKTOK: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
      LINE_ADS: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
    };

    for (const metric of campaignMetrics) {
      const platform = campaignPlatformMap.get(metric.campaignId);
      if (platform && platformData[platform]) {
        platformData[platform].spend += metric._sum.spend || 0;
        platformData[platform].impressions += metric._sum.impressions || 0;
        platformData[platform].clicks += metric._sum.clicks || 0;
        platformData[platform].conversions += metric._sum.conversions || 0;
      }
    }

    // 2. Get GA4 Metrics (WebAnalyticsDaily)
    const ga4Metrics = await this.prisma.webAnalyticsDaily.aggregate({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: today,
        },
      },
      _sum: {
        sessions: true,
        activeUsers: true,
        newUsers: true,
        screenPageViews: true,
      },
    });

    // 3. Format Response
    return [
      {
        platform: 'GOOGLE_ADS',
        spend: platformData.GOOGLE_ADS.spend,
        impressions: platformData.GOOGLE_ADS.impressions,
        clicks: platformData.GOOGLE_ADS.clicks,
        conversions: platformData.GOOGLE_ADS.conversions,
      },
      {
        platform: 'FACEBOOK',
        spend: platformData.FACEBOOK.spend,
        impressions: platformData.FACEBOOK.impressions,
        clicks: platformData.FACEBOOK.clicks,
        conversions: platformData.FACEBOOK.conversions,
      },
      {
        platform: 'TIKTOK',
        spend: platformData.TIKTOK.spend,
        impressions: platformData.TIKTOK.impressions,
        clicks: platformData.TIKTOK.clicks,
        conversions: platformData.TIKTOK.conversions,
      },
      {
        platform: 'LINE_ADS',
        spend: platformData.LINE_ADS.spend,
        impressions: platformData.LINE_ADS.impressions,
        clicks: platformData.LINE_ADS.clicks,
        conversions: platformData.LINE_ADS.conversions,
      },
      {
        platform: 'GOOGLE_ANALYTICS',
        spend: 0, // GA4 doesn't track spend directly here
        impressions: ga4Metrics._sum.screenPageViews || 0, // Proxy for impressions
        clicks: ga4Metrics._sum.sessions || 0, // Proxy for clicks/visits
        conversions: 0, // Could map key events if available
      },
    ];
  }

  async clearMockData(tenantId: string) {
    // 1. Delete Mock Metrics for Tenant's Campaigns
    const metricsResult = await this.prisma.metric.deleteMany({
      where: {
        campaign: { tenantId },
        isMockData: true,
      },
    });

    // 2. Delete Mock WebAnalytics (GA4) for Tenant
    const ga4Result = await this.prisma.webAnalyticsDaily.deleteMany({
      where: {
        tenantId,
        isMockData: true,
      },
    });

    return {
      success: true,
      cleared: {
        adsMetrics: metricsResult.count,
        ga4Metrics: ga4Result.count,
      }
    };
  }
}
