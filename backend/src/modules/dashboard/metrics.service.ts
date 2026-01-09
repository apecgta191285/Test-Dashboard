import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeUtil } from '../../common/utils/date-range.util';

/**
 * MetricsService - Clean version following Seed Pattern
 * 
 * This service ONLY reads from database.
 * Mock data is seeded by MockDataSeederService during sync, NOT generated on-the-fly.
 */
@Injectable()
export class MetricsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get metrics trends for a specific period
     * @param tenantId - Tenant ID
     * @param period - Time period ('7d', '14d', '30d', '90d')
     * @param compareWith - Compare with previous period (optional)
     */
    async getMetricsTrends(
        tenantId: string,
        period: string,
        compareWith?: 'previous_period',
    ) {
        const days = DateRangeUtil.parsePeriodDays(period);
        const { startDate, endDate } = DateRangeUtil.getDateRange(days);

        // Current period metrics from DB
        const currentMetrics = await this.getAggregatedMetrics(
            tenantId,
            startDate,
            endDate,
        );

        // Previous period metrics (if comparison requested)
        let previousMetrics = null;
        if (compareWith === 'previous_period') {
            const { startDate: prevStartDate, endDate: prevEndDate } = DateRangeUtil.getPreviousPeriodDateRange(startDate, days);

            previousMetrics = await this.getAggregatedMetrics(
                tenantId,
                prevStartDate,
                prevEndDate,
            );
        }

        // Calculate trends
        const trends = this.calculateTrends(currentMetrics, previousMetrics);

        return {
            period,
            startDate,
            endDate,
            current: currentMetrics,
            previous: previousMetrics,
            trends,
        };
    }

    /**
     * Get aggregated metrics for a date range (reads from DB only)
     */
    private async getAggregatedMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date,
    ) {
        const result = await this.prisma.metric.aggregate({
            where: {
                campaign: { tenantId },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                impressions: true,
                clicks: true,
                spend: true,
                conversions: true,
                revenue: true,
            },
            _avg: {
                ctr: true,
                cpc: true,
                roas: true,
            },
        });

        // ✅ Also aggregate Web Analytics (GA4) data for Sessions
        const webResult = await this.prisma.webAnalyticsDaily.aggregate({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                sessions: true,
            },
        });

        const totalImpressions = result._sum.impressions || 0;
        const totalClicks = result._sum.clicks || 0;
        const totalSpend = result._sum.spend || 0;
        const totalConversions = result._sum.conversions || 0;
        const totalRevenue = result._sum.revenue || 0;
        const totalSessions = webResult._sum.sessions || 0;

        return {
            impressions: totalImpressions,
            clicks: totalClicks,
            spend: totalSpend,
            conversions: totalConversions,
            revenue: totalRevenue,
            sessions: totalSessions,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
            roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        };
    }

    /**
     * Calculate trends (percentage change)
     */
    private calculateTrends(current: any, previous: any) {
        if (!previous) return null;

        const calculateChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            impressions: calculateChange(current.impressions, previous.impressions),
            clicks: calculateChange(current.clicks, previous.clicks),
            spend: calculateChange(current.spend, previous.spend),
            conversions: calculateChange(current.conversions, previous.conversions),
            revenue: calculateChange(current.revenue, previous.revenue),
            sessions: calculateChange(current.sessions, previous.sessions),
            ctr: calculateChange(current.ctr, previous.ctr),
            cpc: calculateChange(current.cpc, previous.cpc),
            roas: calculateChange(current.roas, previous.roas),
        };
    }

    /**
     * Get daily metrics for chart data (reads from DB only)
     * @param tenantId - Tenant ID
     * @param period - Time period ('7d', '30d')
     */
    async getDailyMetrics(tenantId: string, period: string) {
        const days = DateRangeUtil.parsePeriodDays(period);
        const { startDate, endDate } = DateRangeUtil.getDateRange(days);

        const metrics = await this.prisma.metric.groupBy({
            by: ['date'],
            where: {
                campaign: { tenantId },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                impressions: true,
                clicks: true,
                spend: true,
                conversions: true,
                revenue: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        return {
            period,
            startDate,
            endDate,
            data: metrics.map((m) => ({
                date: m.date,
                impressions: m._sum.impressions || 0,
                clicks: m._sum.clicks || 0,
                spend: m._sum.spend || 0,
                conversions: m._sum.conversions || 0,
                revenue: m._sum.revenue || 0,
                ctr:
                    m._sum.impressions && m._sum.impressions > 0
                        ? ((m._sum.clicks || 0) / m._sum.impressions) * 100
                        : 0,
                roas:
                    m._sum.spend && m._sum.spend > 0
                        ? (m._sum.revenue || 0) / m._sum.spend
                        : 0,
            })),
        };
    }

    /**
     * Get campaign performance metrics
     */
    async getCampaignPerformance(
        campaignId: string,
        startDate: Date,
        endDate: Date,
    ) {
        const metrics = await this.prisma.metric.findMany({
            where: {
                campaignId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Calculate totals
        const totals = metrics.reduce(
            (acc, m) => ({
                impressions: acc.impressions + (m.impressions || 0),
                clicks: acc.clicks + (m.clicks || 0),
                spend: acc.spend + (m.spend || 0),
                conversions: acc.conversions + (m.conversions || 0),
                revenue: acc.revenue + (m.revenue || 0),
            }),
            {
                impressions: 0,
                clicks: 0,
                spend: 0,
                conversions: 0,
                revenue: 0,
            },
        );

        return {
            campaignId,
            startDate,
            endDate,
            totals: {
                ...totals,
                ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
                cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
                roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
            },
            daily: metrics.map((m) => ({
                date: m.date,
                impressions: m.impressions || 0,
                clicks: m.clicks || 0,
                spend: m.spend || 0,
                conversions: m.conversions || 0,
                revenue: m.revenue || 0,
                ctr: m.ctr || 0,
                cpc: m.cpc || 0,
                roas: m.roas || 0,
            })),
        };
    }
}
