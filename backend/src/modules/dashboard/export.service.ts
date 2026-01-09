import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { Parser } from 'json2csv';
import * as PDFDocument from 'pdfkit';

const PDF_LAYOUT = {
    MARGIN: 50,
    COLUMN_WIDTHS: {
        COL1: 50,
        COL2: 200,
        COL3: 320,
        COL4: 440,
    },
    ROW_HEIGHT: 25,
};

@Injectable()
export class ExportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly metricsService: MetricsService,
    ) { }

    /**
     * Export campaigns to CSV
     * @param tenantId - Tenant ID
     * @param filters - Optional filters
     */
    async exportCampaignsToCSV(
        tenantId: string,
        filters?: {
            platform?: string;
            status?: string;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<Buffer> {
        // Build where clause
        const where: any = { tenantId };
        if (filters?.platform) where.platform = filters.platform;
        if (filters?.status) where.status = filters.status;

        // Get campaigns with latest metrics
        const campaigns = await this.prisma.campaign.findMany({
            where,
            include: {
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1, // Latest metrics only
                },
                googleAdsAccount: {
                    select: {
                        accountName: true,
                        customerId: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Transform data for CSV
        const data = campaigns.map((c) => {
            const latestMetric = c.metrics[0];
            return {
                'Campaign ID': c.externalId || c.id,
                'Campaign Name': c.name,
                Platform: c.platform,
                Status: c.status,
                'Google Ads Account': c.googleAdsAccount?.accountName || 'N/A',
                'Account ID': c.googleAdsAccount?.customerId || 'N/A',
                Budget: c.budget || 0,
                Impressions: latestMetric?.impressions || 0,
                Clicks: latestMetric?.clicks || 0,
                'Spend ($)': (latestMetric?.spend || 0).toFixed(2),
                Conversions: latestMetric?.conversions || 0,
                'Revenue ($)': (latestMetric?.revenue || 0).toFixed(2),
                'CTR (%)': (latestMetric?.ctr || 0).toFixed(2),
                'CPC ($)': (latestMetric?.cpc || 0).toFixed(2),
                ROAS: (latestMetric?.roas || 0).toFixed(2),
                'Start Date': c.startDate?.toISOString().split('T')[0] || 'N/A',
                'End Date': c.endDate?.toISOString().split('T')[0] || 'N/A',
                'Created At': c.createdAt.toISOString().split('T')[0],
            };
        });

        // Generate CSV
        const parser = new Parser();
        const csv = parser.parse(data);

        return Buffer.from(csv, 'utf-8');
    }

    /**
     * Export metrics to PDF
     * @param tenantId - Tenant ID
     * @param period - Time period ('7d' or '30d')
     */
    async exportMetricsToPDF(
        tenantId: string,
        period: '7d' | '30d',
    ): Promise<Buffer> {
        // Get metrics data
        const trends = await this.metricsService.getMetricsTrends(
            tenantId,
            period,
            'previous_period',
        );

        const dailyMetrics = await this.metricsService.getDailyMetrics(
            tenantId,
            period,
        );

        // Get tenant info
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        // Create PDF
        const doc = new PDFDocument({ margin: PDF_LAYOUT.MARGIN });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));

        // Header
        doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('Campaign Performance Report', { align: 'center' });
        doc.moveDown();

        doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Tenant: ${tenant?.name || tenantId}`, { align: 'center' });
        doc.text(`Period: ${period === '7d' ? 'Last 7 Days' : 'Last 30 Days'}`, {
            align: 'center',
        });
        doc.text(
            `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            { align: 'center' },
        );
        doc.moveDown(2);

        // Summary Section
        doc.fontSize(18).font('Helvetica-Bold').text('Summary');
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        const summary = [
            ['Metric', 'Current', 'Previous', 'Change'],
            [
                'Impressions',
                trends.current.impressions.toLocaleString(),
                trends.previous?.impressions.toLocaleString() || 'N/A',
                trends.trends?.impressions
                    ? `${trends.trends.impressions > 0 ? '+' : ''}${trends.trends.impressions.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'Clicks',
                trends.current.clicks.toLocaleString(),
                trends.previous?.clicks.toLocaleString() || 'N/A',
                trends.trends?.clicks
                    ? `${trends.trends.clicks > 0 ? '+' : ''}${trends.trends.clicks.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'Spend',
                `$${trends.current.spend.toFixed(2)}`,
                trends.previous ? `$${trends.previous.spend.toFixed(2)}` : 'N/A',
                trends.trends?.spend
                    ? `${trends.trends.spend > 0 ? '+' : ''}${trends.trends.spend.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'Conversions',
                trends.current.conversions.toFixed(0),
                trends.previous?.conversions.toFixed(0) || 'N/A',
                trends.trends?.conversions
                    ? `${trends.trends.conversions > 0 ? '+' : ''}${trends.trends.conversions.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'Revenue',
                `$${trends.current.revenue.toFixed(2)}`,
                trends.previous ? `$${trends.previous.revenue.toFixed(2)}` : 'N/A',
                trends.trends?.revenue
                    ? `${trends.trends.revenue > 0 ? '+' : ''}${trends.trends.revenue.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'CTR',
                `${trends.current.ctr.toFixed(2)}%`,
                trends.previous ? `${trends.previous.ctr.toFixed(2)}%` : 'N/A',
                trends.trends?.ctr
                    ? `${trends.trends.ctr > 0 ? '+' : ''}${trends.trends.ctr.toFixed(1)}%`
                    : 'N/A',
            ],
            [
                'ROAS',
                trends.current.roas.toFixed(2),
                trends.previous?.roas.toFixed(2) || 'N/A',
                trends.trends?.roas
                    ? `${trends.trends.roas > 0 ? '+' : ''}${trends.trends.roas.toFixed(1)}%`
                    : 'N/A',
            ],
        ];

        // Draw table
        const tableTop = doc.y;
        const col1X = PDF_LAYOUT.COLUMN_WIDTHS.COL1;
        const col2X = PDF_LAYOUT.COLUMN_WIDTHS.COL2;
        const col3X = PDF_LAYOUT.COLUMN_WIDTHS.COL3;
        const col4X = PDF_LAYOUT.COLUMN_WIDTHS.COL4;
        const rowHeight = PDF_LAYOUT.ROW_HEIGHT;

        // Table header
        doc.font('Helvetica-Bold');
        doc.text(summary[0][0], col1X, tableTop);
        doc.text(summary[0][1], col2X, tableTop);
        doc.text(summary[0][2], col3X, tableTop);
        doc.text(summary[0][3], col4X, tableTop);

        // Table rows
        doc.font('Helvetica');
        for (let i = 1; i < summary.length; i++) {
            const y = tableTop + i * rowHeight;
            doc.text(summary[i][0], col1X, y);
            doc.text(summary[i][1], col2X, y);
            doc.text(summary[i][2], col3X, y);
            doc.text(summary[i][3], col4X, y);
        }

        doc.moveDown(summary.length + 2);

        // Daily Metrics Section
        doc.fontSize(18).font('Helvetica-Bold').text('Daily Metrics');
        doc.moveDown();

        doc.fontSize(10).font('Helvetica');
        dailyMetrics.data.slice(0, 10).forEach((day, index) => {
            if (index > 0 && index % 5 === 0) doc.moveDown();
            doc.text(
                `${day.date.toISOString().split('T')[0]}: ${day.clicks.toLocaleString()} clicks, $${day.spend.toFixed(2)} spend, ${day.conversions} conversions`,
            );
        });

        // Footer
        doc
            .fontSize(8)
            .font('Helvetica')
            .text(
                'This report is generated automatically by RGA Dashboard',
                PDF_LAYOUT.MARGIN,
                doc.page.height - PDF_LAYOUT.MARGIN,
                { align: 'center' },
            );

        doc.end();

        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }
}
