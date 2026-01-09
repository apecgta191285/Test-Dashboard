import { DollarSign, Eye, MousePointer, Zap } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { MetricGrid, MetricItem } from './MetricGrid';

const getSourceBadge = (source?: string) => {
    if (source === 'ga4') return <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-sm">GA4</span>;
    if (source === 'ads') return <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm">Ads</span>;
    if (source === 'calculated') return <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-sm">Calc</span>;
    return null;
};

interface DashboardKPIsProps {
    overview: any;
    isLoading?: boolean;
}

export const DashboardKPIs = ({ overview, isLoading }: DashboardKPIsProps) => {
    const current = overview?.current || {};
    const trends = overview?.trends || {};

    const metrics: MetricItem[] = [
        {
            title: 'Total Spend',
            value: formatCurrency(current.spend || 0),
            icon: <DollarSign className="w-5 h-5" />,
            iconClassName: 'bg-indigo-50 text-indigo-600',
            trend: {
                value: trends.spend || 0,
                isPositive: (trends.spend || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('ads')
        },
        {
            title: 'Impressions',
            value: formatNumber(current.impressions || 0),
            icon: <Eye className="w-5 h-5" />,
            iconClassName: 'bg-indigo-50 text-indigo-600',
            trend: {
                value: trends.impressions || 0,
                isPositive: (trends.impressions || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('ads')
        },
        {
            title: 'Total Clicks',
            value: formatNumber(current.clicks || 0),
            icon: <MousePointer className="w-5 h-5" />,
            iconClassName: 'bg-indigo-50 text-indigo-600',
            trend: {
                value: trends.clicks || 0,
                isPositive: (trends.clicks || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('ads')
        },
        {
            title: 'Total Sessions',
            value: formatNumber(current.sessions || 0),
            icon: <Zap className="w-5 h-5" />,
            iconClassName: 'bg-orange-50 text-orange-600',
            trend: {
                value: trends.sessions || 0,
                isPositive: (trends.sessions || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('ga4')
        },
        {
            title: 'Conversions',
            value: formatNumber(current.conversions || 0),
            icon: <Zap className="w-5 h-5" />,
            iconClassName: 'bg-orange-50 text-orange-600',
            trend: {
                value: trends.conversions || 0,
                isPositive: (trends.conversions || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('ga4')
        },
        {
            title: 'ROAS',
            value: `${(current.roas || 0).toFixed(2)}x`,
            icon: <Zap className="w-5 h-5" />,
            iconClassName: 'bg-purple-50 text-purple-600',
            trend: {
                value: trends.roas || 0,
                isPositive: (trends.roas || 0) > 0,
                label: ''
            },
            badge: getSourceBadge('calculated')
        },
    ];

    return <MetricGrid metrics={metrics} isLoading={isLoading} columns={3} />;
};
