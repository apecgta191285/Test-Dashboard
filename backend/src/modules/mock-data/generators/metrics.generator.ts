/**
 * Metrics Generator
 * สร้าง mock metrics สำหรับ campaigns และ analytics
 */

import { SYNC_DEFAULTS } from '../../../common/constants/app.constants';
import { getDateDaysAgo } from '../../../common/utils/date.utils';

/**
 * สร้าง mock metrics สำหรับ Ads campaigns
 */
export function generateDailyAdMetrics() {
    const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
    const ctr = 0.02 + Math.random() * 0.03; // 2-5% CTR
    const clicks = Math.floor(baseImpressions * ctr);
    const spend = Math.floor(Math.random() * 500) + 100;
    const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.03));
    const revenue = conversions * (50 + Math.random() * 100);
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = baseImpressions > 0 ? (spend / baseImpressions) * 1000 : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    return {
        impressions: baseImpressions,
        clicks,
        spend,
        conversions,
        revenue,
        ctr: ctr * 100,
        cpc,
        cpm,
        roas,
    };
}

/**
 * สร้าง mock metrics สำหรับ GA4
 */
export function generateDailyGA4Metrics() {
    const activeUsers = Math.floor(Math.random() * 1000) + 100;
    const newUsers = Math.floor(activeUsers * (0.3 + Math.random() * 0.2));
    const sessions = Math.floor(activeUsers * (1.2 + Math.random() * 0.5));
    const screenPageViews = Math.floor(sessions * (2 + Math.random() * 3));
    const engagementRate = 0.4 + Math.random() * 0.3;
    const bounceRate = 1 - engagementRate;
    const avgSessionDuration = 60 + Math.random() * 180;

    return {
        activeUsers,
        newUsers,
        sessions,
        screenPageViews,
        engagementRate,
        bounceRate,
        avgSessionDuration,
    };
}

/**
 * สร้าง array ของ daily metrics สำหรับ date range
 */
export function generateMetricsForDateRange(
    days: number = SYNC_DEFAULTS.DAYS_TO_SYNC,
    type: 'ads' | 'ga4' = 'ads',
) {
    const metrics = [];
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const startDate = getDateDaysAgo(days);

    const currentDate = new Date(startDate);
    while (currentDate <= todayUTC) {
        const dateKey = new Date(Date.UTC(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
        ));

        const dailyMetrics = type === 'ads' ? generateDailyAdMetrics() : generateDailyGA4Metrics();

        metrics.push({
            date: dateKey,
            ...dailyMetrics,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return metrics;
}
