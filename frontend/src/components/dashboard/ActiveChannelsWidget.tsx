import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { formatCompactNumber } from '@/lib/formatters';
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard-service';
import { useDateRange } from '@/contexts/DateRangeContext';

interface ChannelRowProps {
    name: string;
    isConnected: boolean;
    icon: React.ReactNode;
    metricLabel: string;
    metricValue: string;
    color: string;
}

function ChannelRow({ name, isConnected, icon, metricLabel, metricValue, color }: ChannelRowProps) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${color}`}>
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900">{name}</span>
                        {isConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500">{isConnected ? 'Live' : 'Inactive'}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{isConnected ? metricValue : '-'}</p>
                {isConnected && <p className="text-[10px] text-slate-400">{metricLabel}</p>}
            </div>
        </div>
    );
}

export function ActiveChannelsWidget() {
    const { status, isLoading: isStatusLoading } = useIntegrationStatus();
    const { dateRange } = useDateRange();

    const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
        queryKey: ['dashboard', 'performanceByPlatform', dateRange],
        queryFn: async () => {
            const response = await dashboardService.getPerformanceByPlatform(dateRange);
            return response.data;
        },
        enabled: !!status
    });

    const isLoading = isStatusLoading || isPerformanceLoading;

    // Helper to get metric safely with proper typing
    const getMetric = (platform: string, metric: 'spend' | 'impressions' | 'clicks') => {
        if (!performanceData || !Array.isArray(performanceData)) return 0;
        const platformData = performanceData.find((p) => p.platform === platform);
        return platformData ? platformData[metric] : 0;
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">Active Channels</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <SkeletonWrapper isLoading={isLoading}>
                    <div className="space-y-1">
                        <ChannelRow
                            name="Google Ads"
                            isConnected={status.googleAds}
                            icon="G"
                            color="bg-blue-500"
                            metricLabel="Spend"
                            metricValue={formatCompactNumber(getMetric('GOOGLE_ADS', 'spend'))}
                        />
                        <ChannelRow
                            name="GA4"
                            isConnected={status.googleAnalytics}
                            icon="A"
                            color="bg-orange-500"
                            metricLabel="Visits"
                            metricValue={formatCompactNumber(getMetric('GOOGLE_ANALYTICS', 'clicks'))} // Using clicks/sessions as visits proxy
                        />
                    </div>
                </SkeletonWrapper>
            </CardContent>
        </Card>
    );
}
