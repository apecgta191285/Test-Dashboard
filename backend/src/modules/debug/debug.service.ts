import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DebugService {
    private readonly logger = new Logger(DebugService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Clear all mock data from the database
     */
    async clearMockData() {
        this.logger.log('Clearing all mock data...');

        // Delete from Metric table
        const metricsResult = await this.prisma.metric.deleteMany({
            where: { isMockData: true },
        });

        // Delete from WebAnalyticsDaily table
        const ga4Result = await this.prisma.webAnalyticsDaily.deleteMany({
            where: { isMockData: true },
        });

        this.logger.log(`Cleared ${metricsResult.count} mock metrics and ${ga4Result.count} mock GA4 records`);

        return {
            success: true,
            deletedMetrics: metricsResult.count,
            deletedGA4Records: ga4Result.count,
        };
    }
}
