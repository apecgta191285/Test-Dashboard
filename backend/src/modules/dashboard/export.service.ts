import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { Parser } from 'json2csv';
import * as PDFDocument from 'pdfkit';

// ============================================================================
// Constants
// ============================================================================

/** UTF-8 BOM for Excel Thai language support */
const UTF8_BOM = '\uFEFF';

/** CSV column headers for empty export */
const CSV_HEADERS = [
    'Campaign ID',
    'Campaign Name',
    'Platform',
    'Status',
    'Google Ads Account',
    'Account ID',
    'Budget',
    'Impressions',
    'Clicks',
    'Spend ($)',
    'Conversions',
    'Revenue ($)',
    'CTR (%)',
    'CPC ($)',
    'ROAS',
    'Start Date',
    'End Date',
    'Created At',
];

/** Characters that trigger formula execution in Excel (CSV Injection) */
const DANGEROUS_CSV_CHARS = /^[=+\-@\t\r]/;

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

// ============================================================================
// Export Service
// ============================================================================

@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly metricsService: MetricsService,
    ) { }

    // ========================================================================
    // CSV Export
    // ========================================================================

    /**
     * Export campaigns to CSV
     * @param tenantId - Tenant ID
     * @param filters - Optional filters
     * @throws InternalServerErrorException on any failure
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
        try {
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

            // ✅ FIX CRITICAL-001: Handle empty data gracefully
            if (!campaigns || campaigns.length === 0) {
                this.logger.warn(`No campaigns found for tenant ${tenantId}`);
                const emptyCSV = CSV_HEADERS.join(',') + '\n';
                return Buffer.from(UTF8_BOM + emptyCSV, 'utf-8');
            }

            // Transform data for CSV
            const data = campaigns.map((c) => {
                const latestMetric = c.metrics?.[0];
                return {
                    'Campaign ID': this.sanitizeCSVValue(c.externalId || c.id),
                    'Campaign Name': this.sanitizeCSVValue(c.name),
                    Platform: this.sanitizeCSVValue(c.platform),
                    Status: this.sanitizeCSVValue(c.status),
                    'Google Ads Account': this.sanitizeCSVValue(
                        c.googleAdsAccount?.accountName || 'N/A',
                    ),
                    'Account ID': this.sanitizeCSVValue(
                        c.googleAdsAccount?.customerId || 'N/A',
                    ),
                    Budget: c.budget ?? 0,
                    Impressions: latestMetric?.impressions ?? 0,
                    Clicks: latestMetric?.clicks ?? 0,
                    'Spend ($)': (latestMetric?.spend ?? 0).toFixed(2),
                    Conversions: latestMetric?.conversions ?? 0,
                    'Revenue ($)': (latestMetric?.revenue ?? 0).toFixed(2),
                    'CTR (%)': (latestMetric?.ctr ?? 0).toFixed(2),
                    'CPC ($)': (latestMetric?.cpc ?? 0).toFixed(2),
                    ROAS: (latestMetric?.roas ?? 0).toFixed(2),
                    // ✅ FIX HIGH-001: Safe date formatting with null guards
                    'Start Date': this.formatDateSafe(c.startDate),
                    'End Date': this.formatDateSafe(c.endDate),
                    'Created At': this.formatDateSafe(c.createdAt),
                };
            });

            // Generate CSV
            const parser = new Parser({ fields: CSV_HEADERS });
            const csv = parser.parse(data);

            // ✅ FIX HIGH-002: Add UTF-8 BOM for Thai language support in Excel
            return Buffer.from(UTF8_BOM + csv, 'utf-8');

        } catch (error) {
            // ✅ FIX CRITICAL-002: Proper error logging and handling
            this.logger.error(
                `CSV Export failed for tenant ${tenantId}`,
                error instanceof Error ? error.stack : error,
            );
            throw new InternalServerErrorException(
                'Failed to export campaigns to CSV. Please try again later.',
            );
        }
    }

    // ========================================================================
    // PDF Export
    // ========================================================================

    /**
     * Export metrics to PDF
     * @param tenantId - Tenant ID
     * @param period - Time period ('7d' or '30d')
     * @throws InternalServerErrorException on any failure
     */
    async exportMetricsToPDF(
        tenantId: string,
        period: '7d' | '30d',
    ): Promise<Buffer> {
        try {
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
                .text(`Tenant: ${tenant?.name ?? tenantId}`, { align: 'center' });
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

            // ✅ Safe access with nullish coalescing
            const current = trends?.current ?? {
                impressions: 0,
                clicks: 0,
                spend: 0,
                conversions: 0,
                revenue: 0,
                ctr: 0,
                roas: 0,
            };
            const previous = trends?.previous;
            const trendData = trends?.trends;

            const summary = [
                ['Metric', 'Current', 'Previous', 'Change'],
                [
                    'Impressions',
                    current.impressions.toLocaleString(),
                    previous?.impressions?.toLocaleString() ?? 'N/A',
                    trendData?.impressions != null
                        ? `${trendData.impressions > 0 ? '+' : ''}${trendData.impressions.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'Clicks',
                    current.clicks.toLocaleString(),
                    previous?.clicks?.toLocaleString() ?? 'N/A',
                    trendData?.clicks != null
                        ? `${trendData.clicks > 0 ? '+' : ''}${trendData.clicks.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'Spend',
                    `$${current.spend.toFixed(2)}`,
                    previous?.spend != null ? `$${previous.spend.toFixed(2)}` : 'N/A',
                    trendData?.spend != null
                        ? `${trendData.spend > 0 ? '+' : ''}${trendData.spend.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'Conversions',
                    current.conversions.toFixed(0),
                    previous?.conversions?.toFixed(0) ?? 'N/A',
                    trendData?.conversions != null
                        ? `${trendData.conversions > 0 ? '+' : ''}${trendData.conversions.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'Revenue',
                    `$${current.revenue.toFixed(2)}`,
                    previous?.revenue != null ? `$${previous.revenue.toFixed(2)}` : 'N/A',
                    trendData?.revenue != null
                        ? `${trendData.revenue > 0 ? '+' : ''}${trendData.revenue.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'CTR',
                    `${current.ctr.toFixed(2)}%`,
                    previous?.ctr != null ? `${previous.ctr.toFixed(2)}%` : 'N/A',
                    trendData?.ctr != null
                        ? `${trendData.ctr > 0 ? '+' : ''}${trendData.ctr.toFixed(1)}%`
                        : 'N/A',
                ],
                [
                    'ROAS',
                    current.roas.toFixed(2),
                    previous?.roas?.toFixed(2) ?? 'N/A',
                    trendData?.roas != null
                        ? `${trendData.roas > 0 ? '+' : ''}${trendData.roas.toFixed(1)}%`
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

            // ✅ Safe access to dailyMetrics.data
            const dailyData = dailyMetrics?.data ?? [];
            if (dailyData.length === 0) {
                doc.text('No daily metrics available for this period.');
            } else {
                dailyData.slice(0, 10).forEach((day, index) => {
                    if (index > 0 && index % 5 === 0) doc.moveDown();
                    doc.text(
                        `${this.formatDateSafe(day?.date)}: ${(day?.clicks ?? 0).toLocaleString()} clicks, $${(day?.spend ?? 0).toFixed(2)} spend, ${day?.conversions ?? 0} conversions`,
                    );
                });
            }

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

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                doc.on('error', (err) => {
                    reject(err);
                });
            });

        } catch (error) {
            // ✅ FIX CRITICAL-002: Proper error logging and handling
            this.logger.error(
                `PDF Export failed for tenant ${tenantId}`,
                error instanceof Error ? error.stack : error,
            );
            throw new InternalServerErrorException(
                'Failed to export metrics to PDF. Please try again later.',
            );
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * ✅ FIX CRITICAL-003: Sanitize CSV values to prevent CSV Injection attacks
     * Escapes dangerous characters that could trigger formula execution in Excel
     * @param value - Value to sanitize
     * @returns Sanitized string safe for CSV
     */
    private sanitizeCSVValue(value: unknown): string {
        if (value == null) {
            return '';
        }

        const strValue = String(value);

        // Prefix with single quote if starts with dangerous characters
        // This prevents Excel from interpreting it as a formula
        if (DANGEROUS_CSV_CHARS.test(strValue)) {
            return "'" + strValue;
        }

        return strValue;
    }

    /**
     * ✅ FIX HIGH-001: Safely format date with null/undefined guards
     * @param date - Date to format (may be null/undefined)
     * @returns Formatted date string or 'N/A'
     */
    private formatDateSafe(date: Date | null | undefined): string {
        if (!date) {
            return 'N/A';
        }

        try {
            return date.toISOString().split('T')[0];
        } catch {
            return 'N/A';
        }
    }
}
