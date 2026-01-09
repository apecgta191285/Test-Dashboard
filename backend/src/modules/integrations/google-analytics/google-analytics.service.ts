import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAnalyticsApiService } from './google-analytics-api.service';

@Injectable()
export class GoogleAnalyticsService {
    private readonly logger = new Logger(GoogleAnalyticsService.name);

    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
        private apiService: GoogleAnalyticsApiService,
    ) { }

    async getBasicMetrics(tenantId: string, startDate: string = '7daysAgo', endDate: string = 'today') {
        try {
            // 1. Get GA4 account from DB for this tenant
            const account = await this.prisma.googleAnalyticsAccount.findFirst({
                where: { tenantId, status: 'ACTIVE' },
            });

            // Return connected: false if not connected
            if (!account) {
                // Change WARN to DEBUG to avoid noise in logs
                this.logger.debug(`No active GA4 account found for tenant ${tenantId}`);
                return {
                    connected: false,
                    totals: null,
                    rows: [],
                    message: 'GA4 ยังไม่ได้เชื่อมต่อ'
                };
            }

            // 2. First, try to get data from WebAnalyticsDaily table (synced data)
            const days = this.parseDateRange(startDate);
            const startDateObj = new Date();
            startDateObj.setDate(startDateObj.getDate() - days);
            startDateObj.setHours(0, 0, 0, 0);

            const syncedData = await this.prisma.webAnalyticsDaily.findMany({
                where: {
                    tenantId,
                    propertyId: account.propertyId,
                    date: { gte: startDateObj }
                },
                orderBy: { date: 'asc' }
            });

            // If we have synced data, use it
            if (syncedData.length > 0) {
                const totals = {
                    activeUsers: syncedData.reduce((sum, d) => sum + d.activeUsers, 0),
                    sessions: syncedData.reduce((sum, d) => sum + d.sessions, 0),
                    newUsers: syncedData.reduce((sum, d) => sum + d.newUsers, 0),
                    engagementRate: syncedData.reduce((sum, d) => sum + d.engagementRate, 0) / syncedData.length,
                };

                return {
                    connected: true,
                    isMockData: syncedData.some(d => d.isMockData),
                    totals,
                    rows: syncedData.map(d => ({
                        date: d.date.toISOString().split('T')[0].replace(/-/g, ''),
                        activeUsers: d.activeUsers,
                        sessions: d.sessions,
                        newUsers: d.newUsers,
                        engagementRate: d.engagementRate,
                    })),
                };
            }

            // 3. If no synced data, try to fetch from GA4 API directly
            this.logger.log(`Fetching GA4 data for property: ${account.propertyId}`);

            const response = await this.apiService.runReport(account, {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'newUsers' },
                    { name: 'engagementRate' },
                ],
            });

            const result = this.transformResponse(response);
            return {
                connected: true,
                isMockData: false,
                ...result
            };
        } catch (error) {
            this.logger.error(`Failed to fetch GA4 data: ${error.message}`);
            // Return connected but with error, don't auto-mock
            return {
                connected: true,
                error: true,
                message: `ไม่สามารถดึงข้อมูล GA4 ได้: ${error.message}`,
                totals: null,
                rows: [],
            };
        }
    }

    /**
     * Parse date range string to number of days
     */
    private parseDateRange(startDate: string): number {
        if (startDate.includes('daysAgo')) {
            return parseInt(startDate.replace('daysAgo', '')) || 7;
        }
        return 7;
    }

    private transformResponse(response: any) {
        const rows = response.rows || [];
        const totals = {
            activeUsers: 0,
            sessions: 0,
            newUsers: 0,
            engagementRate: 0,
        };

        // Calculate totals
        rows.forEach((row: any) => {
            totals.activeUsers += Number(row.metricValues[0].value);
            totals.sessions += Number(row.metricValues[1].value);
            totals.newUsers += Number(row.metricValues[2].value);
        });

        // Average engagement rate
        if (rows.length > 0) {
            const totalEngagement = rows.reduce((acc: number, row: any) => acc + Number(row.metricValues[3].value), 0);
            totals.engagementRate = totalEngagement / rows.length;
        }

        return {
            totals,
            rows: rows.map((row: any) => ({
                date: row.dimensionValues[0].value,
                activeUsers: Number(row.metricValues[0].value),
                sessions: Number(row.metricValues[1].value),
                newUsers: Number(row.metricValues[2].value),
                engagementRate: Number(row.metricValues[3].value),
            })),
        };
    }
}
