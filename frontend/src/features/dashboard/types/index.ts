export interface KPI {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    trendLabel?: string;
    source?: 'ads' | 'ga4' | 'calculated';
}

export type { Campaign } from '@/types/api';

export interface TrendData {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
}
