import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getSummary(tenantId: string) {
    // Get current date range
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get campaigns
    const totalCampaigns = await this.prisma.campaign.count({
      where: { tenantId },
    });
    const activeCampaigns = await this.prisma.campaign.count({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
    });

    // Get previous period for comparison
    const previousTotalCampaigns = await this.prisma.campaign.count({
      where: {
        tenantId,
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    // Get metrics for last 30 days
    const currentMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: { tenantId },
        date: {
          gte: thirtyDaysAgo,
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

    // Get metrics for previous 30 days (for trend calculation)
    const previousMetrics = await this.prisma.metric.aggregate({
      where: {
        campaign: { tenantId },
        date: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
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

    return {
      totalCampaigns,
      activeCampaigns,
      totalSpend: currentMetrics._sum.spend || 0,
      totalImpressions: currentMetrics._sum.impressions || 0,
      totalClicks: currentMetrics._sum.clicks || 0,
      totalConversions: currentMetrics._sum.conversions || 0,
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

  async getTopCampaigns(tenantId: string, limit = 5) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          where: {
            date: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    // Calculate total metrics per campaign
    const campaignsWithTotals = campaigns.map((campaign) => {
      const totals = campaign.metrics.reduce(
        (acc, metric) => ({
          impressions: acc.impressions + metric.impressions,
          clicks: acc.clicks + metric.clicks,
          spend: acc.spend + metric.spend,
          conversions: acc.conversions + metric.conversions,
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
      );

      // Calculate revenue from metrics (if available)
      const revenue = campaign.metrics.reduce(
        (acc, metric) => acc + (metric.revenue || 0),
        0,
      );

      // Calculate ROAS
      const roas = totals.spend > 0 ? revenue / totals.spend : 0;
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform || 'UNKNOWN',
        status: campaign.status,
        metrics: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend,
          conversions: totals.conversions,
          revenue: revenue,
          roas: roas,
          ctr: ctr,
        },
      };
    });

    // Sort by spend and return top N
    return campaignsWithTotals
      .sort((a, b) => b.metrics.spend - a.metrics.spend)
      .slice(0, limit);
  }

  async getTrends(tenantId: string, days = 30) {
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

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
}
