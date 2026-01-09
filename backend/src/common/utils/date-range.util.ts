export class DateRangeUtil {
    /**
     * Parse period string to number of days
     */
    static parsePeriodDays(period: string): number {
        const match = period.match(/^(\d+)d$/);
        if (match) {
            return parseInt(match[1], 10);
        }
        // Fallback defaults
        if (period === '7d') return 7;
        if (period === '14d') return 14;
        if (period === '30d') return 30;
        if (period === '90d') return 90;
        return 7;
    }

    /**
     * Get start and end dates for a given number of days
     * Uses UTC dates for consistent Prisma/PostgreSQL matching
     */
    static getDateRange(days: number): { startDate: Date; endDate: Date } {
        const now = new Date();
        const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

        const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
        startDate.setUTCDate(startDate.getUTCDate() - days);

        return { startDate, endDate };
    }

    /**
     * Get previous period date range for comparison
     */
    static getPreviousPeriodDateRange(currentStartDate: Date, days: number): { startDate: Date; endDate: Date } {
        const endDate = new Date(currentStartDate);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(currentStartDate);
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        return { startDate, endDate };
    }
}
